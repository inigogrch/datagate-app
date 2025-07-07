"use client"

import { Sparkles } from "lucide-react"
import { Chat } from "@/components/Chat"
import Sidebar from "@/components/Sidebar"
import TopNav from "@/components/TopNav"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          <TopNav />

          <main className="flex flex-col pt-20 h-screen">
            {/* Chat Header */}
            <div className="border-b border-gray-800 p-6 bg-gradient-to-r from-gray-900 to-gray-800">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">DataGate AI Assistant</h1>
                    <p className="text-gray-400">Your personal tech update companion powered by GPT-4</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Component */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Chat />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
