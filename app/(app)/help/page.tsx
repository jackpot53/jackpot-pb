import { HelpCircle } from 'lucide-react'

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
  {
    id: 6,
    question: '시장동향은 어디서 조회하나요?',
    answer: '시장동향은 Naver Finance와 Yahoo Finance에서 스크래핑/API로 조회합니다.',
    color: 'bg-cyan-500',
    renderAnswer: true,
  },
]

export default function HelpPage() {
  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#111111] p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-cyan-400/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        </div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400/70 text-xs font-semibold tracking-widest uppercase">
              <HelpCircle className="h-3.5 w-3.5" />도움말
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>자주 묻는 질문</h1>
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
            <div className="h-px bg-white/10" />
            <div className="px-6 py-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground font-[family-name:var(--font-sunflower)]">
                  <span><span className="mr-2">{numberEmoji}</span>{faq.question}</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="hidden group-open:block mt-3 mb-1 border-t border-border" />
                {faq.id === 6 ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm leading-relaxed text-foreground/70">
                      insights 페이지의 시장동향 섹션에서는 한국과 미국 주식시장의 투자자 흐름과 거래량 동향을 보여줍니다.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-semibold text-foreground">섹션</th>
                            <th className="text-left py-2 px-2 font-semibold text-foreground">소스 & URL</th>
                            <th className="text-left py-2 px-2 font-semibold text-foreground">데이터</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="py-2 px-2">외국인 순매수</td>
                            <td className="py-2 px-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-1.5 py-0.5 font-mono text-xs text-orange-300">Naver Finance</span><br/>
                              <a href="https://finance.naver.com/sise/sise_deal_rank.naver?investor_gubun=1000" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-xs">sise_deal_rank.naver?investor_gubun=1000</a>
                            </td>
                            <td className="py-2 px-2">상위 5종목 (순매수액)</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="py-2 px-2">기관 순매수</td>
                            <td className="py-2 px-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-1.5 py-0.5 font-mono text-xs text-orange-300">Naver Finance</span><br/>
                              <a href="https://finance.naver.com/sise/sise_deal_rank.naver?investor_gubun=9000" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-xs">sise_deal_rank.naver?investor_gubun=9000</a>
                            </td>
                            <td className="py-2 px-2">상위 5종목 (순매수액)</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="py-2 px-2">거래량 HOT</td>
                            <td className="py-2 px-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-1.5 py-0.5 font-mono text-xs text-orange-300">Naver Finance</span><br/>
                              <a href="https://finance.naver.com/sise/sise_quant.naver?sosok=0" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-xs">sise_quant.naver?sosok=0</a>
                            </td>
                            <td className="py-2 px-2">상위 5종목 (거래량 기준)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2">US Trending</td>
                            <td className="py-2 px-2"><span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-1.5 py-0.5 font-mono text-xs text-blue-300">Yahoo Finance API</span></td>
                            <td className="py-2 px-2">상위 8개 심볼 (가격 + 일간 변화율)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">📊 캐시 시간: 7일 (데이터 조회 실패 시 이전 데이터 유지) | ⚠️ 네이버 페이지 레이아웃 변경 시 스크래핑이 실패할 수 있습니다.</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                    {faq.renderAnswer ? (
                      faq.id === 1 ? (
                        <>
                          한국 주식·ETF 시세는 <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300">한국투자증권 Open API</span>에서 실시간으로 조회합니다.<br/>
                          KOSPI·KOSDAQ 상장 주식 및 ETF를 모두 지원하며, 현재가와 전일 대비 등락률을 반환합니다.<br/>
                          <span className="block mt-3 font-semibold text-foreground">폴백: <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-blue-300">Yahoo Finance</span></span>
                          KIS 조회 실패 시 <span className="font-mono text-xs">.KS</span>(KOSPI) · <span className="font-mono text-xs">.KQ</span>(KOSDAQ) 심볼로 비공식 API를 통해 조회합니다.<br/>
                          <span className="block mt-3 text-xs text-muted-foreground">🔄 가격 캐시 시간: 5분 (조회 실패 시 이전 데이터 유지)</span>
                        </>
                      ) : faq.id === 2 ? (
                        <>
                          미국 주식·ETF 시세도 <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300">한국투자증권 Open API</span>에서 실시간으로 조회합니다.<br/>
                          NYSE·NASDAQ 상장 주식 및 ETF를 지원하며, USD 가격으로 조회 후 자동으로 원화로 변환합니다.<br/>
                          <span className="block mt-3 text-xs text-muted-foreground">🔄 가격 캐시 시간: 5분 (조회 실패 시 이전 데이터 유지)</span>
                        </>
                      ) : faq.id === 3 ? (
                        <>
                          암호화폐는 <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-orange-300">Finnhub API</span>에서 달러(USD) 단위로 조회한 후, 시스템이 자동으로 원화로 변환합니다.<br/>
                          암호화폐 가격은 24시간 실시간으로 변동하며, 5분마다 자동으로 갱신되어 포트폴리오에 반영됩니다.
                        </>
                      ) : faq.id === 4 ? (
                        <>
                          펀드 기준가는 <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-teal-300">FunETF 웹사이트</span> HTML 파싱으로 조회됩니다.<br/>
                          한국 뮤추얼펀드의 기준가(NAV)는 하루 1회만 갱신되며, 보통 자정 이후에 반영됩니다.<br/>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 font-mono text-xs font-semibold text-amber-300 mt-2">⚠️ 주의</span> 웹사이트 레이아웃이 변경되면 시세 조회에 오류가 발생할 수 있습니다.
                        </>
                      ) : faq.id === 5 ? (
                        <>
                          미국 주식/암호화폐 가격은 달러인데, 한국 사용자를 위해 자동으로 원화로 변환합니다.<br/>
                          <span className="block mt-3 font-semibold text-foreground">1순위: <span className="inline-flex items-center gap-1 rounded-md bg-green-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-green-300">BOK(한국은행) ECOS API</span></span>
                          공식 환율이므로 가장 정확합니다.<br/>
                          <span className="block mt-2 font-semibold text-foreground">2순위: <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-blue-300">Yahoo Finance</span></span>
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
                )}
              </details>
            </div>
          </div>
        );
        })}
      </div>

      {/* 하단 여유공간 */}
      <div className="h-32" />
    </div>
  )
}
