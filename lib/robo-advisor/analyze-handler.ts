import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

type AnalyzeRequest = {
  ticker: string
  stockName: string
  sector: string | null
  market: string
  currentPrice: number
  changePercent: number | null
  changeAmount: number | null
  marketCapKrw: number | null
  triggeredSignals: string[]
  backtestStats: Record<
    string,
    {
      winRate: number
      sampleCount: number
      avgReturn: number
      medianReturn: number
    }
  >
}

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 기술적 분석 전문가입니다. 주어진 종목 정보와 기술적 시그널을 바탕으로 매수/매도 의견을 분석하고, 다음 형식의 마크다운 리포트를 작성합니다.

### 종합 의견
- **추천**: [매수/관망/매도]
- **확신도**: [높음/중간/낮음]
- **목표 수익률**: [예상 수익률 범위]
- **한 문장 요약**: [핵심 내용]

### 기술적 분석
발동된 시그널의 의미와 현재 기술적 포지션을 분석합니다.

### 리스크 요인
이 신호가 잘못될 수 있는 경우와 하방 리스크를 분석합니다.

### 백테스트 근거
과거 백테스트 결과를 바탕으로 기대 수익률을 설명합니다.

### 투자 포인트
실전 투자 시 고려할 체크리스트를 제시합니다.`

export async function handleAnalyzeRequest(request: NextRequest): Promise<Response> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  try {
    const body = (await request.json()) as AnalyzeRequest
    const { ticker } = body

    const marketCapStr = body.marketCapKrw
      ? `${(body.marketCapKrw / 1e12).toFixed(1)}조 원`
      : '미정'

    const changeStr =
      body.changePercent !== null
        ? `${body.changePercent >= 0 ? '+' : ''}${body.changePercent.toFixed(2)}%`
        : '미정'

    const backtestSummary = Object.entries(body.backtestStats)
      .map(
        ([signal, stats]) =>
          `- ${signal}: 승률 ${(stats.winRate / 100).toFixed(1)}% (${stats.sampleCount}회), 평균 수익률 ${(stats.avgReturn / 100).toFixed(2)}%`,
      )
      .join('\n')

    const prompt = `다음 정보를 바탕으로 매수/매도 의견을 분석해주세요.

## 종목 정보
- 종목명: ${body.stockName} (${ticker})
- 시장: ${body.market}
- 섹터: ${body.sector || '미분류'}
- 현재가: ${body.currentPrice.toLocaleString('ko-KR')} 원
- 일간 등락: ${changeStr}
- 시가총액: ${marketCapStr}

## 발동된 시그널
${body.triggeredSignals.join('\n')}

## 백테스트 통계 (20일 보유 기준)
${backtestSummary}`

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      stream: true,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Analyze API error:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}
