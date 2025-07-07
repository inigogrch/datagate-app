'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FeedResponse } from '@/lib/types'

async function fetchFeed(page: number = 1): Promise<FeedResponse> {
  const response = await fetch(`/api/feed?page=${page}&limit=20`)
  if (!response.ok) {
    throw new Error('Failed to fetch feed')
  }
  return response.json()
}

async function submitFeedback(storyId: string, score: -1 | 1): Promise<void> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ story_id: storyId, score }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to submit feedback')
  }
}

export function useFeed(page: number = 1) {
  return useQuery({
    queryKey: ['feed', page],
    queryFn: () => fetchFeed(page),
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
  })
}

export function useFeedback() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ storyId, score }: { storyId: string; score: -1 | 1 }) => 
      submitFeedback(storyId, score),
    onSuccess: () => {
      // Invalidate feed queries to refresh relevance scores
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
} 