import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { ChatRequest, ChatResponse, PhaseComplete } from "@/lib/types"
import { buildSystemPrompt } from "@/lib/prompt"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

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
    const { message, history, phase, problem, confirmed, forceComplete }: ChatRequest = await request.json()

    const systemPrompt = buildSystemPrompt(phase, problem, confirmed, forceComplete ?? false)

    // Gemini形式のhistory（role: "model" | "user", parts: [{text}]）をOpenAI形式に変換
    const historyMessages: ChatCompletionMessageParam[] = history.map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: h.parts.map((p) => p.text).join(""),
    }))

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      return Response.json({
        message: rawText || "応答を取得できませんでした。",
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

    // gpt-4o-miniは confirmedContent を埋めつつ phaseComplete を忘れる矛盾応答を返すことがある
    // confirmedContent が入っている＝AIは確定判定したと見なし、現フェーズに対応する完了値へフォールバックする
    if (phaseComplete === false && confirmedContent !== null) {
      const phaseToComplete: Record<typeof phase, PhaseComplete> = {
        input: "input",
        output: "output",
        steps: "step",
        pseudocode: "pseudocode",
        complete: "complete",
      }
      phaseComplete = phaseToComplete[phase]
      console.warn(`[phaseComplete推論] AIが confirmedContent を埋めたが phaseComplete=false。${phase} → ${phaseComplete} に補正`)
    }

    return Response.json({
      message: typeof parsed.message === "string" ? parsed.message : rawText,
      phaseComplete,
      confirmedContent,
    } satisfies ChatResponse)
  } catch (err) {
    console.error("OpenAI APIエラー:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
