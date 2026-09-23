import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { notFound } from '../lib/errors.js'

const { QuizQuestion, QuizAnswer } = models

function serializeAnswer(answer) {
  return {
    id: answer.id,
    label: answer.label,
    position: answer.position,
    facetValueIds: (answer.facetValues ?? []).map((value) => value.id),
  }
}

function serializeQuestion(question) {
  return {
    id: question.id,
    key: question.key,
    prompt: question.prompt,
    facetId: question.facetId,
    facet: question.facet ? { id: question.facet.id, key: question.facet.key, label: question.facet.label } : null,
    position: question.position,
    isActive: question.isActive,
    answers: (question.answers ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(serializeAnswer),
  }
}

const QUESTION_INCLUDE = [
  { association: 'facet' },
  {
    association: 'answers',
    include: [{ association: 'facetValues', through: { attributes: [] } }],
  },
]

export async function listQuestions() {
  const rows = await QuizQuestion.findAll({ include: QUESTION_INCLUDE, order: [['position', 'ASC']] })
  return rows.map(serializeQuestion)
}

async function loadQuestion(id, { transaction } = {}) {
  const question = await QuizQuestion.findByPk(id, { include: QUESTION_INCLUDE, transaction })
  if (!question) throw notFound('No such question')
  return question
}

// `transaction` matters when this is called from inside createAnswer/updateAnswer's own
// transaction, before it commits - the same reason getCollection takes one.
export async function getQuestion(id, { transaction } = {}) {
  return serializeQuestion(await loadQuestion(id, { transaction }))
}

export async function createQuestion(payload) {
  const question = await QuizQuestion.create(payload)
  return getQuestion(question.id)
}

export async function updateQuestion(id, payload) {
  const question = await loadQuestion(id)
  const before = serializeQuestion(question)
  await question.update(payload)
  const after = await getQuestion(id)
  return { before, after }
}

// Answers have no life outside a question - CASCADE handles the row, this just removes
// the parent along with them, same as any other has-many delete in this codebase.
export async function deleteQuestion(id) {
  const question = await loadQuestion(id)
  await question.destroy()
}

export async function createAnswer(questionId, payload) {
  const { facetValueIds, ...fields } = payload
  return sequelize.transaction(async (transaction) => {
    await loadQuestion(questionId, { transaction })
    const answer = await QuizAnswer.create({ ...fields, questionId }, { transaction })
    if (facetValueIds) await answer.setFacetValues(facetValueIds, { transaction })
    return getQuestion(questionId, { transaction })
  })
}

export async function updateAnswer(questionId, answerId, payload) {
  const { facetValueIds, ...fields } = payload
  return sequelize.transaction(async (transaction) => {
    const answer = await QuizAnswer.findOne({ where: { id: answerId, questionId }, transaction })
    if (!answer) throw notFound('No such answer')

    await answer.update(fields, { transaction })
    if (facetValueIds) await answer.setFacetValues(facetValueIds, { transaction })

    return getQuestion(questionId, { transaction })
  })
}

export async function deleteAnswer(questionId, answerId) {
  const answer = await QuizAnswer.findOne({ where: { id: answerId, questionId } })
  if (!answer) throw notFound('No such answer')
  await answer.destroy()
  return getQuestion(questionId)
}
