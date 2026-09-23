import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Divider, IconButton, Snackbar, Stack, TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { get, put } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

function newLink() {
  return { label: '', customHref: '' }
}
function newGroup() {
  return { title: '', links: [newLink()] }
}

export default function FooterEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [groups, setGroups] = useState(null)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-footer'],
    queryFn: () => get('/admin/footer').then((body) => body.data),
  })

  if (data && !groups) {
    setGroups(data.map((group) => ({
      title: group.title,
      links: (group.links ?? []).map((link) => ({ label: link.label, customHref: link.customHref ?? '' })),
    })))
  }

  const save = useMutation({
    mutationFn: (body) => put('/admin/footer', { groups: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-footer'] })
      setToast({ severity: 'success', message: 'Saved' })
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  if (isPending || !groups) {
    return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
  }

  const updateGroup = (index, patch) => setGroups(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  const updateLink = (groupIndex, linkIndex, patch) =>
    setGroups(groups.map((g, gi) => (gi !== groupIndex ? g : {
      ...g,
      links: g.links.map((l, li) => (li === linkIndex ? { ...l, ...patch } : l)),
    })))

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Footer</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate(groups)}>
            {save.isPending ? 'Saving…' : 'Save all'}
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1.5}>
        {groups.map((group, groupIndex) => (
          <Card key={groupIndex}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <TextField
                    label="Group title" size="small" value={group.title} sx={{ flexGrow: 1 }}
                    onChange={(e) => updateGroup(groupIndex, { title: e.target.value })}
                  />
                  <IconButton size="small" onClick={() => setGroups(groups.filter((_, i) => i !== groupIndex))}>
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Stack>
                <Divider />
                {group.links.map((link, linkIndex) => (
                  <Stack key={linkIndex} direction="row" spacing={1.5} sx={{ alignItems: 'center', pl: 2 }}>
                    <TextField
                      label="Label" size="small" value={link.label} sx={{ flex: 1 }}
                      onChange={(e) => updateLink(groupIndex, linkIndex, { label: e.target.value })}
                    />
                    <TextField
                      label="Link" size="small" value={link.customHref} sx={{ flex: 1 }}
                      onChange={(e) => updateLink(groupIndex, linkIndex, { customHref: e.target.value })}
                    />
                    <IconButton
                      size="small"
                      onClick={() => updateGroup(groupIndex, { links: group.links.filter((_, i) => i !== linkIndex) })}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  size="small" sx={{ alignSelf: 'flex-start', ml: 2 }}
                  onClick={() => updateGroup(groupIndex, { links: [...group.links, newLink()] })}
                >
                  Add link
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {can('manager') && (
        <Button startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }} onClick={() => setGroups([...groups, newGroup()])}>
          Add group
        </Button>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
