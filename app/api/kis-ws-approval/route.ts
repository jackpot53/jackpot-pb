import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/supabase/server'
import { getApprovalKey } from '@/lib/price/kis-ws-approval'

// Defensive: cap mint to once per minute per process to prevent client-bug runaway.
const MIN_INTERVAL_MS = 60_000
let lastMintAt = 0
let lastResult: { approvalKey: string; expiresAt: string } | null = null

/**
 * GET /api/kis-ws-approval
 * Returns a KIS WebSocket approval_key for browser-direct WS connections.
 * Approval keys are short-lived (24h) and limited to KIS quota tier.
 */
export async function GET() {
  const user = await getAuthUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const now = Date.now()
  if (lastResult && now - lastMintAt < MIN_INTERVAL_MS) {
    return NextResponse.json(lastResult, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const { approvalKey, expiresAt } = await getApprovalKey()
    lastMintAt = now
    lastResult = { approvalKey, expiresAt: expiresAt.toISOString() }
    return NextResponse.json(lastResult, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[kis-ws-approval] mint failed:', err)
    return NextResponse.json({ error: 'failed to mint approval key' }, { status: 502 })
  }
}
