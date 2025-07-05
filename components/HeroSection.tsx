"use client"

import { Play, Info, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface HeroSectionProps {
  featuredStory: {
    title: string
    description: string
    category: string
    publishedAt: string
    image: string
    tags: string[]
  }
}

export default function HeroSection({ featuredStory }: HeroSectionProps) {
  return (
    <div className="relative h-[70vh] flex items-center">
      {/* Content */}
      <div className="relative z-10 max-w-2xl px-4 md:px-8 ml-0 md:ml-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="destructive" className="bg-red-600">
            {featuredStory.category}
          </Badge>
          <div className="flex items-center gap-1 text-gray-300 text-sm">
            <Calendar className="h-4 w-4" />
            {featuredStory.publishedAt}
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{featuredStory.title}</h1>

        <p className="text-lg md:text-xl text-gray-300 mb-6 leading-relaxed">{featuredStory.description}</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {featuredStory.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="border-gray-600 text-gray-300">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-4">
          <Button size="lg" className="bg-white text-black hover:bg-gray-200 font-semibold">
            <Play className="h-5 w-5 mr-2" />
            Read Now
          </Button>
          <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 bg-transparent">
            <Info className="h-5 w-5 mr-2" />
            More Info
          </Button>
        </div>
      </div>
    </div>
  )
}
