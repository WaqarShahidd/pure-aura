import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Snackbar, Stack, TextField, Typography } from '@mui/material'
import { get, patch } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const FIELDS = [
  { key: 'site_name', label: 'Site name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'footer_about', label: 'Footer about text', multiline: true },
  { key: 'currency', label: 'Currency' },
  { key: 'free_shipping_threshold', label: 'Free shipping threshold (Rs)', number: true },
  { key: 'reservation_minutes', label: 'Cart reservation window (minutes)', number: true },
]

export default function GeneralSettings() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => get('/admin/settings').then((body) => body.data),
  })

  if (data && !draft) {
    setDraft(Object.fromEntries(FIELDS.map((field) => [field.key, data[field.key] ?? (field.number ? 0 : '')])))
  }

  const save = useMutation({
    mutationFn: async (values) => {
      // Each key is its own row server-side, so a save is one PATCH per changed field.
      await Promise.all(
        FIELDS.map((field) => patch(`/admin/settings/${field.key}`, { value: values[field.key] })),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setToast({ severity: 'success', message: 'Saved' })
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  if (isPending || !draft) return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      {FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          type={field.number ? 'number' : 'text'}
          multiline={field.multiline}
          minRows={field.multiline ? 2 : undefined}
          value={draft[field.key]}
          onChange={(e) => setDraft({ ...draft, [field.key]: field.number ? Number(e.target.value) : e.target.value })}
          disabled={!can('manager')}
          fullWidth
        />
      ))}
      {can('manager') && (
        <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={save.isPending} onClick={() => save.mutate(draft)}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
