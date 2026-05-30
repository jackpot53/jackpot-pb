import { TrendingUp, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export default function StochasticPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">Stochastic Oscillator</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Stochastic은{' '}
          <strong className="text-foreground">
            &ldquo;최근 일정 기간의 최고·최저가 범위 내에서 현재 가격이 어느 위치에 있는지를 0~100으로 나타내는 모멘텀 지표&rdquo;
          </strong>
          입니다. %K(빠른선)와 %D(느린선) 두 선의 교차와 과매수·과매도 구간 진입·이탈로 매매 시점을 포착합니다.
        </p>
      </div>

      {/* 강점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">Stochastic의 강점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          가격의 상대적 위치를 고려하기 때문에 단순 이동평균보다 전환점 포착에 민감합니다. 특히 횡보 구간이나 변동성이
          낮은 시장에서 RSI보다 더 정확한 신호를 내는 경향이 있습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          %K와 %D 두 선의 교차를 이용하므로 단순 임계선 돌파보다 더 정교한 타이밍을 잡을 수 있습니다. 과매도 구간에서의
          %K 상향 교차는 RSI의 단순 30선 돌파보다 확인된 반등 신호입니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          0~100 범위로 정규화돼 있어 어떤 가격대의 종목이든 동일한 기준으로 비교할 수 있습니다.
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Stochastic의 약점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">추세 시장에서 오신호가 잦습니다.</strong> 강한 상승 추세 중에는 %K와 %D가
          80 이상에 오래 머물며, 하향 교차마다 매도 신호처럼 보이지만 실제로는 추세가 계속되는 경우가 많습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">가격 갭에 왜곡될 수 있습니다.</strong> 상한가/하한가 또는 시가 갭이 크면
          최고·최저가 범위가 순간적으로 크게 변해 지표가 일시적으로 왜곡됩니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          %K와 %D 교차가 과매도·과매수 구간 내에서 일어나야 의미 있는 신호입니다. 중립 구간(20~80)에서의 교차는 신뢰도가
          낮아 노이즈로 처리하는 것이 좋습니다. 이 앱의 시그널도 과매도·과매수 구간 교차만 표시합니다.
        </p>
      </div>

      {/* 실전 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">실전에서의 활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          %K·%D 모두 20 이하(과매도)일 때 %K가 %D를 상향 교차하면 매수, 80 이상(과매수)일 때 %K가 %D를 하향 교차하면 매도로 해석합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          이평선 방향이나 MACD와 함께 활용하면 추세와 역행하는 오신호를 걸러낼 수 있습니다. 상승 추세 확인 후 Stochastic
          과매도 반등 시 매수 진입하는 전략이 대표적입니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          Stochastic은 <strong>&ldquo;추세 필터를 통과한 후, 과매수·과매도 구간의 %K·%D 교차로 정밀한 진·출입 타이밍을 잡는 지표&rdquo;</strong>입니다. 추세 분석 없이 단독으로 쓰면 오신호가 많아집니다.
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
