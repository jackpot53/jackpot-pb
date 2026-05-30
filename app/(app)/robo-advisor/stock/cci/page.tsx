import { TrendingUp, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export default function CciPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">CCI (Commodity Channel Index)</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CCI는{' '}
          <strong className="text-foreground">
            &ldquo;현재 가격이 통계적 평균에서 얼마나 벗어나 있는지를 수치화한 모멘텀 지표&rdquo;
          </strong>
          입니다. 원래 원자재(Commodity) 시장을 위해 개발됐지만, 주식과 코인에도 광범위하게 쓰입니다. +100 이상이면 과매수, -100 이하면 과매도로 해석합니다.
        </p>
      </div>

      {/* 강점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">CCI의 강점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RSI나 Stochastic처럼 0~100에 갇히지 않고, 이론적으로 무한대까지 발산할 수 있습니다. 덕분에 강한 추세에서
          <strong className="text-foreground"> 추세의 강도</strong>를 더 명확하게 보여줍니다. +200, -200을 넘어서도 추세가 계속될 수 있다는 점이 다른 오실레이터와 다릅니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          고가·저가·종가를 모두 반영한 Typical Price를 사용하므로 하루 중 가격 범위를 더 넓게 고려합니다. 종가만 쓰는 RSI보다 일중 가격 변동에 더 민감하게 반응합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          0선 돌파를 추세 전환의 신호로도 활용할 수 있습니다. -100 아래에서 0선을 상향 돌파하면 단기 추세 전환의 초기 신호로 볼 수 있습니다.
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">CCI의 약점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">범위가 정해져 있지 않아 임계선 해석이 주관적입니다.</strong> RSI의 30/70처럼
          보편적으로 합의된 임계선이 없고, +100/-100이 표준으로 쓰이지만 종목·시장에 따라 +200/-200이 더 적합한 경우도 있습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">후행성이 있습니다.</strong> SMA 기반으로 계산하므로 이미 움직임이 상당히 진행된 후에 신호가 나타납니다. 특히 기간이 길수록 더 늦게 반응합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          단독 사용 시 과매수·과매도 구간이 오래 지속되는 추세 시장에서 조기 매도·매수 신호가 자주 발생합니다.
        </p>
      </div>

      {/* 실전 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">실전에서의 활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          -100 이하(과매도)에서 -100을 상향 돌파하면 매수 시그널, +100 이상(과매수)에서 +100을 하향 이탈하면 매도 시그널로 해석합니다. 이 앱의 CCI 패널이 해당 시점에 화살표 마커를 표시합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          이동평균이나 추세선으로 방향을 먼저 확인한 뒤 CCI 과매도 반등을 추가 확인하는 방식으로 활용하면 효과적입니다.
          RSI·Stochastic과 함께 세 지표가 모두 과매도를 나타낼 때 매수 신뢰도가 높아집니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          CCI는 <strong>&ldquo;추세의 강도와 과매수·과매도를 동시에 파악할 수 있는 범용 오실레이터&rdquo;</strong>입니다. 범위 제한이 없다는 특성상 RSI·Stochastic과 함께 쓰면 서로의 단점을 보완합니다.
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
