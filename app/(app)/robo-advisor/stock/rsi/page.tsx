import { TrendingUp, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export default function RsiPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">RSI (Relative Strength Index)</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RSI는{' '}
          <strong className="text-foreground">
            &ldquo;가격이 얼마나 과하게 오르거나 내렸는지를 0~100 사이 숫자로 보여주는 모멘텀 지표&rdquo;
          </strong>
          입니다. 일정 기간 상승 폭과 하락 폭의 비율을 계산해, 70 이상이면 과매수(팔릴 때가 됨), 30 이하면 과매도(살 때가 됨)로 해석합니다.
        </p>
      </div>

      {/* 강점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">RSI의 강점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          직관적인 0~100 스케일로 과매수·과매도 구간을 한눈에 파악할 수 있습니다. 주식, 코인, 원자재 등 거의 모든 자산에
          적용할 수 있는 범용성도 큰 장점입니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          추세 내 조정 구간을 잡는 데 효과적입니다. 상승 추세 중 RSI가 30~50 구간으로 빠졌다가 반등하면 매수 기회로 볼 수 있고,
          하락 추세 중 50~70 반등 후 재하락 시 매도 타이밍으로 활용할 수 있습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">다이버전스(Divergence)</strong> 분석에 특히 유용합니다. 가격은 신고점을 갱신하는데 RSI는 이전 고점보다 낮으면 상승 모멘텀 약화를 경고합니다.
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">RSI의 약점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">강한 추세에서는 오작동합니다.</strong> 강력한 상승 추세에서는 RSI가 70 이상을 오랫동안 유지하며, 70을 넘었다고 무조건 매도하면 큰 수익 기회를 놓칩니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">후행성이 있습니다.</strong> 과거 가격 데이터를 기반으로 하므로 이미 움직임이 상당 부분 진행된 후에 신호가 발생하는 경우가 많습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          기간 설정에 따라 신호 빈도가 크게 달라집니다. 기간이 짧을수록(7일) 민감하고 노이즈가 많으며, 길수록(21일) 둔감하지만 신뢰도가 높아집니다. 기본값 14는 중간 균형점입니다.
        </p>
      </div>

      {/* 실전 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">실전에서의 활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RSI 30 하향 이탈 후 다시 30을 상향 돌파할 때를 매수 시점으로, 70 상향 돌파 후 다시 70 아래로 내려올 때를 매도 시점으로 봅니다. 이 앱의 RSI 패널에서 해당 시점에 화살표 마커로 표시합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MACD나 이평선 크로스와 같이 사용하면 신뢰도가 높아집니다. 예를 들어 RSI가 과매도에서 반등하면서 동시에 MACD 골든크로스가 나타나면 매수 신호의 강도가 올라갑니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          RSI는 <strong>&ldquo;단독 사용보다 다른 지표와 조합해 과매수·과매도 구간을 확인하는 필터&rdquo;</strong>로 쓸 때 가장 효과적입니다. 추세가 강할 땐 임계선보다 다이버전스에 집중하세요.
        </p>
      </div>

      {/* 면책 고지 */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
        <Info size={13} className="shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          투자 판단은 본인의 책임이며, 이 내용은 투자 자문이 아닙니다. 특정 종목이나 시점에 대한 구체적 조언이
          필요하다면 전문가와 상담하시길 권합니다.
        </p>
      </div>
    </div>
  )
}
