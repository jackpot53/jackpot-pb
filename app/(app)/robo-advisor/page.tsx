import { redirect } from 'next/navigation'

// /robo-advisor 기본 진입은 종목시그널로 연결. 시장/섹터는 사이드바에서 직접 접근.
export default function RoboAdvisorIndexPage() {
  redirect('/robo-advisor/stock')
}
