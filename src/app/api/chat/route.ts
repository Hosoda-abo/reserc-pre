import { GoogleGenAI } from "@google/genai"
import type { ChatRequest, ChatResponse, ChatHistory } from "@/lib/types"
import { SYSTEM_PROMPT } from "@/lib/prompt"

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  export async function POST(request: Request) {
    try {
      const { message, history }: ChatRequest = await request.json()

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          ...history,
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT
        }
      })

      return Response.json({ reply: response.text ?? "" } satisfies ChatResponse)
    } catch (err) {
      console.error("Gemini APIエラー:", err)
      return Response.json({ error: String(err) }, { status: 500 })
    }
  }