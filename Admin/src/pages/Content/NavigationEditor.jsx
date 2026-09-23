import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'
import SingleImagePicker from '../../components/MediaPicker/SingleImagePicker'

// Mirrors ALLOWED_CHILD_KINDS in Backend/src/services/adminNavService.js - shown here so
// the "Add" button only ever offers a kind the server will actually accept, rather than
// letting someone pick one and then explaining why it bounced.
const ALLOWED_CHILD_KINDS = { root: ['group', 'link'], group: ['column', 'link'], column: ['link'], link: [] }

const EMPTY_DRAFT = {
  label: '', layout: 'list', targetType: 'none', targetId: '', customHref: '',
  mediaId: null, url: null, seed: '', highlight: false, allLabel: '', allHref: '', isActive: true,
}

function TargetFields({ draft, setDraft, targets, fieldError }) {
  const options = targets?.[draft.targetType] ?? []
  return (
    <Stack spacing={2}>
      <TextField
        select label="Links to" value={draft.targetType}
        onChange={(e) => setDraft({ ...draft, targetType: e.target.value, targetId: '', customHref: '' })}
      >
        <MenuItem value="none">Nothing (container only)</MenuItem>
        <MenuItem value="collection">A collection</MenuItem>
        <MenuItem value="product">A product</MenuItem>
        <MenuItem value="page">A page</MenuItem>
        <MenuItem value="policy">A policy</MenuItem>
        <MenuItem value="custom">Custom URL</MenuItem>
      </TextField>
      {draft.targetType === 'custom' && (
        <TextField label="URL" value={draft.customHref} onChange={(e) => setDraft({ ...draft, customHref: e.target.value })} fullWidth />
      )}
      {['collection', 'product', 'page', 'policy'].includes(draft.targetType) && (
        <TextField
          select label={`Choose ${draft.targetType}`} value={draft.targetId}
          onChange={(e) => setDraft({ ...draft, targetId: e.target.value })}
          error={Boolean(fieldError('targetId'))} helperText={fieldError('targetId')}
        >
          {options.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
        </TextField>
      )}
    </Stack>
  )
}

function Node({ item, childrenByParent, targets, onMove, onEdit, onAdd, onDelete, siblingIndex, siblingCount, canWrite }) {
  const kids = (childrenByParent.get(item.id) ?? []).slice().sort((a, b) => a.position - b.position)

  return (
    <Box sx={{ pl: item.kind === 'root' ? 0 : 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: item.kind === 'root' ? 600 : 400 }}>{item.label}</Typography>
        <Chip size="small" variant="outlined" label={item.kind} />
        {item.targetType !== 'none' && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            → {item.targetType}{item.customHref ? ` (${item.customHref})` : ''}
          </Typography>
        )}
        {item.highlight && <Chip size="small" color="primary" label="Highlight" />}
        {!item.isActive && <Chip size="small" label="Inactive" />}
        {canWrite && (
          <>
            <IconButton size="small" disabled={siblingIndex === 0} onClick={() => onMove(item.id, 'up')}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
            <IconButton size="small" disabled={siblingIndex === siblingCount - 1} onClick={() => onMove(item.id, 'down')}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
            <IconButton size="small" onClick={() => onEdit(item)}><EditIcon fontSize="inherit" /></IconButton>
            <IconButton size="small" onClick={() => onDelete(item)}><DeleteIcon fontSize="inherit" /></IconButton>
            {ALLOWED_CHILD_KINDS[item.kind]?.map((kind) => (
              <Button key={kind} size="small" startIcon={<AddIcon />} onClick={() => onAdd(item, kind)}>
                Add {kind}
              </Button>
            ))}
          </>
        )}
      </Stack>
      {kids.map((kid, index) => (
        <Node
          key={kid.id} item={kid} childrenByParent={childrenByParent} targets={targets}
          onMove={onMove} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete}
          siblingIndex={index} siblingCount={kids.length} canWrite={canWrite}
        />
      ))}
    </Box>
  )
}

export default function NavigationEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canWrite = can('manager')

  const [editing, setEditing] = useState(null) // {mode: 'edit'|'create', item?, parent?, kind?}
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-nav-items'],
    queryFn: () => get('/admin/nav-items').then((body) => body.data),
  })
  const { data: targets } = useQuery({
    queryKey: ['admin-link-targets'],
    queryFn: () => get('/admin/link-targets').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-nav-items'] })

  const move = useMutation({
    mutationFn: ({ id, direction }) => post(`/admin/nav-items/${id}/move`, { direction }),
    onSuccess: invalidate,
  })

  const save = useMutation({
    mutationFn: (body) =>
      editing.mode === 'edit'
        ? patch(`/admin/nav-items/${editing.item.id}`, body)
        : post('/admin/nav-items', { ...body, kind: editing.kind, parentId: editing.parent?.id ?? null }),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Saved' }); setEditing(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/nav-items/${id}`),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Deleted' }); setConfirmDelete(null) },
    onError: (error) => { setToast({ severity: 'error', message: error.message }); setConfirmDelete(null) },
  })

  const fieldError = (field) => errors.find((d) => d.field === field)?.message

  if (isPending) return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>

  const childrenByParent = new Map()
  const roots = []
  for (const item of data) {
    if (!item.parentId) roots.push(item)
    else {
      const list = childrenByParent.get(item.parentId) ?? []
      list.push(item)
      childrenByParent.set(item.parentId, list)
    }
  }
  roots.sort((a, b) => a.position - b.position)

  const openEdit = (item) => {
    setEditing({ mode: 'edit', item })
    setDraft({
      label: item.label, layout: item.layout ?? 'list', targetType: item.targetType,
      targetId: item.targetId ?? '', customHref: item.customHref ?? '',
      mediaId: item.mediaId, url: null, seed: item.seed ?? '', highlight: item.highlight,
      allLabel: item.allLabel ?? '', allHref: item.allHref ?? '', isActive: item.isActive,
    })
    setErrors([])
  }

  const openAdd = (parent, kind) => {
    setEditing({ mode: 'create', parent, kind })
    setDraft(EMPTY_DRAFT)
    setErrors([])
  }

  const openAddRoot = () => {
    setEditing({ mode: 'create', parent: null, kind: 'root' })
    setDraft(EMPTY_DRAFT)
    setErrors([])
  }

  const kindBeingEdited = editing?.mode === 'edit' ? editing.item.kind : editing?.kind

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Navigation</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {canWrite && <Button variant="contained" startIcon={<AddIcon />} onClick={openAddRoot}>Add top-level item</Button>}
      </Stack>

      <Alert severity="info">
        This is exactly the tree the storefront header renders. A link whose target has
        been unpublished is dropped from the live menu automatically, without needing to
        be removed here.
      </Alert>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
        {roots.map((root, index) => (
          <Node
            key={root.id} item={root} childrenByParent={childrenByParent} targets={targets}
            onMove={(id, direction) => move.mutate({ id, direction })}
            onEdit={openEdit} onAdd={openAdd} onDelete={setConfirmDelete}
            siblingIndex={index} siblingCount={roots.length} canWrite={canWrite}
          />
        ))}
      </Box>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing?.mode === 'edit' ? `Edit ${kindBeingEdited}` : `New ${kindBeingEdited}`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((d) => !d.field) && <Alert severity="error">{errors.find((d) => !d.field).message}</Alert>}
            <TextField
              label="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth
            />

            {kindBeingEdited === 'root' && (
              <TextField select label="Layout" value={draft.layout} onChange={(e) => setDraft({ ...draft, layout: e.target.value })}>
                <MenuItem value="list">List (simple dropdown)</MenuItem>
                <MenuItem value="link">Link (no dropdown)</MenuItem>
                <MenuItem value="flyout">Flyout (one panel of links)</MenuItem>
                <MenuItem value="mega">Mega (columns of links)</MenuItem>
              </TextField>
            )}

            {kindBeingEdited !== 'column' && <TargetFields draft={draft} setDraft={setDraft} targets={targets} fieldError={fieldError} />}

            {(kindBeingEdited === 'root' || kindBeingEdited === 'group') && (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Image (optional)</Typography>
                <SingleImagePicker mediaId={draft.mediaId} url={draft.url} onChange={({ mediaId, url }) => setDraft({ ...draft, mediaId, url })} />
              </Box>
            )}

            {kindBeingEdited === 'root' && (
              <Stack direction="row" spacing={2}>
                <TextField label='"View all" label' value={draft.allLabel} onChange={(e) => setDraft({ ...draft, allLabel: e.target.value })} sx={{ flex: 1 }} />
                <TextField label='"View all" link' value={draft.allHref} onChange={(e) => setDraft({ ...draft, allHref: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
            )}

            {kindBeingEdited === 'link' && (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 14 }}>Highlight (e.g. "Sale")</Typography>
                <Switch checked={draft.highlight} onChange={(e) => setDraft({ ...draft, highlight: e.target.checked })} />
              </Stack>
            )}

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
            onClick={() => save.mutate({
              label: draft.label,
              layout: kindBeingEdited === 'root' ? draft.layout : null,
              targetType: draft.targetType,
              targetId: draft.targetId || null,
              customHref: draft.customHref || null,
              mediaId: draft.mediaId,
              seed: draft.seed || null,
              highlight: draft.highlight,
              allLabel: draft.allLabel || null,
              allHref: draft.allHref || null,
              isActive: draft.isActive,
            })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.label}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            This removes everything nested underneath it too. Cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate(confirmDelete.id)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
