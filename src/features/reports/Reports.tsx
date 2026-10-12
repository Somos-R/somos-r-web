import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Badge, Button, Card, CardContent, CardHeader, KpiValue, Loader,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '../../components/ui'
import { useRoles } from '../../hooks/useRoles'
import { catalogQueries } from '../../queries/catalogs'
import { inventoryQueries } from '../../queries/inventory'
import { transactionsQueries } from '../../queries/transactions'
import { weighingsQueries } from '../../queries/weighings'
import { inventoryService } from '../../services/inventory'
import { transactionsService } from '../../services/transactions'
import { weighingsService } from '../../services/weighings'
import { csvFileName, saveBlob } from '../../lib/download'
import { getMaterialColor } from '../../lib/catalog'
import { t } from '../../lib/i18n'

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <Grid item xs={6} sm={3}>
      <KpiValue value={value} label={label} size="small" />
    </Grid>
  )
}

function ExportButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  return (
    <Button variant="outlined" size="small" disabled={isPending} onClick={onClick}>
      {isPending ? t.common.exportCsv.busy : t.common.exportCsv.button}
    </Button>
  )
}

const kg = (value: number | undefined) => `${Number(value ?? 0).toLocaleString('es-CO')} kg`
const money = (value: number | undefined) => `$${Number(value ?? 0).toLocaleString('es-CO')}`

/** Operational report, built from the stats each domain already exposes: what Óscar still owes this
 * page is a cross-domain "top recyclers" ranking and the SUI-format exports (REP-03/REP-04) — nothing
 * here waits on that. */
export default function Reports() {
  const { can } = useRoles()
  const showInventory = can('inventory.view')
  const showTransactions = can('transactions.view')

  const { data: weighingStats, isLoading: weighingsLoading } = useQuery(weighingsQueries.stats())
  const { data: materials } = useQuery(catalogQueries.materials())
  const { data: inventoryStats } = useQuery({ ...inventoryQueries.stats(), enabled: showInventory })
  const { data: transactionStats } = useQuery({ ...transactionsQueries.stats(), enabled: showTransactions })

  const materialLabel = (code: string) => materials?.find((m) => m.code === code)?.label ?? code

  const exportWeighings = useMutation({
    mutationFn: () => weighingsService.exportCsv({}),
    onSuccess: (file) => saveBlob(file, csvFileName(t.reportes.exportFile.weighings)),
  })
  const exportInventory = useMutation({
    mutationFn: () => inventoryService.exportCsv({}),
    onSuccess: (file) => saveBlob(file, csvFileName(t.reportes.exportFile.inventory)),
  })
  const exportTransactions = useMutation({
    mutationFn: () => transactionsService.exportCsv({}),
    onSuccess: (file) => saveBlob(file, csvFileName(t.reportes.exportFile.transactions)),
  })

  const byMaterial = weighingStats?.by_material ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.reportes.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.reportes.subtitle}</Typography>
      </Box>

      <Card>
        <CardHeader
          title={t.reportes.weighings.title}
          action={<ExportButton isPending={exportWeighings.isPending} onClick={() => exportWeighings.mutate()} />}
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {weighingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><Loader /></Box>
          ) : (
            <>
              <Grid container spacing={2}>
                <Metric value={String(weighingStats?.total_weighings_month ?? 0)} label={t.reportes.weighings.count} />
                <Metric value={kg(weighingStats?.total_kg_month)} label={t.reportes.weighings.kg} />
              </Grid>

              {byMaterial.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t.reportes.weighings.emptyMaterials}</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t.reportes.weighings.table.material}</TableCell>
                        <TableCell>{t.reportes.weighings.table.kg}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {byMaterial.map((row) => (
                        <TableRow key={row.material}>
                          <TableCell><Badge label={materialLabel(row.material)} color={getMaterialColor(row.material)} /></TableCell>
                          <TableCell>{kg(row.kg)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showInventory && (
        <Card>
          <CardHeader
            title={t.reportes.inventory.title}
            action={<ExportButton isPending={exportInventory.isPending} onClick={() => exportInventory.mutate()} />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Metric value={kg(inventoryStats?.total_stock_kg)} label={t.reportes.inventory.stock} />
              <Metric value={money(inventoryStats?.total_value)} label={t.reportes.inventory.value} />
              <Metric value={String(inventoryStats?.low_stock_count ?? 0)} label={t.reportes.inventory.lowStock} />
            </Grid>
          </CardContent>
        </Card>
      )}

      {showTransactions && (
        <Card>
          <CardHeader
            title={t.reportes.transactions.title}
            action={<ExportButton isPending={exportTransactions.isPending} onClick={() => exportTransactions.mutate()} />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Metric value={String(transactionStats?.total_purchases_month ?? 0)} label={t.reportes.transactions.purchases} />
              <Metric value={String(transactionStats?.total_sales_month ?? 0)} label={t.reportes.transactions.sales} />
              <Metric value={money(transactionStats?.total_value_purchases)} label={t.reportes.transactions.purchasesValue} />
              <Metric value={money(transactionStats?.total_value_sales)} label={t.reportes.transactions.salesValue} />
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
