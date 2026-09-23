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

// The endpoint replaces the whole list in one call - there is no per-FAQ id to PATCH -
// so this edits a local working copy and saves it all at once, same as the storefront
// question the plan poses for any "replace" resource with no identity of its own.
function newFaq() {
  return { key: `faq-${Date.now()}`, question: '', answer: '', isPublished: true }
}

export default function FaqsEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [rows, setRows] = useState(null)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: () => get('/admin/faqs').then((body) => body.data),
  })

  if (data && !rows) setRows(data.map((row) => ({ ...row })))

  const save = useMutation({
    mutationFn: (faqs) => put('/admin/faqs', { faqs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] })
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
        <Typography variant="h2">FAQs</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() => save.mutate(rows.map(({ key, question, answer, isPublished }) => ({ key, question, answer, isPublished })))}
          >
            {save.isPending ? 'Saving…' : 'Save all'}
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <Card key={row.key}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', flexGrow: 1 }}>FAQ {index + 1}</Typography>
                  <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                  <IconButton size="small" onClick={() => move(index, 1)} disabled={index === rows.length - 1}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                  <Switch
                    size="small" checked={row.isPublished}
                    onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, isPublished: e.target.checked } : r)))}
                  />
                  <IconButton size="small" onClick={() => setRows(rows.filter((_, i) => i !== index))}><DeleteIcon fontSize="inherit" /></IconButton>
                </Stack>
                <TextField
                  label="Question" size="small" value={row.question}
                  onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, question: e.target.value } : r)))}
                  fullWidth
                />
                <TextField
                  label="Answer" size="small" multiline minRows={2} value={row.answer}
                  onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, answer: e.target.value } : r)))}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {can('manager') && (
        <Button startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, newFaq()])}>
          Add FAQ
        </Button>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
