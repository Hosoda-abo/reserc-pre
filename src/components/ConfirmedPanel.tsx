type ConfirmedContent = {
  input: string | null
  output: string | null
  steps: string[]
  pseudocode: string | null
}

type ConfirmedPanelProps = {
  confirmed: ConfirmedContent
  phase: "idle" | "input" | "output" | "steps" | "pseudocode" | "complete"
}

function SectionDivider() {
  return <div className="border-t border-gray-200 my-3" />
}

export default function ConfirmedPanel({ confirmed, phase }: ConfirmedPanelProps) {
  const isInputActive = phase === "input"
  const isOutputActive = phase === "output"
  const isStepsActive = phase === "steps" || phase === "pseudocode" || phase === "complete"
  const showPseudocode = phase === "pseudocode" || phase === "complete"

  const inputStatus = confirmed.input
    ? "confirmed"
    : isInputActive
      ? "active"
      : phase === "idle"
        ? "inactive"
        : "pending"

  const outputStatus = confirmed.output
    ? "confirmed"
    : isOutputActive
      ? "active"
      : phase === "idle" || phase === "input"
        ? "inactive"
        : "pending"

  const stepsStatus = confirmed.steps.length > 0
    ? "confirmed"
    : isStepsActive
      ? "active"
      : "inactive"

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">確定した内容</h2>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📥</span>
          <span className={`text-sm font-medium ${inputStatus === "inactive" ? "text-gray-300" : "text-gray-700"}`}>
            入力
          </span>
        </div>
        <div className="pl-6 text-sm">
          {confirmed.input ? (
            <p className="text-gray-800 whitespace-pre-wrap">{confirmed.input}</p>
          ) : (
            <p className={inputStatus === "active" ? "text-blue-400 italic" : "text-gray-300 italic"}>
              {inputStatus === "active" ? "確認中..." : "未確認"}
            </p>
          )}
        </div>
      </div>

      <SectionDivider />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📤</span>
          <span className={`text-sm font-medium ${outputStatus === "inactive" ? "text-gray-300" : "text-gray-700"}`}>
            出力
          </span>
        </div>
        <div className="pl-6 text-sm">
          {confirmed.output ? (
            <p className="text-gray-800 whitespace-pre-wrap">{confirmed.output}</p>
          ) : (
            <p className={outputStatus === "active" ? "text-blue-400 italic" : "text-gray-300 italic"}>
              {outputStatus === "active" ? "確認中..." : "未確認"}
            </p>
          )}
        </div>
      </div>

      <SectionDivider />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">⚙️</span>
          <span className={`text-sm font-medium ${stepsStatus === "inactive" ? "text-gray-300" : "text-gray-700"}`}>
            処理手順
          </span>
        </div>
        <div className="pl-6 text-sm">
          {confirmed.steps.length > 0 ? (
            <ol className="list-decimal pl-4 space-y-1 text-gray-800">
              {confirmed.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className={stepsStatus === "active" ? "text-blue-400 italic" : "text-gray-300 italic"}>
              {stepsStatus === "active" ? "確認中..." : "未確認"}
            </p>
          )}
        </div>
      </div>

      {showPseudocode && (
        <>
          <SectionDivider />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📝</span>
              <span className="text-sm font-medium text-gray-700">疑似コード</span>
            </div>
            <div className="pl-6 text-sm">
              {confirmed.pseudocode ? (
                <div>
                  <pre className="text-gray-800 whitespace-pre-wrap font-mono text-xs bg-gray-50 rounded p-2 leading-relaxed">
                    {confirmed.pseudocode}
                  </pre>
                  <p className="mt-2 text-green-600 font-medium text-xs">✅ AIが確認済み</p>
                </div>
              ) : (
                <p className="text-blue-400 italic">あなたが入力中...</p>
              )}
            </div>
          </div>
        </>
      )}

      {phase === "complete" && (
        <>
          <SectionDivider />
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 text-sm font-medium">
              この疑似コードをもとにコーディングを始めましょう！
            </p>
          </div>
        </>
      )}
    </div>
  )
}
