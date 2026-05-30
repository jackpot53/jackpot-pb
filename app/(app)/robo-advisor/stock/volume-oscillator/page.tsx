import { TrendingUp, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export default function VolumeOscillatorPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
            보조지표
          </span>
          <h1 className="text-xl font-bold">Volume Oscillator</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Volume Oscillator는{' '}
          <strong className="text-foreground">
            &ldquo;추세나 돌파에 힘이 실렸는지 확인하는 보조 도구&rdquo;
          </strong>
          입니다. 방향을 알려주는 가격 지표와 짝지어 쓸 때 진가를 발휘하고, 혼자서는 매매 판단의 근거가 되기 어렵습니다.
        </p>
      </div>

      {/* 강점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">Volume Oscillator의 강점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          거래량이라는 &ldquo;실제 참여도&rdquo;를 본다는 게 가장 큰 강점입니다. 가격 지표만으로는 알 수 없는, 시장에
          돈과 관심이 실제로 몰리는지 빠지는지를 보여줍니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          추세의 신뢰도를 검증하는 데 유용합니다. 가격이 오를 때 거래량도 함께 늘면 그 상승은 힘이 실린 진짜 움직임으로
          보고, 거래량 없이 오르면 일시적·허약한 상승으로 의심할 수 있습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          단기·장기 거래량 평균의 차이를 쓰기 때문에, 단순히 그날 거래량만 보는 것보다 거래량의{' '}
          <strong className="text-foreground">&ldquo;추세적 변화&rdquo;</strong>를 부드럽게 읽을 수 있습니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          돌파(브레이크아웃)의 진위 판단에 도움이 됩니다. 저항선을 뚫을 때 거래량 오실레이터가 같이 치솟으면 진짜
          돌파일 가능성이 높고, 거래량이 받쳐주지 않는 돌파는 속임수(가짜 돌파)일 수 있습니다.
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Volume Oscillator의 약점</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">방향성을 알려주지 않습니다.</strong> 거래량이 늘었다는 건 알 수 있어도,
          그게 매수세 때문인지 매도세 때문인지는 구분하지 못합니다. 거래량은 사는 사람과 파는 사람이 항상 같이 있어야
          성립하기 때문입니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">단독으로는 매매 신호가 되기 어렵습니다.</strong> 가격 지표(이평선,
          MACD 등)나 차트 패턴과 반드시 함께 봐야 의미가 생깁니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">후행성이 있습니다.</strong> 이동평균을 기반으로 하므로 거래량 급변을 한
          박자 늦게 반영합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          설정값(단기·장기 기간)에 따라 신호가 크게 달라집니다. 기간을 짧게 잡으면 민감하지만 노이즈가 많고, 길게
          잡으면 둔감해집니다. 정답이 없어 종목·시장 성격에 맞게 조정해야 합니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          특정 이벤트성 거래량(대량 매물 출회, 프로그램 매매, 만기일 등)에 왜곡될 수 있습니다. 평소와 다른 일회성
          거래량이 지표를 일시적으로 튀게 만들 수 있습니다.
        </p>
      </div>

      {/* 실전 활용법 */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-foreground">실전에서의 활용법</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          가격 지표(이평선, MACD 등)와 함께 써야 진가를 발휘합니다. 예를 들어 MACD 골든크로스가 나왔을 때 Volume
          Oscillator도 양수라면 그 신호의 신뢰도가 높아집니다.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          저항선 돌파 시 거래량 오실레이터가 급등하면 진짜 돌파로 판단하는 필터로 활용할 수 있습니다. 반대로 거래량
          뒷받침 없는 돌파는 관망하는 근거가 됩니다.
        </p>
      </div>

      {/* 결론 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          Volume Oscillator는 <strong>&ldquo;추세나 돌파에 힘이 실렸는지 확인하는 보조 도구&rdquo;</strong>로 보는 게
          맞습니다. 어떤 단일 지표도 시장을 완벽히 예측하지 못하므로, 여러 근거가 같은 방향을 가리킬 때 신뢰도가
          올라갑니다.
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
