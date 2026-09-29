import React, { useState } from 'react'
import { Send } from 'lucide-react'

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSend?.(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full flex justify-center px-8 pb-5 pt-2 flex-shrink-0">
      <div className="max-w-2xl w-full flex items-center gap-3 bg-white p-2 pl-6 rounded-full shadow-md border border-slate-200 hover:shadow-lg transition-shadow duration-300">
        <input
          type="text"
          placeholder="What's in your mind?....."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
        />
        <button
          onClick={handleSend}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
        >
          <Send size={18} className="translate-x-[1px]" />
        </button>
      </div>
    </div>
  )
}
