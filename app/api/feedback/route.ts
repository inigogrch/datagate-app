import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FeedbackRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Parse request body
    const body: FeedbackRequest = await request.json()
    const { story_id, score, comment } = body

    // Validate input
    if (!story_id || !score || ![-1, 1].includes(score)) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      )
    }

    // For MVP, we'll use a mock user ID
    const userId = 'anonymous'

    // Insert or update feedback
    const { error } = await supabase
      .from('feedback')
      .upsert({
        user_id: userId,
        story_id,
        score,
        comment: comment || null
      }, {
        onConflict: 'user_id,story_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving feedback:', error)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 