import { HelpCircle, Package } from 'lucide-react'
import Link from 'next/link'


const FAQS = [
  {
    id: 1,
    question: '한국 주식/ETF 실시간 시세는 어디서 조회하나요?',
    answer: '',
    color: 'bg-indigo-500',
    renderAnswer: true,
  },
  {
    id: 2,
    question: '미국 주식/ETF 실시간 시세는 어디서 조회하나요?',
    answer: '',
    color: 'bg-blue-500',
    renderAnswer: true,
  },
  {
    id: 3,
    question: '암호화폐 실시간 시세는 어디서 조회하나요?',
    answer: '암호화폐는 Finnhub API에서 달러(USD) 단위로 조회한 후, 시스템이 자동으로 원화로 변환합니다. 암호화폐 가격은 24시간 실시간으로 변동하며, 5분마다 자동으로 갱신되어 포트폴리오에 반영됩니다.',
    color: 'bg-orange-500',
    renderAnswer: true,
  },
  {
    id: 4,
    question: '펀드 기준가는 어디서 조회하나요?',
    answer: '펀드 기준가는 FunETF 웹사이트에서 HTML 파싱으로 조회됩니다. 한국 뮤추얼펀드의 기준가(NAV)는 하루 1회만 갱신되며, 보통 자정 이후에 반영됩니다. 가격 단위는 원(KRW)입니다.',
    color: 'bg-teal-500',
    renderAnswer: true,
  },
  {
    id: 5,
    question: '환율은 어디서 조회하나요?',
    answer: '미국 주식과 암호화폐 가격을 자동으로 원화로 변환하기 위해 환율을 조회합니다. 1순위로 BOK(한국은행) ECOS API의 공식 환율을 사용하며, 조회 불가 시 Yahoo Finance의 환율을 활용합니다.',
    color: 'bg-green-500',
    renderAnswer: true,
  },
]

export default function HelpPage() {
  return (
    <div className="space-y-6 [font-family:var(--font-sunflower)]">
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 sm:p-6 text-white min-h-[160px] flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">도움말</h1>
            <p className="text-zinc-400 text-sm">자주 묻는 질문과 API 정보를 안내합니다</p>
          </div>
          <div className="flex-none hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10">
            <HelpCircle className="w-8 h-8 text-zinc-300" />
          </div>
        </div>
      </div>

      {/* FAQ 영역 */}
      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'][idx];
          return (
          <div
            key={faq.id}
            className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 ${faq.color}`} />
            <div className="px-6 py-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground font-[family-name:var(--font-sunflower)]">
                  <span><span className="mr-2">{numberEmoji}</span>{faq.question}</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="hidden group-open:block mt-3 mb-1 border-t border-border" />
                <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                    {faq.renderAnswer ? (
                      faq.id === 1 ? (
                        <>
                          한국 주식·ETF 시세는 <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">한국투자증권 Open API</span>에서 실시간으로 조회합니다.<br/>
                          KOSPI·KOSDAQ 상장 주식 및 ETF를 모두 지원하며, 현재가와 전일 대비 등락률을 반환합니다.<br/>
                          <span className="block mt-3 font-semibold text-foreground">폴백: <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">Yahoo Finance</span></span>
                          KIS 조회 실패 시 <span className="font-mono text-xs">.KS</span>(KOSPI) · <span className="font-mono text-xs">.KQ</span>(KOSDAQ) 심볼로 비공식 API를 통해 조회합니다.<br/>
                          <span className="block mt-3 text-xs text-muted-foreground">🔄 가격 캐시 시간: 5분 (조회 실패 시 이전 데이터 유지)</span>
                        </>
                      ) : faq.id === 2 ? (
                        <>
                          미국 주식·ETF 시세도 <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">한국투자증권 Open API</span>에서 실시간으로 조회합니다.<br/>
                          NYSE·NASDAQ 상장 주식 및 ETF를 지원하며, USD 가격으로 조회 후 자동으로 원화로 변환합니다.<br/>
                          <span className="block mt-3 text-xs text-muted-foreground">🔄 가격 캐시 시간: 5분 (조회 실패 시 이전 데이터 유지)</span>
                        </>
                      ) : faq.id === 3 ? (
                        <>
                          암호화폐는 <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 font-mono text-xs font-semibold text-orange-700">Finnhub API</span>에서 달러(USD) 단위로 조회한 후, 시스템이 자동으로 원화로 변환합니다.<br/>
                          암호화폐 가격은 24시간 실시간으로 변동하며, 5분마다 자동으로 갱신되어 포트폴리오에 반영됩니다.
                        </>
                      ) : faq.id === 4 ? (
                        <>
                          펀드 기준가는 <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 font-mono text-xs font-semibold text-teal-700">FunETF 웹사이트</span> HTML 파싱으로 조회됩니다.<br/>
                          한국 뮤추얼펀드의 기준가(NAV)는 하루 1회만 갱신되며, 보통 자정 이후에 반영됩니다.<br/>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-mono text-xs font-semibold text-amber-700 mt-2">⚠️ 주의</span> 웹사이트 레이아웃이 변경되면 시세 조회에 오류가 발생할 수 있습니다.
                        </>
                      ) : faq.id === 5 ? (
                        <>
                          미국 주식/암호화폐 가격은 달러인데, 한국 사용자를 위해 자동으로 원화로 변환합니다.<br/>
                          <span className="block mt-3 font-semibold text-foreground">1순위: <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-700">BOK(한국은행) ECOS API</span></span>
                          공식 환율이므로 가장 정확합니다.<br/>
                          <span className="block mt-2 font-semibold text-foreground">2순위: <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">Yahoo Finance</span></span>
                          1순위 조회 불가 시 활용됩니다.<br/>
                          <span className="block mt-3 text-xs text-muted-foreground">🔄 환율 캐시 시간: 1시간 (주식 가격 5분 vs 환율 1시간 - 환율은 천천히 변하기 때문)</span>
                        </>
                      ) : null
                    ) : (
                      faq.answer.split('.').filter(s => s.trim()).map((sentence, idx, arr) => (
                        <span key={idx}>
                          {sentence.trim()}.
                          {idx < arr.length - 1 && <br />}
                        </span>
                      ))
                    )}
                  </p>
              </details>
            </div>
          </div>
        );
        })}
      </div>

      {/* 기술스택 진입 카드 */}
      <Link
        href="/tech-stack"
        className="block rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden"
      >
        <div className="h-1 bg-slate-500" />
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-slate-400" />
            <div>
              <div className="font-semibold text-foreground font-[family-name:var(--font-sunflower)]">
                기술스택 & 라이선스
              </div>
              <div className="text-sm text-foreground/70">
                이 앱을 구성하는 오픈소스와 외부 API
              </div>
            </div>
          </div>
          <span className="text-muted-foreground">→</span>
        </div>
      </Link>
    </div>
  )
}
