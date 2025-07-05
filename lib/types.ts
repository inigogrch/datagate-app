// Database types matching our Supabase schema

export interface Story {
  id: string
  title: string
  url: string
  source: string
  content: string | null
  summary: {
    tldr: string[]
    impact: string
  } | null
  published_at: string
  tags: string[]
  created_at: string
  updated_at: string
  // From the ranked_stories view
  relevance_score?: number
  feedback_count?: number
}

export interface Feedback {
  id: string
  user_id: string
  story_id: string
  score: -1 | 1  // 👎 or 👍
  comment: string | null
  created_at: string
}

export interface FeedResponse {
  stories: Story[]
  nextPage: number | null
}

export interface FeedbackRequest {
  story_id: string
  score: -1 | 1
  comment?: string
}

// Component props types
export interface StoryCardProps {
  story: Story
  onFeedback?: (score: -1 | 1) => void
} 