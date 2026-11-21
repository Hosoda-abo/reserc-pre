import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { ChatRequest, ChatResponse, PhaseComplete } from "@/lib/types"
import { buildSystemPrompt, selectModel } from "@/lib/prompt"
import { appendLog } from "@/lib/logger"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function extractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch {}
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) try { return JSON.parse(blockMatch[1]) } catch {}
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) try { return JSON.parse(objectMatch[0]) } catch {}
  return null
}

// 2つの日本語文の類似度を文字bigramベースで求める。
// Jaccard係数（言い換え検出）と Overlap係数（短い方が長い方に含まれる関係＝
// 既存ステップが細かく分解されて再掲されるケース）の最大値を返す。
function stepSimilarity(a: string, b: string): number {
  const na = a.replace(/\s/g, "")
  const nb = b.replace(/\s/g, "")
  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const ba = bigrams(na)
  const bb = bigrams(nb)
  let intersect = 0
  for (const g of ba) if (bb.has(g)) intersect++
  const unionSize = ba.size + bb.size - intersect
  const jaccard = unionSize === 0 ? 0 : intersect / unionSize
  const minSize = Math.min(ba.size, bb.size)
  const overlap = minSize === 0 ? 0 : intersect / minSize
  return Math.max(jaccard, overlap)
}

const STEP_DUPLICATE_THRESHOLD = 0.7

export async function POST(request: Request) {
  try {
    const { message, history, phase, problem, confirmed, forceComplete, learnerId, sessionId }: ChatRequest = await request.json()

    const systemPrompt = buildSystemPrompt(phase, problem, confirmed, forceComplete ?? false)
    const model = selectModel(phase)

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
      model,
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
    // 処理手順→疑似コード遷移時、直近のターンで追加された未確定ステップ群
    // AIが確定済みステップを言い換えて再送する場合に備え、類似度で重複を除外する
    const rawConfirmedSteps = Array.isArray(parsed.confirmedSteps)
      ? parsed.confirmedSteps.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : undefined
    const confirmedSteps = rawConfirmedSteps
      ? rawConfirmedSteps.reduce<string[]>((acc, step) => {
          // 既に確定済みのステップとの重複を除外
          if (confirmed.steps.some(existing =>
            stepSimilarity(step, existing) >= STEP_DUPLICATE_THRESHOLD
          )) return acc
          // 本ターン内で既に採用した新規ステップとの重複も除外
          if (acc.some(adopted =>
            stepSimilarity(step, adopted) >= STEP_DUPLICATE_THRESHOLD
          )) return acc
          acc.push(step)
          return acc
        }, [])
      : undefined
    if (rawConfirmedSteps && confirmedSteps && rawConfirmedSteps.length !== confirmedSteps.length) {
      const dropped = rawConfirmedSteps.length - confirmedSteps.length
      console.warn(`[confirmedSteps重複除外] ${dropped}件のステップを既存と類似のため除外`)
    }
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
      confirmedSteps,
    })

    return Response.json({
      message: aiMessage,
      phaseComplete,
      confirmedContent,
      confirmedSteps,
    } satisfies ChatResponse)
  } catch (err) {
    console.error("OpenAI APIエラー:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
