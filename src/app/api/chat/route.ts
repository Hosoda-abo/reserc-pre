import { GoogleGenAI } from "@google/genai"
import type { ChatRequest, ChatResponse, PhaseComplete } from "@/lib/types"
import { buildSystemPrompt } from "@/lib/prompt"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

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
    const { message, history, phase, problem, confirmed }: ChatRequest = await request.json()

    const systemPrompt = buildSystemPrompt(phase, problem, confirmed)

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    })

    const rawText = response.text ?? ""
    const parsed = extractJSON(rawText)

    if (!parsed) {
      return Response.json({
        message: rawText || "応答を取得できませんでした。",
        phaseComplete: false,
        confirmedContent: null,
      } satisfies ChatResponse)
    }

    const VALID_PHASE_COMPLETE = new Set(["input", "output", "step", "pseudocode", "complete"])
    const phaseComplete: PhaseComplete =
      parsed.phaseComplete && VALID_PHASE_COMPLETE.has(String(parsed.phaseComplete))
        ? (parsed.phaseComplete as PhaseComplete)
        : false

    return Response.json({
      message: typeof parsed.message === "string" ? parsed.message : rawText,
      phaseComplete,
      confirmedContent: typeof parsed.confirmedContent === "string" ? parsed.confirmedContent : null,
    } satisfies ChatResponse)
  } catch (err) {
    console.error("Gemini APIエラー:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
