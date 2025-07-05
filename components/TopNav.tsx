"use client"

import { Search, Bell, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        {/* Left side */}
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-red-500">DataGate</h1>

          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" className="text-white hover:text-gray-300">
              Home
            </Button>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search updates..."
              className="w-64 bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>

          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <User className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden text-gray-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
