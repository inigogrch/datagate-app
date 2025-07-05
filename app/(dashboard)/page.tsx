'use client'

export const dynamic = 'force-dynamic'

import Sidebar from "@/components/Sidebar"
import TopNav from "@/components/TopNav"
import ContentRow from "@/components/ContentRow"
import { useFeed, useFeedback } from "@/lib/hooks/use-feed"
import { Skeleton } from "@/components/ui/skeleton"
import { Story } from "@/lib/types"

export default function FeedPage() {
  const { data, isLoading, error } = useFeed()
  const { mutate: submitFeedback } = useFeedback()

  const handleFeedback = async (storyId: string, score: -1 | 1) => {
    submitFeedback({ storyId, score })
  }

  // Group stories by recency
  const groupStoriesByRecency = (stories: Story[]) => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const today: Story[] = []
    const thisWeek: Story[] = []
    const older: Story[] = []

    stories.forEach(story => {
      const publishedDate = new Date(story.published_at)
      if (publishedDate > oneDayAgo) {
        today.push(story)
      } else if (publishedDate > oneWeekAgo) {
        thisWeek.push(story)
      } else {
        older.push(story)
      }
    })

    return { today, thisWeek, older }
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          <TopNav />

          <main className="p-6 pt-20">
            {isLoading ? (
              <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-4">
                  <Skeleton className="h-[500px] w-80" />
                  <Skeleton className="h-[500px] w-80" />
                  <Skeleton className="h-[500px] w-80" />
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500">Failed to load stories. Please try again later.</p>
              </div>
            ) : data?.stories && data.stories.length > 0 ? (
              <>
                {(() => {
                  const grouped = groupStoriesByRecency(data.stories)
                  return (
                    <>
                      {grouped.today.length > 0 && (
                        <ContentRow 
                          title="🔥 Today's Updates" 
                          stories={grouped.today} 
                          onFeedback={handleFeedback}
                        />
                      )}
                      {grouped.thisWeek.length > 0 && (
                        <ContentRow 
                          title="📅 This Week" 
                          stories={grouped.thisWeek} 
                          onFeedback={handleFeedback}
                        />
                      )}
                      {grouped.older.length > 0 && (
                        <ContentRow 
                          title="📚 Earlier Updates" 
                          stories={grouped.older} 
                          onFeedback={handleFeedback}
                        />
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-white mb-2">No stories yet</h3>
                <p className="text-gray-400">Run the ingestion script to fetch dbt Labs updates</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
} 