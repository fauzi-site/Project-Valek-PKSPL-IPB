import React, { useState } from 'react'
import DashboardHeader from './DashboardHeader'
import Sidebar from './Sidebar'
import AIContent from './AIContent'
import ChatInput from './ChatInput'

export default function DashboardPage({ onNavigateHome }) {
  const [activePrompt, setActivePrompt] = useState(0)

  const handleSelectPrompt = (index) => {
    setActivePrompt(index)
  }

  const handleClearAll = () => {
    setActivePrompt(-1)
  }

  const handleSendMessage = (message) => {
    console.log('Message sent:', message)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Top Header / Navbar */}
      <DashboardHeader onBackToHome={onNavigateHome} />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activePrompt={activePrompt}
          onSelectPrompt={handleSelectPrompt}
          onClearAll={handleClearAll}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f9]">
          {/* Scrollable AI Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <AIContent />
          </div>

          {/* Floating Chat Input */}
          <ChatInput onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
