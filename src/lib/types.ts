export type Role = "user" | "model"

export type Message = {
  role: Role
  content: string
}

export type HistoryPart = {
  text: string
}

export type ChatHistory = {
  role: Role
  parts: HistoryPart[]
}

export type Phase = 0 | 1 | 2 | 3 | 4 | 5

export type ChatRequest = {
  message: string
  history: ChatHistory[]
}

export type ChatResponse = {
  reply: string
}
