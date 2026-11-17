"use client"

import { useState } from "react"

type InputFormProps = {
  onSend: (text: string) => void
  onAdvance: () => void
  canAdvance: boolean
  disabled: boolean
}

export default function InputForm({ onSend, onAdvance, canAdvance, disabled }: InputFormProps) {
  const [text, setText] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
          placeholder="考えを日本語で入力してください…（Shift+Enterで改行）"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
          <button
            type="button"
            onClick={onAdvance}
            disabled={disabled || !canAdvance}
            title="これまでの対話内容で確定し、次のフェーズに進みます"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            次へ進む
          </button>
        </div>
      </div>
    </form>
  )
}
