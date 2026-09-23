import { useQuery } from '@tanstack/react-query'
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

// Deliberately thin for now. The numbers that matter to a shop - revenue, orders by
// status, payments awaiting verification - need the orders API, which is a later phase.
// Showing catalogue counts now beats showing fake revenue.
function Stat({ label, value, hint }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{label}</Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 600, mt: 0.5 }}>{value}</Typography>
        {hint && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{hint}</Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const products = useQuery({
    queryKey: queryKeys.products.list({ perPage: 100 }),
    queryFn: () => get('/admin/products', { params: { perPage: 100 } }),
  })

  const media = useQuery({
    queryKey: queryKeys.media.list({ perPage: 1 }),
    queryFn: () => get('/admin/media', { params: { perPage: 1 } }),
  })

  const rows = products.data?.data ?? []
  const active = rows.filter((product) => product.status === 'active').length
  const drafts = rows.filter((product) => product.status === 'draft').length
  const variants = rows.reduce((sum, product) => sum + (product.variants?.length ?? 0), 0)
  const lowStock = rows.filter((product) =>
    (product.variants ?? []).some(
      (variant) => variant.isActive && variant.stockQuantity <= variant.lowStockThreshold,
    ),
  ).length

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Active products" value={active} hint={`${drafts} draft(s)`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Variants" value={variants} hint="across all products" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Low stock" value={lowStock} hint="products at or below threshold" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Media files" value={media.data?.meta?.total ?? 0} hint="in the library" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h3" sx={{ mb: 1 }}>
            What is wired up
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: 14 }}>
            <li>Products, variants, media and facets are live and editable.</li>
            <li>Orders, customers, CMS and settings arrive in later phases.</li>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
