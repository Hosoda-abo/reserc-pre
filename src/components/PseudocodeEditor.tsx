"use client"

import { useState, useRef, useEffect } from "react"
import Editor from "react-simple-code-editor"

const FONT_SIZE = 14
const LINE_HEIGHT = 21 // 14px * 1.5
const PADDING_V = 12

type PseudocodeEditorProps = {
  onSubmit: (text: string) => void
  disabled: boolean
}

export default function PseudocodeEditor({ onSubmit, disabled }: PseudocodeEditorProps) {
  const [code, setCode] = useState("")
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const editorWrapperRef = useRef<HTMLDivElement>(null)

  const lineCount = code.split("\n").length

  // 行番号とエディタのスクロールを同期
  useEffect(() => {
    const wrapper = editorWrapperRef.current
    if (!wrapper) return
    const syncScroll = () => {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = wrapper.scrollTop
      }
    }
    wrapper.addEventListener("scroll", syncScroll)
    return () => wrapper.removeEventListener("scroll", syncScroll)
  }, [])

  const handleSubmit = () => {
    if (!code.trim() || disabled) return
    onSubmit(code.trim())
  }

  return (
    <div className="p-4 border-t bg-white">
      <label className="block text-xs font-medium text-gray-500 mb-2">
        疑似コードを入力してください（Tab でインデント・Shift+Tab で戻す）
      </label>

      <div
        className="flex border border-gray-300 rounded-lg overflow-hidden"
        style={{ height: "240px" }}
      >
        {/* 行番号 */}
        <div
          ref={lineNumbersRef}
          className="overflow-hidden select-none bg-gray-50 border-r border-gray-200 flex-shrink-0"
          style={{
            width: "3rem",
            paddingTop: `${PADDING_V}px`,
            paddingBottom: `${PADDING_V}px`,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: `${FONT_SIZE}px`,
            lineHeight: `${LINE_HEIGHT}px`,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="text-right pr-3 text-gray-400"
              style={{ height: `${LINE_HEIGHT}px` }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* エディタ本体 */}
        <div ref={editorWrapperRef} className="flex-1 overflow-auto bg-white">
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={c => c}
            padding={PADDING_V}
            disabled={disabled}
            tabSize={2}
            insertSpaces={true}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: `${FONT_SIZE}px`,
              lineHeight: `${LINE_HEIGHT}px`,
              minHeight: "100%",
              color: "#1f2937",
              background: "white",
            }}
            textareaClassName="outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={disabled || !code.trim()}
          className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          疑似コードを確認する
        </button>
      </div>
    </div>
  )
}
