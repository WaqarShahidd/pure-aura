import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const EMPTY = { email: '', name: '', password: '', role: 'staff', isActive: true }

export default function UserSettings() {
  const queryClient = useQueryClient()
  const { can, admin } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-admin-users'],
    queryFn: () => get('/admin/admin-users').then((body) => body.data),
    enabled: can('owner'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-admin-users'] })

  const save = useMutation({
    mutationFn: (body) => (editing?.id ? patch(`/admin/admin-users/${editing.id}`, body) : post('/admin/admin-users', body)),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Saved' }); setEditing(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/admin-users/${id}`),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Removed' }); setConfirmDelete(null) },
    onError: (error) => { setToast({ severity: 'error', message: error.message }); setConfirmDelete(null) },
  })

  const fieldError = (field) => errors.find((d) => d.field === field)?.message

  if (!can('owner')) {
    return <Alert severity="info">Only an owner can manage admin accounts.</Alert>
  }

  if (isPending) return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h3">Admin users</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditing({}); setDraft(EMPTY); setErrors([]) }}>Add</Button>
      </Stack>

      <Stack spacing={1.5}>
        {data.map((user) => (
          <Card key={user.id}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{user.email}</Typography>
              </Box>
              {user.id === admin?.id && <Chip size="small" label="You" />}
              <Chip size="small" label={user.role} color={user.role === 'owner' ? 'primary' : 'default'} />
              {!user.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
              <IconButton size="small" onClick={() => {
                setEditing(user)
                setDraft({ email: user.email, name: user.name, password: '', role: user.role, isActive: user.isActive })
                setErrors([])
              }}>
                <EditIcon fontSize="small" />
              </IconButton>
              {user.id !== admin?.id && (
                <IconButton size="small" onClick={() => setConfirmDelete(user)}><DeleteIcon fontSize="small" /></IconButton>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit admin user' : 'New admin user'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((d) => !d.field) && <Alert severity="error">{errors.find((d) => !d.field).message}</Alert>}
            <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={Boolean(fieldError('name'))} helperText={fieldError('name')} fullWidth />
            <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} error={Boolean(fieldError('email'))} helperText={fieldError('email')} fullWidth />
            <TextField
              label={editing?.id ? 'New password (leave blank to keep current)' : 'Password'} type="password"
              value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              error={Boolean(fieldError('password'))} helperText={fieldError('password')} fullWidth
            />
            <TextField select label="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="owner">Owner</MenuItem>
            </TextField>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained" disabled={save.isPending}
            onClick={() => {
              const body = { ...draft }
              if (!body.password) delete body.password
              save.mutate(body)
            }}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Remove "{confirmDelete?.name}"?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>They will lose access immediately.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate(confirmDelete.id)}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
