"use client"

import { useState, useEffect } from "react"
import ChatWindow from "@/components/ChatWindow"
import InputForm from "@/components/InputForm"
import PseudocodeEditor from "@/components/PseudocodeEditor"
import PhaseIndicator from "@/components/PhaseIndicator"
import ConfirmedPanel from "@/components/ConfirmedPanel"
import { PHASE_1_PROMPT } from "@/lib/prompt"
import type { Message, ChatHistory, ChatResponse, Phase, ConfirmedContent } from "@/lib/types"

export default function Home() {
  const [learnerId, setLearnerId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [problemText, setProblemText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<ChatHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [confirmed, setConfirmed] = useState<ConfirmedContent>({
    input: null,
    output: null,
    steps: [],
    pseudocode: null,
  })
  // 現フェーズで学習者が送信した回数。フェーズが変わるたびリセットされ、1回以上で「次へ進む」が有効化
  const [userTurnsInCurrentPhase, setUserTurnsInCurrentPhase] = useState(0)

  useEffect(() => {
    setUserTurnsInCurrentPhase(0)
  }, [phase])

  const handleStart = () => {
    if (!problemText.trim() || !learnerId.trim()) return
    const newSessionId = crypto.randomUUID()
    setSessionId(newSessionId)
    setPhase("input")
    setMessages([{ role: "model", content: PHASE_1_PROMPT }])
    setHistory([{ role: "model", parts: [{ text: PHASE_1_PROMPT }] }])

    // セッション開始ログを送信（失敗してもUIには影響させない）
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionId: newSessionId,
        learnerId: learnerId.trim(),
        event: "session_start",
        problem: problemText,
      }),
    }).catch((err) => console.error("session_startログ送信失敗:", err))
  }

  // 「次へ進む」ボタンから呼ばれる。これまでの対話を確定して次フェーズへ進めるようAIに指示する
  const handleAdvance = (userText?: string) => {
    handleSend(userText ?? "これまでの内容で確定したいので次に進めてください", true)
  }

  // ユーザーが「次へ進む」を押せるのは、現フェーズで少なくとも1回自分の意見を送った後
  const canAdvance = userTurnsInCurrentPhase > 0

  const handleSend = async (text: string, forceComplete: boolean = false) => {
    if (phase === "idle") return

    const userMessage: Message = { role: "user", content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    // 強制確定ボタン経由は学習者の回答とみなさない
    if (!forceComplete) {
      setUserTurnsInCurrentPhase(prev => prev + 1)
    }

    const newHistory: ChatHistory[] = [
      ...history,
      { role: "user", parts: [{ text }] },
    ]

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          phase,
          problem: problemText,
          confirmed: {
            input: confirmed.input,
            output: confirmed.output,
            steps: confirmed.steps,
          },
          forceComplete,
          learnerId: learnerId.trim(),
          sessionId,
        }),
      })

      if (!res.ok) throw new Error("APIエラーが発生しました")

      const data: ChatResponse = await res.json()
      const aiMessage: Message = { role: "model", content: data.message }

      const updatedHistory: ChatHistory[] = [
        ...newHistory,
        { role: "model", parts: [{ text: data.message }] },
      ]
      setMessages([...newMessages, aiMessage])
      setHistory(updatedHistory)

      // フェーズ遷移処理
      if (data.phaseComplete) {
        switch (data.phaseComplete) {
          case "input":
            setPhase("output")
            if (data.confirmedContent) {
              setConfirmed(prev => ({ ...prev, input: data.confirmedContent }))
            }
            break
          case "output":
            setPhase("steps")
            if (data.confirmedContent) {
              setConfirmed(prev => ({ ...prev, output: data.confirmedContent }))
            }
            break
          case "step":
            if (data.confirmedContent) {
              setConfirmed(prev => ({ ...prev, steps: [...prev.steps, data.confirmedContent!] }))
            }
            break
          case "pseudocode":
            if (phase === "steps") {
              // 直近ターンで学習者が追加したがまだ確定していないステップ群を取り込む
              if (data.confirmedSteps && data.confirmedSteps.length > 0) {
                setConfirmed(prev => ({
                  ...prev,
                  steps: [...prev.steps, ...data.confirmedSteps!],
                }))
              }
              setPhase("pseudocode")
            } else if (phase === "pseudocode") {
              setPhase("complete")
              if (data.confirmedContent) {
                setConfirmed(prev => ({ ...prev, pseudocode: data.confirmedContent }))
              }
            }
            break
          case "complete":
            setPhase("complete")
            break
        }
      }
    } catch {
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
      {/* ヘッダー */}
      <div className="px-4 py-3 bg-white border-b">
        <h1 className="text-base font-semibold text-gray-800">
          🎓 プログラミング学習支援システム
        </h1>
      </div>

      {/* 問題文・学習者ID入力エリア */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex gap-2 items-start">
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              学習者ID
            </label>
            <input
              type="text"
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              disabled={phase !== "idle"}
              placeholder="例: student01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-600"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              問題文
            </label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              disabled={phase !== "idle"}
              rows={2}
              placeholder="問題文をここに入力してください…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-600"
            />
          </div>
          {phase === "idle" && (
            <button
              onClick={handleStart}
              disabled={!problemText.trim() || !learnerId.trim()}
              className="mt-5 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              開始
            </button>
          )}
        </div>
      </div>

      {/* フェーズインジケーター */}
      <PhaseIndicator phase={phase} />

      {/* メインエリア（2カラム） */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左：チャット＋入力エリア */}
        <div className="flex flex-col flex-1 overflow-hidden border-r">
          <ChatWindow messages={messages} />
          {phase !== "idle" && phase !== "pseudocode" && phase !== "complete" && (
            <InputForm
              onSend={handleSend}
              onAdvance={() => handleAdvance()}
              canAdvance={canAdvance}
              disabled={isLoading}
            />
          )}
          {phase === "pseudocode" && (
            <PseudocodeEditor
              onSubmit={handleSend}
              onAdvance={(code) => handleAdvance(code)}
              disabled={isLoading}
            />
          )}
        </div>

        {/* 右：確定した内容パネル */}
        <div className="w-72 bg-gray-50 border-l overflow-hidden">
          <ConfirmedPanel confirmed={confirmed} phase={phase} />
        </div>
      </div>
    </div>
  )
}
