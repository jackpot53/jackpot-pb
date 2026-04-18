import { NextRequest } from 'next/server'
import { handleAnalyzeRequest } from '@/lib/robo-advisor/analyze-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handleAnalyzeRequest(request)
}
