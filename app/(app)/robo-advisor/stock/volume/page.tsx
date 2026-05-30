import { Users, AlertTriangle, Lightbulb, Info, TrendingUp } from 'lucide-react'

export default function VolumePage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">투자자별 매매동향</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          수급을 읽는 대표적인 자료로, 보조 지표 중에서는 꽤 의미 있게 보는 사람이 많습니다.{' '}
          <strong className="text-foreground">다만 이것도 만능은 아닙니다.</strong>
        </p>
      </div>

      {/* 무엇을 보는 자료인가 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-sky-500" />
          <h2 className="text-sm font-semibold text-foreground">무엇을 보는 자료인가</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          외국인, 기관, 개인이 각각 특정 종목을 얼마나 사고팔았는지 보여주는 데이터입니다. 가격은 결국
          수급(사려는 힘 vs 팔려는 힘)으로 움직이기 때문에, 누가 매수 주체인지 파악하면 흐름을 읽는 데
          도움이 됩니다.
        </p>
      </div>

      {/* 왜 유용한가 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">왜 유용한가</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          외국인과 기관은 자금 규모가 크고 정보·분석력이 뛰어난 경우가 많아, 이들이 꾸준히 순매수하는
          종목은 상승 동력이 붙는 경우가 많습니다. 특히{' '}
          <strong className="text-foreground">외국인·기관이 동시에 며칠 연속 순매수</strong>하는 종목은
          시장의 관심과 자금이 몰린다는 신호로 해석됩니다. 반대로 둘 다 지속적으로 순매도하면 경계
          신호로 봅니다.
        </p>
      </div>

      {/* 한계와 주의점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">한계와 주의점</h2>
        </div>
        <ul className="space-y-2.5">
          <li className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">후행 정보</strong>입니다. 매매동향은 장 마감 후
            집계되어 나오므로, 이미 가격에 반영된 뒤를 보는 셈입니다.
          </li>
          <li className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">창구·차익거래 왜곡</strong>이 있습니다. 외국인
            순매수처럼 보여도 실제로는 선물·옵션 연계 차익거래나 단순 헤지일 수 있어, 방향성과
            무관한 경우가 있습니다.
          </li>
          <li className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">&lsquo;외국인=스마트머니&rsquo;라는 통념이 늘 맞진
            않습니다.</strong> 외국인도 손실을 보고 기관도 물립니다.
          </li>
          <li className="text-sm text-muted-foreground leading-relaxed">
            하루치 데이터는 노이즈가 큽니다.{' '}
            <strong className="text-foreground">추세(여러 날의 누적 흐름)</strong>로 봐야 의미가
            있습니다.
          </li>
        </ul>
      </div>

      {/* 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          가격·거래량 움직임과 함께 교차 확인하는 게 일반적입니다. 예를 들어 주가가 바닥권에서
          외국인·기관 순매수가 누적되며 거래량이 늘면 신뢰도가 올라가고, 반대로 주가는 오르는데
          기관·외국인은 팔고 개인만 사는 구조라면 주의해서 봅니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          MACD 같은 기술적 지표가 <strong>&ldquo;차트의 모멘텀&rdquo;</strong>을 본다면, 투자자별
          매매동향은 <strong>&ldquo;실제 돈의 흐름&rdquo;</strong>을 보는 자료라 서로 성격이
          다릅니다. 둘을 함께 보면 보완이 되지만, 어느 쪽도 단독으로 미래를 보장하진 않습니다.
        </p>
      </div>

      {/* 면책 고지 */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
        <Info size={13} className="shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          투자 판단과 책임은 본인에게 있으며, 이 내용은 투자 자문이 아닙니다.
        </p>
      </div>
    </div>
  )
}
