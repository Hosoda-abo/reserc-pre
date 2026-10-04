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
}

export type ChatResponse = {
  message: string
  phaseComplete: PhaseComplete
  confirmedContent: string | null
}
