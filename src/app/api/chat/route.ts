import { GoogleGenAI } from "@google/genai"
import type { ChatRequest, ChatResponse, ChatHistory } from "@/lib/types"

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  export async function POST(request: Request) {
    const { message, history }: ChatRequest = await request.json()

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: "ここにシステムプロンプトを入れる"
      }
    })

    return Response.json({ reply: response.text ?? "" } satisfies ChatResponse)
  }