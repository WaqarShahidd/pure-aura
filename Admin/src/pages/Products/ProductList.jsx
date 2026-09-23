import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import { get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'

const STATUS_COLOR = { active: 'success', draft: 'default', archived: 'warning' }

// Rupees, whole numbers, no decimals - matching the storefront's formatPrice.
const money = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export default function ProductList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 })

  const params = {
    page: pagination.page + 1,
    perPage: pagination.pageSize,
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
  }

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () =>
      get('/admin/products', { params }),
    // Keeping the previous page on screen while the next loads stops the grid collapsing
    // to zero rows and jumping the page height on every paginate.
    placeholderData: (previous) => previous,
  })

  const columns = useMemo(
    () => [
      {
        field: 'image',
        headerName: '',
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) =>
          row.images?.[0]?.url ? (
            <Box
              component="img"
              src={row.images[0].url}
              alt=""
              sx={{ width: 36, height: 36, borderRadius: 1, objectFit: 'cover', my: 0.75 }}
            />
          ) : (
            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: '#eef1e7', my: 0.75 }} />
          ),
      },
      { field: 'title', headerName: 'Product', flex: 1, minWidth: 200 },
      {
        field: 'category',
        headerName: 'Category',
        width: 140,
        valueGetter: (value) => value?.title ?? '—',
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        // Price lives on the default variant, so the list reads it from there rather
        // than from a product column that does not exist.
        valueGetter: (value, row) =>
          row.variants?.find((variant) => variant.isDefault)?.price ?? null,
        renderCell: ({ value }) => (value == null ? '—' : money.format(value)),
      },
      {
        field: 'stock',
        headerName: 'Stock',
        width: 110,
        valueGetter: (value, row) =>
          (row.variants ?? []).reduce((sum, variant) => sum + (variant.stockQuantity ?? 0), 0),
        renderCell: ({ value, row }) => {
          const low = (row.variants ?? []).some(
            (variant) => variant.isActive && variant.stockQuantity <= variant.lowStockThreshold,
          )
          return (
            <Typography sx={{ fontSize: 14, color: low ? 'warning.main' : 'inherit' }}>
              {value}
              {low ? ' · low' : ''}
            </Typography>
          )
        },
      },
      {
        field: 'variants',
        headerName: 'Variants',
        width: 100,
        valueGetter: (value) => value?.length ?? 0,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ value }) => (
          <Chip label={value} size="small" color={STATUS_COLOR[value] ?? 'default'} />
        ),
      },
    ],
    [],
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <TextField
          placeholder="Search products"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPagination((current) => ({ ...current, page: 0 }))
          }}
          sx={{ width: 260 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ width: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        {can('manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/products/new')}
          >
            New product
          </Button>
        )}
      </Stack>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.meta?.total ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={({ id }) => navigate(`/products/${id}`)}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#faf9f5' },
          }}
        />
      </Box>
    </Stack>
  )
}
