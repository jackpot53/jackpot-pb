'use client'

function SentenceBreak({ text }: { text: string }) {
  const sentences = text.split('.').filter(s => s.trim());
  return (
    <>
      {sentences.map((sentence, idx) => (
        <span key={idx}>
          {sentence.trim()}.
          {idx < sentences.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

export function FaqApiCard() {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground">
        <span><span className="mr-2">1️⃣</span>한국 주식/ETF와 미국 주식/ETF 실시간 시세 조회는 어디서 하나요?</span>
        <span className="transition-transform group-open:rotate-180">▼</span>
      </summary>

      <div className="mt-4 space-y-6 text-sm text-muted-foreground">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
            🇰🇷 한국 주식/ETF
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            한국거래소(KRX)에 상장된 모든 주식/ETF는 <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">Yahoo Finance API</span>에서 실시간으로 조회됩니다.<br/>
            가격은 원(KRW) 단위이며, 시장 종료 후 약 15초 이내에 반영됩니다.
          </p>
        </div>

        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            🇺🇸 미국 주식/ETF
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            뉴욕거래소(NYSE, NASDAQ)에 상장된 주식/ETF는 <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">Yahoo Finance API</span>에서 달러(USD) 단위로 조회한 후, 시스템이 자동으로 한국은행(BOK) 공식 환율을 사용해 원화로 변환합니다.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
          <p>
            <span className="font-semibold text-blue-400">💡 참고</span> <SentenceBreak text="5분마다 자동 갱신되어 포트폴리오에 실시간 반영됩니다." />
          </p>
        </div>
      </div>
    </details>
  )
}
