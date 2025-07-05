"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Home, MessageSquare, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

const navItems = [
  { name: "Dashboard", icon: Home, href: "/", active: false },
  { name: "Chat", icon: MessageSquare, href: "/chat", active: false },
  { name: "Settings", icon: Settings, href: "/settings", disabled: true },
]

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-neutral-800 px-6">
        <h1 className="text-xl font-medium text-white">DataGate</h1>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className={item.disabled ? "pointer-events-none" : ""}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 px-3 py-2 text-left ${
                  item.active
                    ? "bg-neutral-800 text-white"
                    : item.disabled
                      ? "text-neutral-500 cursor-not-allowed"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
                disabled={item.disabled}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-60 bg-neutral-900 border-r border-neutral-800">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 bg-neutral-900 border-neutral-800">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
