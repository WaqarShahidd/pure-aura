import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { get } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

function formatDate(value) {
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLog() {
  const { can } = useAuth()
  const [pagination, setPagination] = useState({ page: 0, pageSize: 50 })

  const { data, isFetching } = useQuery({
    queryKey: ['admin-audit-log', pagination],
    queryFn: () => get('/admin/audit-log', { params: { page: pagination.page + 1, perPage: pagination.pageSize } }),
    enabled: can('owner'),
    placeholderData: (previous) => previous,
  })

  const columns = useMemo(
    () => [
      { field: 'createdAt', headerName: 'When', width: 150, renderCell: ({ value }) => formatDate(value) },
      { field: 'action', headerName: 'Action', width: 200 },
      { field: 'entityType', headerName: 'Entity', width: 140 },
      { field: 'entityId', headerName: 'Entity ID', width: 160 },
      { field: 'adminName', headerName: 'By', flex: 1, minWidth: 160, valueGetter: (v, row) => row.admin?.name ?? '—' },
    ],
    [],
  )

  if (!can('owner')) {
    return <Alert severity="info">Only an owner can view the audit log.</Alert>
  }

  return (
    <div>
      <Typography variant="h3" sx={{ mb: 2 }}>Audit log</Typography>
      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.10)', borderRadius: 8 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.meta?.total ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[50, 100]}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#faf9f5' } }}
        />
      </div>
    </div>
  )
}
