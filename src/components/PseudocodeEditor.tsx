"use client"

import { useState } from "react"

type PseudocodeEditorProps = {
  onSubmit: (text: string) => void
  disabled: boolean
}

export default function PseudocodeEditor({ onSubmit, disabled }: PseudocodeEditorProps) {
  const [text, setText] = useState("")

  const handleSubmit = () => {
    if (!text.trim() || disabled) return
    onSubmit(text.trim())
  }

  return (
    <div className="p-4 border-t bg-white">
      <label className="block text-xs font-medium text-gray-500 mb-2">
        疑似コードを入力してください（複数行OK）
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={6}
        placeholder={"例：\nカウンタ = 0\n全要素が偶数かチェックする\n  もし全部偶数なら:\n    全要素を2で割る\n    カウンタ += 1"}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          疑似コードを確認する
        </button>
      </div>
    </div>
  )
}
