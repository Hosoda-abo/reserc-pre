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

export type Phase = "idle" | "input" | "output" | "steps" | "pseudocode" | "complete"

export type PhaseComplete = false | "input" | "output" | "step" | "pseudocode" | "complete"

export type ConfirmedContent = {
  input: string | null
  output: string | null
  steps: string[]
  pseudocode: string | null
}

export type ChatRequest = {
  message: string
  history: ChatHistory[]
  phase: Exclude<Phase, "idle">
  problem: string
  confirmed: Omit<ConfirmedContent, "pseudocode">
  // 学習者が「この内容で確定」ボタンを押したとき true。AIに即座に要約＋フェーズ進行を強制する
  forceComplete?: boolean
  // 研究ログ用の識別子
  learnerId: string
  sessionId: string
}

export type ChatResponse = {
  message: string
  phaseComplete: PhaseComplete
  confirmedContent: string | null
}

// 研究ログ用イベント型
type LogEventBase = {
  timestamp: string
  sessionId: string
  learnerId: string
}

export type SessionStartEvent = LogEventBase & {
  event: "session_start"
  problem: string
}

export type UserMessageEvent = LogEventBase & {
  event: "user_message"
  phase: Exclude<Phase, "idle">
  content: string
  forceComplete: boolean
}

export type AssistantMessageEvent = LogEventBase & {
  event: "assistant_message"
  phase: Exclude<Phase, "idle">
  content: string
  phaseComplete: PhaseComplete
  confirmedContent: string | null
}

export type LogEvent = SessionStartEvent | UserMessageEvent | AssistantMessageEvent
