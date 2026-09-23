import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Snackbar, Stack, Switch, TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const QUESTION_EMPTY = { key: '', prompt: '', facetId: '', position: 0, isActive: true }
const ANSWER_EMPTY = { label: '', position: 0, facetValueIds: [] }

export default function QuizEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [expanded, setExpanded] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [questionDraft, setQuestionDraft] = useState(QUESTION_EMPTY)
  const [editingAnswer, setEditingAnswer] = useState(null) // {questionId, id|null}
  const [answerDraft, setAnswerDraft] = useState(ANSWER_EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // {kind, questionId, id, label}

  const { data: questions, isPending } = useQuery({
    queryKey: ['admin-quiz-questions'],
    queryFn: () => get('/admin/quiz/questions').then((body) => body.data),
  })

  const { data: facets } = useQuery({
    queryKey: ['admin-facets'],
    queryFn: () => get('/admin/facets').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-quiz-questions'] })

  const saveQuestion = useMutation({
    mutationFn: (body) =>
      editingQuestion?.id
        ? patch(`/admin/quiz/questions/${editingQuestion.id}`, body)
        : post('/admin/quiz/questions', body),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Saved' })
      setEditingQuestion(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const saveAnswer = useMutation({
    mutationFn: ({ questionId, id, body }) =>
      id
        ? patch(`/admin/quiz/questions/${questionId}/answers/${id}`, body)
        : post(`/admin/quiz/questions/${questionId}/answers`, body),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Saved' })
      setEditingAnswer(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const removeQuestion = useMutation({
    mutationFn: (id) => del(`/admin/quiz/questions/${id}`),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Deleted' })
      setConfirmDelete(null)
    },
    onError: (error) => {
      setToast({ severity: 'error', message: error.message })
      setConfirmDelete(null)
    },
  })

  const removeAnswer = useMutation({
    mutationFn: ({ questionId, id }) => del(`/admin/quiz/questions/${questionId}/answers/${id}`),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Deleted' })
      setConfirmDelete(null)
    },
    onError: (error) => {
      setToast({ severity: 'error', message: error.message })
      setConfirmDelete(null)
    },
  })

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message

  // Only values from the SAME facet the question is scored against make sense as answer
  // choices - picking a value from an unrelated facet would silently score nothing.
  const valuesFor = (facetId) => facets?.find((facet) => facet.id === facetId)?.values ?? []

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Skin quiz</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingQuestion({})
              setQuestionDraft(QUESTION_EMPTY)
              setErrors([])
            }}
          >
            New question
          </Button>
        )}
      </Stack>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(questions ?? []).map((question) => (
            <Card key={question.id}>
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <IconButton size="small" onClick={() => setExpanded(expanded === question.id ? null : question.id)}>
                    {expanded === question.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{question.prompt}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      Scores against {question.facet?.label ?? '—'} · {question.answers.length} answer{question.answers.length === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  {!question.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
                  {can('manager') && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingQuestion(question)
                          setQuestionDraft({
                            key: question.key, prompt: question.prompt, facetId: question.facetId,
                            position: question.position, isActive: question.isActive,
                          })
                          setErrors([])
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDelete({ kind: 'question', id: question.id, label: question.prompt })}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>

                <Collapse in={expanded === question.id}>
                  <Stack spacing={1} sx={{ mt: 2, pl: 5 }}>
                    {question.answers.map((answer) => (
                      <Stack key={answer.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 13, flexGrow: 1 }}>{answer.label}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          scores {answer.facetValueIds.length} value{answer.facetValueIds.length === 1 ? '' : 's'}
                        </Typography>
                        {can('manager') && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingAnswer({ questionId: question.id, id: answer.id })
                                setAnswerDraft({ label: answer.label, position: answer.position, facetValueIds: answer.facetValueIds })
                                setErrors([])
                              }}
                            >
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setConfirmDelete({ kind: 'answer', questionId: question.id, id: answer.id, label: answer.label })}
                            >
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    ))}
                    {can('manager') && (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        sx={{ alignSelf: 'flex-start', mt: 1 }}
                        onClick={() => {
                          setEditingAnswer({ questionId: question.id, id: null })
                          setAnswerDraft(ANSWER_EMPTY)
                          setErrors([])
                        }}
                      >
                        Add answer
                      </Button>
                    )}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Question dialog */}
      <Dialog open={Boolean(editingQuestion)} onClose={() => setEditingQuestion(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingQuestion?.id ? 'Edit question' : 'New question'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && (
              <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
            )}
            <TextField
              label="Prompt" value={questionDraft.prompt}
              onChange={(event) => setQuestionDraft({ ...questionDraft, prompt: event.target.value })}
              error={Boolean(fieldError('prompt'))} helperText={fieldError('prompt')} fullWidth
            />
            <TextField
              label="Key" value={questionDraft.key}
              onChange={(event) => setQuestionDraft({ ...questionDraft, key: event.target.value })}
              error={Boolean(fieldError('key'))} helperText={fieldError('key')} fullWidth
            />
            <TextField
              select label="Facet this scores" value={questionDraft.facetId}
              onChange={(event) => setQuestionDraft({ ...questionDraft, facetId: event.target.value })}
              error={Boolean(fieldError('facetId'))} helperText={fieldError('facetId')} fullWidth
            >
              {(facets ?? []).map((facet) => (
                <MenuItem key={facet.id} value={facet.id}>{facet.label}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch
                checked={questionDraft.isActive}
                onChange={(event) => setQuestionDraft({ ...questionDraft, isActive: event.target.checked })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingQuestion(null)}>Cancel</Button>
          <Button variant="contained" disabled={saveQuestion.isPending} onClick={() => saveQuestion.mutate(questionDraft)}>
            {saveQuestion.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Answer dialog */}
      <Dialog open={Boolean(editingAnswer)} onClose={() => setEditingAnswer(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAnswer?.id ? 'Edit answer' : 'New answer'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && (
              <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
            )}
            <TextField
              label="Label" value={answerDraft.label}
              onChange={(event) => setAnswerDraft({ ...answerDraft, label: event.target.value })}
              error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth
            />
            <Autocomplete
              multiple
              options={valuesFor(questions?.find((q) => q.id === editingAnswer?.questionId)?.facetId)}
              value={valuesFor(questions?.find((q) => q.id === editingAnswer?.questionId)?.facetId)
                .filter((value) => answerDraft.facetValueIds.includes(value.id))}
              getOptionLabel={(value) => value.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, values) => setAnswerDraft({ ...answerDraft, facetValueIds: values.map((value) => value.id) })}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const { key, ...chipProps } = getItemProps({ index })
                  return <Chip label={option.label} size="small" {...chipProps} key={key} />
                })
              }
              renderInput={(params) => <TextField {...params} label="Scores these facet values" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAnswer(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saveAnswer.isPending}
            onClick={() => saveAnswer.mutate({ questionId: editingAnswer.questionId, id: editingAnswer.id, body: answerDraft })}
          >
            {saveAnswer.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.label}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() =>
              confirmDelete.kind === 'question'
                ? removeQuestion.mutate(confirmDelete.id)
                : removeAnswer.mutate(confirmDelete)
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}
