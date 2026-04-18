import { HelpCircle } from 'lucide-react'
import { FaqApiCard } from '@/components/app/faq-api-card'

const FAQS = [
  {
    id: 1,
    question: '어떻게 자산을 추가하나요?',
    answer: '포트폴리오 페이지에서 "자산 추가" 버튼을 클릭하고, 종목명이나 티커를 검색하여 추가할 수 있습니다. 주식, ETF, 암호화폐, 펀드, 예적금 등 다양한 자산을 지원합니다.',
    color: 'bg-blue-500',
  },
  {
    id: 2,
    question: '가격은 몇 분마다 업데이트되나요?',
    answer: '라이브 가격(주식, ETF, 암호화폐)은 최대 5분 간격으로 업데이트됩니다. 펀드는 하루 1회 기준가가 반영되며, 예적금과 부동산은 수동으로 입력해야 합니다.',
    color: 'bg-cyan-500',
  },
  {
    id: 3,
    question: '수익률은 어떻게 계산되나요?',
    answer: '수익률은 (현재가격 - 매수평균가) / 매수평균가 × 100%로 계산됩니다. 자산별로는 매입금액의 가중평균을 사용하여 정확한 수익률을 제공합니다.',
    color: 'bg-emerald-500',
  },
  {
    id: 4,
    question: '거래내역을 어떻게 입력하나요?',
    answer: '거래내역 페이지에서 매수/매도 기록을 입력할 수 있습니다. 종목명, 수량, 단가, 거래일자를 입력하면 자동으로 포트폴리오에 반영됩니다.',
    color: 'bg-amber-500',
  },
  {
    id: 5,
    question: '목표를 설정하는 이유는 무엇인가요?',
    answer: '목표를 설정하면 현재 자산과 목표액의 진행도를 시각적으로 추적할 수 있습니다. 재정 목표에 얼마나 가까워졌는지 한눈에 확인하여 투자 동기를 유지할 수 있습니다.',
    color: 'bg-violet-500',
  },
  {
    id: 6,
    question: '데이터는 안전하게 보관되나요?',
    answer: 'jackpot은 Supabase를 통해 PostgreSQL 데이터베이스에 암호화되어 저장됩니다. 사용자 인증은 Supabase Auth로 보호되며, 개인 데이터는 절대 제3자와 공유되지 않습니다.',
    color: 'bg-rose-500',
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
            <p className="text-white/60 text-sm">
              jackpot을 사용하는 방법을 알아봅시다
            </p>
          </div>
        </div>
      </div>

      {/* FAQ 영역 */}
      <div className="space-y-3">
        {FAQS.map((faq) => (
          <div
            key={faq.id}
            className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 ${faq.color}`} />
            <div className="p-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground">
                  <span>{faq.question}</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer.split('.').filter(s => s.trim()).map((sentence, idx, arr) => (
                    <span key={idx}>
                      {sentence.trim()}.
                      {idx < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </details>
            </div>
          </div>
        ))}

        {/* API 정보 카드 */}
        <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
          <div className="h-1 bg-indigo-500" />
          <div className="p-6">
            <FaqApiCard />
          </div>
        </div>
      </div>

      {/* 하단 여유공간 */}
      <div className="h-32" />
    </div>
  )
}
