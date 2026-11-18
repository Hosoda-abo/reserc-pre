import { appendFile, mkdir } from "fs/promises"
import { join } from "path"
import type { LogEvent } from "./types"

const LOG_DIR = join(process.cwd(), "logs")

function todayStamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// 研究用イベントを logs/YYYY-MM-DD.jsonl に追記する
// ログ書き込みの失敗は console.error に出すのみでアプリ側には伝搬させない
export async function appendLog(event: LogEvent): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true })
    const filePath = join(LOG_DIR, `${todayStamp()}.jsonl`)
    await appendFile(filePath, JSON.stringify(event) + "\n", "utf8")
  } catch (err) {
    console.error("ログ書き込み失敗:", err)
  }
}
