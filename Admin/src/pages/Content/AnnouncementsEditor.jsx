import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, IconButton, Snackbar, Stack, Switch, TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { get, put } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

function newAnnouncement() {
  return { message: '', ctaLabel: '', ctaCustomHref: '', isActive: true }
}

export default function AnnouncementsEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [rows, setRows] = useState(null)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => get('/admin/announcements').then((body) => body.data),
  })

  if (data && !rows) {
    setRows(data.map((row) => ({ ...row, ctaLabel: row.ctaLabel ?? '', ctaCustomHref: row.ctaCustomHref ?? '' })))
  }

  const save = useMutation({
    mutationFn: (announcements) => put('/admin/announcements', { announcements }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setToast({ severity: 'success', message: 'Saved' })
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  const move = (index, delta) => {
    const next = [...rows]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next)
  }

  if (isPending || !rows) {
    return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Announcement bar</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                rows.map(({ message, ctaLabel, ctaCustomHref, isActive }) => ({
                  message, ctaLabel: ctaLabel || null, ctaCustomHref: ctaCustomHref || null, isActive,
                })),
              )
            }
          >
            {save.isPending ? 'Saving…' : 'Save all'}
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <Card key={index}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', flexGrow: 1 }}>Message {index + 1}</Typography>
                  <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                  <IconButton size="small" onClick={() => move(index, 1)} disabled={index === rows.length - 1}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                  <Switch
                    size="small" checked={row.isActive}
                    onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, isActive: e.target.checked } : r)))}
                  />
                  <IconButton size="small" onClick={() => setRows(rows.filter((_, i) => i !== index))}><DeleteIcon fontSize="inherit" /></IconButton>
                </Stack>
                <TextField
                  label="Message" size="small" value={row.message}
                  onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, message: e.target.value } : r)))}
                  fullWidth
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="CTA label (optional)" size="small" value={row.ctaLabel} sx={{ flex: 1 }}
                    onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, ctaLabel: e.target.value } : r)))}
                  />
                  <TextField
                    label="CTA link (optional)" size="small" value={row.ctaCustomHref} sx={{ flex: 1 }}
                    onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, ctaCustomHref: e.target.value } : r)))}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {can('manager') && (
        <Button startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, newAnnouncement()])}>
          Add message
        </Button>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
