"use client"

import { useState } from "react"
import ChatWindow from "@/components/ChatWindow"
import InputForm from "@/components/InputForm"
import { PHASE_1_PROMPT } from "@/lib/prompt"
import type { Message, ChatHistory } from "@/lib/types"

export default function Home() {
  const [problemText, setProblemText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<ChatHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const handleStart = () => {
    if (!problemText.trim()) return
    setHasStarted(true)
    setMessages([{ role: "model", content: PHASE_1_PROMPT }])
  }

  const handleSend = async (text: string) => {
    const userMessage: Message = { role: "user", content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    const newHistory: ChatHistory[] = [
      ...history,
      { role: "user", parts: [{ text }] },
    ]

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.ok) throw new Error("APIエラーが発生しました")

      const data = await res.json()
      const aiMessage: Message = { role: "model", content: data.reply }

      setMessages([...newMessages, aiMessage])
      setHistory([
        ...newHistory,
        { role: "model", parts: [{ text: data.reply }] },
      ])
    } catch (err) {
      const errorMessage: Message = {
        role: "model",
        content: "エラーが発生しました。もう一度試してください。",
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 問題文入力エリア */}
      <div className="p-4 border-b bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          問題文
        </label>
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          disabled={hasStarted}
          rows={3}
          placeholder="問題文をここに入力してください…"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
        />
        {!hasStarted && (
          <button
            onClick={handleStart}
            disabled={!problemText.trim()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            開始する
          </button>
        )}
      </div>

      {/* チャット表示エリア */}
      <ChatWindow messages={messages} />

      {/* 学習者の入力エリア */}
      {hasStarted && (
        <InputForm onSend={handleSend} disabled={isLoading} />
      )}
    </div>
  )
}
