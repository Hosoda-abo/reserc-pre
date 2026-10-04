type Phase = "idle" | "input" | "output" | "steps" | "pseudocode" | "complete"

type PhaseIndicatorProps = {
  phase: Phase
}

const PHASES: { key: Phase; label: string }[] = [
  { key: "input", label: "入力確認" },
  { key: "output", label: "出力確認" },
  { key: "steps", label: "処理手順" },
  { key: "pseudocode", label: "疑似コード" },
  { key: "complete", label: "完了" },
]

const PHASE_ORDER: Phase[] = ["idle", "input", "output", "steps", "pseudocode", "complete"]

function getPhaseStatus(itemKey: Phase, currentPhase: Phase): "done" | "active" | "pending" {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const itemIndex = PHASE_ORDER.indexOf(itemKey)
  if (itemIndex < currentIndex) return "done"
  if (itemIndex === currentIndex) return "active"
  return "pending"
}

export default function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-blue-50 border-b text-sm">
      <span className="text-gray-500 mr-2 text-xs">フェーズ：</span>
      {PHASES.map((item, index) => {
        const status = getPhaseStatus(item.key, phase)
        return (
          <span key={item.key} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-300 mx-1">›</span>}
            <span
              className={`flex items-center gap-1 ${
                status === "active"
                  ? "text-blue-600 font-semibold"
                  : status === "done"
                    ? "text-green-600"
                    : "text-gray-400"
              }`}
            >
              {status === "done" ? (
                <span>✓</span>
              ) : status === "active" ? (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
              )}
              {item.label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
