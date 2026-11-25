import type { ConfirmedContent, Phase } from "./types"
import { buildBasePrompt } from "./prompts/base"
import { inputPhasePrompt } from "./prompts/input"
import { outputPhasePrompt } from "./prompts/output"
import { stepsPhasePrompt } from "./prompts/steps"
import { pseudocodePhasePrompt } from "./prompts/pseudocode"
import { FORCE_COMPLETE_OVERRIDE } from "./prompts/override"

// フェーズ1開始時の固定メッセージ（APIコール不要）
export const PHASE_1_PROMPT = `それでは始めましょう。まず最初に、一点だけ教えてください。

この問題への「入力」は何ですか？プログラムが受け取るデータを、自分の言葉で日本語で説明してください。コードは書かなくて構いません。`

// AI応答を必要とするフェーズ。
// "complete" は UI で入力手段を持たず /api/chat を叩かないため、エージェントを持たない
export type AgentPhase = Exclude<Phase, "idle" | "complete">

type PhasePromptFn = (confirmed: Omit<ConfirmedContent, "pseudocode">) => string

const phasePromptMap: Record<AgentPhase, PhasePromptFn> = {
  input: inputPhasePrompt,
  output: outputPhasePrompt,
  steps: stepsPhasePrompt,
  pseudocode: pseudocodePhasePrompt,
}

// フェーズごとに使用するモデル
// 入力・出力: 新世代ベース性能で読解確認を担当
// 処理手順・疑似コード: 指示遵守が特に重要
const PHASE_MODEL_MAP: Record<AgentPhase, string> = {
  input: "gpt-6-luna",
  output: "gpt-6-luna",
  steps: "gpt-5.4-mini",
  pseudocode: "gpt-5.4-mini",
}

// フェーズごとのシステムプロンプトを生成
// base（共通） + phase固有 + forceCompleteオーバーライド（該当時）
export function buildSystemPrompt(
  phase: AgentPhase,
  problem: string,
  confirmed: Omit<ConfirmedContent, "pseudocode">,
  forceComplete: boolean = false
): string {
  const base = buildBasePrompt(problem, confirmed)
  const phasePart = phasePromptMap[phase](confirmed)
  const override = forceComplete ? `\n\n${FORCE_COMPLETE_OVERRIDE}` : ""
  return `${base}\n\n${phasePart}${override}`
}

// フェーズに応じたモデル名を返す
export function selectModel(phase: AgentPhase): string {
  return PHASE_MODEL_MAP[phase]
}
