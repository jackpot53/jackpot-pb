import { TrendingUp, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export default function MacdPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">MACD</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MACD는 가장 널리 쓰이는 보조지표 중 하나지만, &ldquo;믿을만한가&rdquo;에 대한 답은{' '}
          <strong className="text-foreground">
            &ldquo;단독으로는 신뢰하기 어렵고, 보조 도구로는 유용하다&rdquo;
          </strong>
          입니다.
        </p>
      </div>

      {/* 강점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">MACD의 강점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          추세의 방향과 모멘텀(힘)을 동시에 보여줍니다. 두 이동평균선의 차이를 이용하기 때문에 추세가 분명한 장세에서는
          진입·청산 타이밍을 비교적 잘 잡아줍니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          골든크로스(시그널선 상향 돌파)와 데드크로스, 그리고 다이버전스(가격과 MACD의 방향 불일치)는 실제로 전환점을
          미리 알려주는 경우가 많습니다.
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">MACD의 약점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          가장 큰 한계는 <strong className="text-foreground">후행성(lagging)</strong>입니다. 과거 가격의 평균을 기반으로
          하기 때문에 신호가 늘 한 박자 늦게 나옵니다. 이미 상당히 오른 뒤에 매수 신호가, 많이 내린 뒤에 매도 신호가
          뜨는 식이죠.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          또{' '}
          <strong className="text-foreground">횡보장(박스권)에서는 잦은 거짓 신호(whipsaw)</strong>를 냅니다. 방향성
          없이 오르내리는 구간에서는 골든크로스·데드크로스가 반복되며 손실을 키울 수 있습니다.
        </p>
      </div>

      {/* 실전 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">실전에서의 활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          혼자 쓰기보다 다른 지표·정보와 함께 보는 게 일반적입니다. 거래량, RSI(과매수·과매도 판단), 지지·저항선,
          그리고 전체 추세 방향과 교차 확인하는 식입니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          특히 <strong className="text-foreground">다이버전스</strong>는 MACD에서 신뢰도가 높은 신호로 여겨집니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          MACD는 <strong>&ldquo;절대적인 매매 신호&rdquo;</strong>가 아니라{' '}
          <strong>&ldquo;추세와 모멘텀을 읽는 참고 도구&rdquo;</strong>로 보는 게 맞습니다. 어떤 단일 지표도 시장을
          완벽히 예측하지 못하므로, 여러 근거가 같은 방향을 가리킬 때 신뢰도가 올라갑니다.
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
