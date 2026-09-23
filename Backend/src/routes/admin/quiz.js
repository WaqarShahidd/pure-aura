import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminQuizService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const questionSchema = z.object({
  key: z.string().min(1, 'Required'),
  prompt: z.string().min(1, 'Required'),
  facetId: z.string().uuid('Choose a facet'),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

const answerSchema = z.object({
  label: z.string().min(1, 'Required'),
  position: z.number().int().default(0),
  facetValueIds: z.array(z.string().uuid()).optional(),
})

router.get(
  '/quiz/questions',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listQuestions() })
  }),
)

router.post(
  '/quiz/questions',
  requireRole('manager'),
  validate(questionSchema),
  asyncRoute(async (req, res) => {
    const question = await service.createQuestion(req.body)
    await auditFrom(req)({
      action: 'quiz_question.create',
      entityType: 'quiz_question',
      entityId: question.id,
      after: question,
    })
    res.status(201).json({ data: question })
  }),
)

router.patch(
  '/quiz/questions/:id',
  requireRole('manager'),
  validate(questionSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateQuestion(req.params.id, req.body)
    await auditFrom(req)({
      action: 'quiz_question.update',
      entityType: 'quiz_question',
      entityId: req.params.id,
      before,
      after,
    })
    res.json({ data: after })
  }),
)

router.delete(
  '/quiz/questions/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getQuestion(req.params.id)
    await service.deleteQuestion(req.params.id)
    await auditFrom(req)({
      action: 'quiz_question.delete',
      entityType: 'quiz_question',
      entityId: req.params.id,
      before,
    })
    res.status(204).end()
  }),
)

router.post(
  '/quiz/questions/:id/answers',
  requireRole('manager'),
  validate(answerSchema),
  asyncRoute(async (req, res) => {
    const question = await service.createAnswer(req.params.id, req.body)
    await auditFrom(req)({
      action: 'quiz_answer.create',
      entityType: 'quiz_question',
      entityId: req.params.id,
      after: question,
    })
    res.status(201).json({ data: question })
  }),
)

router.patch(
  '/quiz/questions/:id/answers/:answerId',
  requireRole('manager'),
  validate(answerSchema.partial()),
  asyncRoute(async (req, res) => {
    const question = await service.updateAnswer(req.params.id, req.params.answerId, req.body)
    await auditFrom(req)({
      action: 'quiz_answer.update',
      entityType: 'quiz_question',
      entityId: req.params.id,
      after: question,
    })
    res.json({ data: question })
  }),
)

router.delete(
  '/quiz/questions/:id/answers/:answerId',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const question = await service.deleteAnswer(req.params.id, req.params.answerId)
    await auditFrom(req)({
      action: 'quiz_answer.delete',
      entityType: 'quiz_question',
      entityId: req.params.id,
      after: question,
    })
    res.json({ data: question })
  }),
)

export default router
