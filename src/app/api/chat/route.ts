import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { ChatRequest, ChatResponse, PhaseComplete } from "@/lib/types"
import { buildSystemPrompt } from "@/lib/prompt"
import { appendLog } from "@/lib/logger"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// gpt-6世代の最廉価モデル。新世代ベース性能＋低コスト。順守率が不十分なら gpt-5-mini へ切り替え
const MODEL = "gpt-6-luna"

function extractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch {}
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) try { return JSON.parse(blockMatch[1]) } catch {}
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) try { return JSON.parse(objectMatch[0]) } catch {}
  return null
}

export async function POST(request: Request) {
  try {
    const { message, history, phase, problem, confirmed, forceComplete, learnerId, sessionId }: ChatRequest = await request.json()

    const systemPrompt = buildSystemPrompt(phase, problem, confirmed, forceComplete ?? false)

    // 学習者の発話を研究ログに記録
    await appendLog({
      timestamp: new Date().toISOString(),
      sessionId,
      learnerId,
      event: "user_message",
      phase,
      content: message,
      forceComplete: forceComplete ?? false,
    })

    // Gemini形式のhistory（role: "model" | "user", parts: [{text}]）をOpenAI形式に変換
    const historyMessages: ChatCompletionMessageParam[] = history.map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: h.parts.map((p) => p.text).join(""),
    }))

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    })

    const rawText = completion.choices[0]?.message?.content ?? ""
    const parsed = extractJSON(rawText)

    if (!parsed) {
      const fallbackMessage = rawText || "応答を取得できませんでした。"
      await appendLog({
        timestamp: new Date().toISOString(),
        sessionId,
        learnerId,
        event: "assistant_message",
        phase,
        content: fallbackMessage,
        phaseComplete: false,
        confirmedContent: null,
      })
      return Response.json({
        message: fallbackMessage,
        phaseComplete: false,
        confirmedContent: null,
      } satisfies ChatResponse)
    }

    const VALID_PHASE_COMPLETE = new Set(["input", "output", "step", "pseudocode", "complete"])
    let phaseComplete: PhaseComplete =
      parsed.phaseComplete && VALID_PHASE_COMPLETE.has(String(parsed.phaseComplete))
        ? (parsed.phaseComplete as PhaseComplete)
        : false

    const confirmedContent = typeof parsed.confirmedContent === "string" ? parsed.confirmedContent : null
    let aiMessage = typeof parsed.message === "string" ? parsed.message : rawText

    // gpt-4o-miniは confirmedContent を埋めつつ phaseComplete を忘れる矛盾応答を返すことがある
    // ただしAIが単にパラフレーズしただけで確定判定していない可能性もあるため、
    // messageに確定表現が含まれる場合のみフェーズを進める保守的な補正にする
    const messageSignalsConfirm = /確定しました|確定です|十分です|OK です|次に進み|次へ進み/.test(aiMessage)
    if (phaseComplete === false && confirmedContent !== null && messageSignalsConfirm) {
      const phaseToComplete: Record<typeof phase, PhaseComplete> = {
        input: "input",
        output: "output",
        steps: "step",
        pseudocode: "pseudocode",
        complete: "complete",
      }
      phaseComplete = phaseToComplete[phase]
      console.warn(`[phaseComplete推論] AIが確定表現を使ったが phaseComplete=false。${phase} → ${phaseComplete} に補正`)
    } else if (phaseComplete === false && confirmedContent !== null) {
      console.warn(`[phaseComplete推論スキップ] confirmedContent有だが確定表現なし。パラフレーズの可能性ありフェーズ据え置き`)
    }

    // フェーズ確定時、AIのメッセージに次フェーズへの問いが含まれていなければサーバー側で付与する
    // （LLMは時々この指示を無視するため、ここで確実に補完する）
    const nextPhasePrompts: Partial<Record<Exclude<PhaseComplete, false>, { pattern: RegExp; question: string }>> = {
      input: {
        pattern: /出力/,
        question: "続いて、このプログラムが返す『出力』は何ですか？",
      },
      output: {
        pattern: /手順|ステップ/,
        question: "続いて、入力から出力を得るための最初の処理手順を教えてください。",
      },
    }
    if (phaseComplete !== false) {
      const next = nextPhasePrompts[phaseComplete]
      if (next && !next.pattern.test(aiMessage)) {
        aiMessage = aiMessage.trim() + "\n\n" + next.question
      }
    }

    // AI応答を研究ログに記録
    await appendLog({
      timestamp: new Date().toISOString(),
      sessionId,
      learnerId,
      event: "assistant_message",
      phase,
      content: aiMessage,
      phaseComplete,
      confirmedContent,
    })

    return Response.json({
      message: aiMessage,
      phaseComplete,
      confirmedContent,
    } satisfies ChatResponse)
  } catch (err) {
    console.error("OpenAI APIエラー:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
