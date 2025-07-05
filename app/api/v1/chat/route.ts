import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  // Placeholder for chat functionality
  // Will be implemented in future slices with RAG capabilities
  
  return NextResponse.json(
    { 
      message: 'Chat API coming soon in Slice 2', 
      status: 'not_implemented' 
    },
    { status: 501 }
  )
} 