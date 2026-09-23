import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { get, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const money = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export default function CustomerList() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 })

  const params = {
    page: pagination.page + 1,
    perPage: pagination.pageSize,
    ...(search ? { q: search } : {}),
  }

  const { data, isFetching } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => get('/admin/customers', { params }),
    placeholderData: (previous) => previous,
  })

  const block = useMutation({
    mutationFn: ({ id, blocked }) => post(`/admin/customers/${id}/block`, { blocked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Customer',
        flex: 1,
        minWidth: 200,
        valueGetter: (value, row) =>
          [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
      },
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
      { field: 'orderCount', headerName: 'Orders', width: 90 },
      {
        field: 'lifetimeValue',
        headerName: 'Lifetime value',
        width: 140,
        renderCell: ({ value }) => money.format(value ?? 0),
      },
      {
        field: 'isRegistered',
        headerName: 'Account',
        width: 120,
        // A guest who ordered has a customer row but has never signed in. Worth showing:
        // it is the difference between a lead and a registered customer.
        renderCell: ({ value }) => (
          <Chip size="small" label={value ? 'Registered' : 'Guest'} variant="outlined" />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: ({ value }) => (
          <Chip
            size="small"
            label={value}
            color={value === 'blocked' ? 'error' : 'success'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
        renderCell: ({ row }) =>
          can('manager') ? (
            <Button
              size="small"
              color={row.status === 'blocked' ? 'primary' : 'error'}
              onClick={() => block.mutate({ id: row.id, blocked: row.status !== 'blocked' })}
            >
              {row.status === 'blocked' ? 'Unblock' : 'Block'}
            </Button>
          ) : null,
      },
    ],
    [can, block],
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <TextField
          placeholder="Search name or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPagination((current) => ({ ...current, page: 0 }))
          }}
          sx={{ width: 300 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {data?.meta?.total ?? 0} customer(s)
        </Typography>
      </Stack>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
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
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#faf9f5' } }}
        />
      </Box>

      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        Blocking a customer also ends any session they have open — without that they would
        stay signed in until their refresh token expired, up to 30 days later.
      </Typography>
    </Stack>
  )
}
