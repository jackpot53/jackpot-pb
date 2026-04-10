import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { getAssets } from '@/db/queries/assets'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteAssetDialog } from '@/components/app/delete-asset-dialog'

export default async function AssetsPage() {
  const assetList = await getAssets()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 자산</h1>
        <Link
          href="/assets/new"
          className={buttonVariants()}
        >
          자산 추가
        </Link>
      </div>

      {assetList.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-semibold text-foreground">등록된 자산이 없습니다</p>
          <p className="text-sm text-muted-foreground">첫 번째 자산을 추가하여 포트폴리오를 시작해보세요.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>종목명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>평단가</TableHead>
              <TableHead>현재가</TableHead>
              <TableHead>수익%</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assetList.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <Link href={`/assets/${asset.id}`} className="hover:underline font-medium">
                    {asset.name}
                  </Link>
                  {asset.ticker && (
                    <span className="ml-2 text-xs text-muted-foreground">{asset.ticker}</span>
                  )}
                </TableCell>
                <TableCell>
                  <AssetTypeBadge assetType={asset.assetType} />
                </TableCell>
                <TableCell className="text-sm">—</TableCell>
                <TableCell className="text-sm">—</TableCell>
                <TableCell className="text-sm">—</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/assets/${asset.id}/edit`}
                      aria-label="자산 수정"
                      className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'p-2' })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteAssetDialog assetId={asset.id} assetName={asset.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
