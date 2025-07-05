"use client"

import { Calendar, TrendingUp, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Story } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"

interface StoryCardProps {
  story: Story
  onFeedback?: (storyId: string, score: -1 | 1) => Promise<void>
}

export default function StoryCard({ story, onFeedback }: StoryCardProps) {
  const [userFeedback, setUserFeedback] = useState<-1 | 0 | 1>(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleFeedback = async (score: -1 | 1) => {
    if (isLoading || !onFeedback) return
    
    setIsLoading(true)
    try {
      await onFeedback(story.id, score)
      setUserFeedback(score)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const timeAgo = formatDistanceToNow(new Date(story.published_at), { addSuffix: true })

  // Determine category badge color based on source
  const getCategoryColor = () => {
    if (story.source.toLowerCase().includes('dbt')) return 'bg-orange-600'
    return 'bg-red-600'
  }

  return (
    <Card className="w-80 h-[500px] bg-gray-900 border-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300 group flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header with source badge */}
        <div className="relative h-12 px-6 pt-4">
          <Badge className={`${getCategoryColor()} text-white`}>
            {story.source}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">{timeAgo}</span>
              {story.relevance_score && story.relevance_score > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-green-400">
                    {Math.round(story.relevance_score * 100)}% relevant
                  </span>
                </>
              )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">
              {story.title}
            </h3>

            {story.summary && (
              <>
                <div className="mb-4">
                  <ul className="space-y-1">
                    {story.summary.tldr.slice(0, 3).map((item, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-orange-500 mt-1.5 text-xs">•</span>
                        <span className="line-clamp-2">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 line-clamp-2">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    {story.summary.impact}
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-1 mb-4">
              {story.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs border-gray-600 text-gray-400">
                  {tag}
                </Badge>
              ))}
              {story.tags.length > 3 && (
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                  +{story.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {/* Feedback buttons */}
            <div className="flex gap-2">
              <Button
                variant={userFeedback === 1 ? "default" : "outline"}
                size="sm"
                className={`flex-1 ${userFeedback === 1 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                onClick={() => handleFeedback(1)}
                disabled={isLoading}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful
              </Button>
              <Button
                variant={userFeedback === -1 ? "default" : "outline"}
                size="sm"
                className={`flex-1 ${userFeedback === -1 ? 'bg-red-600 hover:bg-red-700' : ''}`}
                onClick={() => handleFeedback(-1)}
                disabled={isLoading}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Not helpful
              </Button>
            </div>

            {/* Read more button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => window.open(story.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Read More
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
