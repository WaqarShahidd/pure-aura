import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Chip, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { get } from '../../lib/api'
import { statusLabel, STATUS_COLOR, paymentStatusLabel, PAYMENT_STATUS_COLOR } from '../../lib/orderStatus'

const money = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// Saved views are just a status/paymentStatus filter each - the same comma-separated
// query param the list endpoint already accepts, not a bespoke endpoint per view.
const VIEWS = [
  { id: 'all', label: 'All orders', params: {} },
  { id: 'awaiting-verification', label: 'Awaiting verification', params: { paymentStatus: 'awaiting_verification' } },
  { id: 'ready-to-hand-over', label: 'Ready to hand over', params: { status: 'packed' } },
  { id: 'in-transit', label: 'In transit', params: { status: 'in_transit' } },
]

export default function OrderList() {
  const navigate = useNavigate()
  const [view, setView] = useState('all')
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 })

  const params = {
    page: pagination.page + 1,
    perPage: pagination.pageSize,
    ...VIEWS.find((candidate) => candidate.id === view).params,
    ...(search ? { q: search } : {}),
  }

  const { data, isFetching } = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => get('/admin/orders', { params }),
    placeholderData: (previous) => previous,
  })

  const columns = useMemo(
    () => [
      { field: 'number', headerName: 'Order', width: 110 },
      {
        field: 'placedOn',
        headerName: 'Placed',
        width: 130,
        valueGetter: (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'),
      },
      { field: 'customerName', headerName: 'Customer', flex: 1, minWidth: 160 },
      { field: 'itemCount', headerName: 'Items', width: 80 },
      {
        field: 'total',
        headerName: 'Total',
        width: 120,
        renderCell: ({ value }) => money.format(value ?? 0),
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment',
        width: 160,
        renderCell: ({ value }) => (
          <Chip size="small" label={paymentStatusLabel(value)} color={PAYMENT_STATUS_COLOR[value] ?? 'default'} />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 160,
        renderCell: ({ value }) => (
          <Chip size="small" label={statusLabel(value)} color={STATUS_COLOR[value] ?? 'default'} />
        ),
      },
    ],
    [],
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {VIEWS.map((candidate) => (
          <Chip
            key={candidate.id}
            label={candidate.label}
            onClick={() => {
              setView(candidate.id)
              setPagination((current) => ({ ...current, page: 0 }))
            }}
            color={view === candidate.id ? 'primary' : 'default'}
            variant={view === candidate.id ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <TextField
          placeholder="Search order #, email or name"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPagination((current) => ({ ...current, page: 0 }))
          }}
          sx={{ width: 300 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {data?.meta?.total ?? 0} order(s)
        </Typography>
      </Stack>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.number}
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.meta?.total ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={({ row }) => navigate(`/orders/${row.number}`)}
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
