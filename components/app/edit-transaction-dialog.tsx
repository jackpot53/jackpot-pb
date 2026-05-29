'use client'
import { useState } from 'react'
import { Pencil, TrendingUp, TrendingDown, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AssetLogo } from '@/components/app/asset-logo'
import { Separator } from '@/components/ui/separator'
import { TransactionForm } from '@/components/app/transaction-form'
import { updateTransaction } from '@/app/actions/transactions'
import { updateAssetAccountType } from '@/app/actions/assets'
import type { TransactionWithAsset } from '@/db/queries/transactions'
import type { AssetType } from '@/lib/types/asset'
import { decodeQuantity, formatKrwPlain } from '@/lib/format'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA', irp: 'IRP', pension: '연금저축', dc: 'DC', brokerage: '위탁',
  upbit: '업비트', bithumb: '빗썸', coinone: '코인원', korbit: '코빗',
  binance: '바이낸스', coinbase: '코인베이스', kraken: '크라켄', okx: 'OKX',
  fund_mirae: '미래에셋', fund_samsung: '삼성', fund_kb: 'KB', fund_shinhan: '신한', fund_hanwha: '한화',
  fund_nh: 'NH아문디', fund_korea: '한국투자', fund_kiwoom: '키움', fund_hana: '하나', fund_woori: '우리',
  fund_ibk: 'IBK', fund_daishin: '대신', fund_timefolio: '타임폴리오', fund_truston: '트러스톤',
  bank_kb: 'KB국민', bank_shinhan: '신한', bank_woori: '우리', bank_hana: '하나', bank_nh: 'NH농협',
  bank_kakao: '카카오', bank_toss: '토스', bank_k: '케이뱅크', bank_ibk: 'IBK기업', bank_kdb: 'KDB산업',
  bank_busan: '부산', bank_daegu: '대구', bank_gwangju: '광주', bank_jeonbuk: '전북', bank_jeju: '제주',
  bank_sbi: 'SBI저축', bank_ok: 'OK저축', bank_welcome: '웰컴저축', bank_pepper: '페퍼저축',
  bank_shincom: '신협', bank_saemaul: '새마을금고',
  coop_shincom: '신협', coop_saemaul: '새마을금고', coop_suhyup: '수협', coop_nh: '농협', coop_nfcf: '산림조합',
  ins_samsung_life: '삼성생명', ins_hanwha_life: '한화생명', ins_kyobo: '교보생명',
  ins_shinhan_life: '신한라이프', ins_nh_life: 'NH농협생명', ins_kb_life: 'KB라이프',
  ins_aia: 'AIA생명', ins_metlife: '메트라이프', ins_prudential: '푸르덴셜',
  ins_samsung_fire: '삼성화재', ins_hyundai: '현대해상', ins_db_fire: 'DB손보',
  ins_kb_fire: 'KB손보', ins_meritz: '메리츠화재', ins_hanwha_fire: '한화손보',
  ins_lotte_fire: '롯데손보', ins_im_life: 'IM라이프',
}

const BROKERAGE_LABELS: Record<string, string> = {
  sec_mirae: '미래에셋', sec_samsung: '삼성', sec_korea: '한국투자',
  sec_kb: 'KB', sec_nh: 'NH투자', sec_shinhan: '신한투자',
  sec_kiwoom: '키움', sec_daishin: '대신', sec_hana: '하나',
  sec_meritz: '메리츠', sec_toss: '토스', sec_kakao: '카카오페이',
  sec_hyundai: '현대차', sec_kyobo: '교보', sec_ibk: 'IBK',
}
const STOCK_BROKERAGE_TYPES = Object.keys(BROKERAGE_LABELS)
const STOCK_ETF_ACCOUNT_TYPES = ['isa', 'irp', 'pension', 'dc', 'brokerage']
const CRYPTO_EXCHANGE_TYPES = ['upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx']
const FUND_COMPANY_TYPES = ['fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston']
const BANK_TYPES = ['bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper', 'bank_shincom', 'bank_saemaul']
const INSURANCE_TYPES = ['ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire', 'ins_lotte_fire']

function AccountTypeSection({ tx }: { tx: TransactionWithAsset }) {
  const assetType = tx.assetType
  const [accountType, setAccountType] = useState(tx.accountType ?? '')
  const [brokerageId, setBrokerageId] = useState(tx.brokerageId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isStockEtf = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us'].includes(assetType)
  const isFund = assetType === 'fund'
  const isCrypto = assetType === 'crypto'
  const isSavings = assetType === 'savings'
  const isInsurance = assetType === 'insurance'

  if (!isStockEtf && !isFund && !isCrypto && !isSavings && !isInsurance) return null

  async function handleSave() {
    setSaving(true)
    await updateAssetAccountType(
      tx.assetId,
      accountType || null,
      brokerageId || null,
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">계좌 유형 변경</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-7 text-xs"
        >
          {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(isStockEtf || isFund) && (
          <>
            <div className="flex-1 min-w-[120px] space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">{isFund ? '운용사' : '증권사'}</p>
              <Select value={brokerageId} onValueChange={(v) => setBrokerageId(v ?? '')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="선택 안함">
                    {brokerageId ? ACCOUNT_TYPE_LABELS[brokerageId] ?? brokerageId : '선택 안함'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  {isFund
                    ? FUND_COMPANY_TYPES.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)
                    : STOCK_BROKERAGE_TYPES.map((v) => <SelectItem key={v} value={v}>{BROKERAGE_LABELS[v]}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[120px] space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">계좌 유형</p>
              <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="선택 안함">
                    {accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : '선택 안함'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  {STOCK_ETF_ACCOUNT_TYPES.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {isCrypto && (
          <div className="flex-1 min-w-[120px] space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">거래소</p>
            <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="선택 안함">
                  {accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : '선택 안함'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">선택 안함</SelectItem>
                {CRYPTO_EXCHANGE_TYPES.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isSavings && (
          <div className="flex-1 min-w-[120px] space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">은행</p>
            <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="선택 안함">
                  {accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : '선택 안함'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">선택 안함</SelectItem>
                {BANK_TYPES.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isInsurance && (
          <div className="flex-1 min-w-[120px] space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">보험사</p>
            <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="선택 안함">
                  {accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : '선택 안함'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">선택 안함</SelectItem>
                {INSURANCE_TYPES.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}

export function EditTransactionDialog({ tx }: { tx: TransactionWithAsset }) {
  const [open, setOpen] = useState(false)

  const isUSD = tx.currency === 'USD'
  const exchangeRate = tx.exchangeRateAtTime ? tx.exchangeRateAtTime / 10000 : null

  const pricePerUnit = isUSD && exchangeRate
    ? String(Math.round((tx.pricePerUnit / exchangeRate) * 100) / 100)
    : String(tx.pricePerUnit)

  const defaultValues = {
    type: tx.type as 'buy' | 'sell',
    transactionDate: tx.transactionDate,
    quantity: decodeQuantity(tx.quantity),
    pricePerUnit,
    fee: String(tx.fee),
    exchangeRate: exchangeRate ? String(exchangeRate) : '',
    notes: tx.notes ?? null,
  }

  return (
    <Dialog data-component="EditTransactionDialog" open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="p-1" aria-label="거래 수정" />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>거래 수정</DialogTitle>
          <div className="flex items-center gap-1">
            <Button type="submit" form="edit-tx-form" size="icon-sm" variant="outline" aria-label="저장">
              <Save className="h-4 w-4" />
            </Button>
            <DialogClose render={<Button variant="outline" size="icon-sm" aria-label="닫기" />}>
              <span className="text-base leading-none">×</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator className="bg-black/30" />

        {/* 자산 카드 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
          <AssetLogo
            ticker={tx.ticker}
            name={tx.assetName}
            assetType={tx.assetType as AssetType}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{tx.assetName}</span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                tx.type === 'buy' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
              }`}>
                {tx.assetType === 'savings'
                  ? tx.type === 'buy'
                    ? <><TrendingUp className="h-3 w-3" />납입</>
                    : <><TrendingDown className="h-3 w-3" />해지출금</>
                  : tx.type === 'buy'
                    ? <><TrendingUp className="h-3 w-3" />매수</>
                    : <><TrendingDown className="h-3 w-3" />매도</>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{tx.transactionDate}</span>
              <span className="opacity-30">·</span>
              <span>수량 {decodeQuantity(tx.quantity)}</span>
              <span className="opacity-30">·</span>
              <span>단가 {formatKrwPlain(tx.pricePerUnit)}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-black/30" />

        <TransactionForm
          assetId={tx.assetId}
          assetType={tx.assetType as AssetType}
          currency={tx.currency as 'KRW' | 'USD'}
          defaultValues={defaultValues}
          onSubmit={async (data) => {
            const result = await updateTransaction(tx.id, tx.assetId, data)
            if (!result?.error) setOpen(false)
            return result
          }}
          submitLabel="수정 저장"
          onCancel={() => setOpen(false)}
          formId="edit-tx-form"
          hideActions
        />

        <Separator className="bg-black/10" />
        <AccountTypeSection tx={tx} />
      </DialogContent>
    </Dialog>
  )
}
