import { appendLog } from "@/lib/logger"
import type { LogEvent } from "@/lib/types"

// クライアントから発生するイベント（session_start など）を受け取り JSONL に追記する
export async function POST(request: Request) {
  try {
    const event: LogEvent = await request.json()
    await appendLog(event)
    return Response.json({ ok: true })
  } catch (err) {
    console.error("ログAPIエラー:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
