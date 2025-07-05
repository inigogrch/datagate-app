import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FeedResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // For MVP, we'll use a mock user ID
    // const userId = 'anonymous' // Will be used in future slices

    // Fetch stories from the ranked_stories view
    const { data: stories, error, count } = await supabase
      .from('ranked_stories')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching stories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stories' },
        { status: 500 }
      )
    }

    // Calculate next page
    const totalPages = Math.ceil((count || 0) / limit)
    const nextPage = page < totalPages ? page + 1 : null

    const response: FeedResponse = {
      stories: stories || [],
      nextPage
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Feed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 