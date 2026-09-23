import models from '../db/models/index.js'
import { conflict, notFound } from '../lib/errors.js'

const { Facet, FacetValue, ProductFacetValue, QuizAnswer, QuizQuestion } = models

function serializeFacetValue(value) {
  return {
    id: value.id,
    facetId: value.facetId,
    value: value.value,
    label: value.label,
    swatchHex: value.swatchHex,
    position: value.position,
    isActive: value.isActive,
  }
}

function serializeFacet(facet) {
  return {
    id: facet.id,
    key: facet.key,
    label: facet.label,
    fieldKey: facet.fieldKey,
    type: facet.type,
    swatchField: facet.swatchField,
    cardinality: facet.cardinality,
    position: facet.position,
    isActive: facet.isActive,
    isSystem: facet.isSystem,
    values: (facet.values ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(serializeFacetValue),
  }
}

export async function listFacets() {
  const rows = await Facet.findAll({
    include: [{ association: 'values' }],
    order: [['position', 'ASC']],
  })
  return rows.map(serializeFacet)
}

async function loadFacet(id) {
  const facet = await Facet.findByPk(id, { include: [{ association: 'values' }] })
  if (!facet) throw notFound('No such facet')
  return facet
}

export async function getFacet(id) {
  return serializeFacet(await loadFacet(id))
}

export async function createFacet(payload) {
  const facet = await Facet.create({ ...payload, isSystem: false })
  return getFacet(facet.id)
}

export async function updateFacet(id, payload) {
  const facet = await loadFacet(id)
  const before = serializeFacet(facet)
  // key, fieldKey, type and cardinality are load-bearing for the system facets
  // (filters.js and the quiz both key off them) - a system facet may be renamed or
  // toggled off, but not restructured into something the storefront's hardcoded lookups
  // no longer recognise.
  const { key, fieldKey, type, cardinality, ...editable } = payload
  await facet.update(facet.isSystem ? editable : payload)
  const after = await getFacet(id)
  return { before, after }
}

export async function deleteFacet(id) {
  const facet = await loadFacet(id)
  if (facet.isSystem) {
    throw conflict('FACET_IS_SYSTEM', 'This facet powers the storefront filters and cannot be removed')
  }

  const questions = await QuizQuestion.findAll({ where: { facetId: id }, attributes: ['prompt'] })
  if (questions.length > 0) {
    throw conflict(
      'FACET_IN_USE',
      `Used by the quiz question "${questions[0].prompt}"${questions.length > 1 ? ` and ${questions.length - 1} more` : ''}`,
    )
  }

  await facet.destroy()
}

export async function createFacetValue(facetId, payload) {
  const facet = await loadFacet(facetId)
  const value = await FacetValue.create({ ...payload, facetId: facet.id })
  return serializeFacetValue(value)
}

async function loadFacetValue(id) {
  const value = await FacetValue.findByPk(id)
  if (!value) throw notFound('No such facet value')
  return value
}

export async function updateFacetValue(id, payload) {
  const value = await loadFacetValue(id)
  await value.update(payload)
  return serializeFacetValue(value)
}

// The RESTRICT the plan calls the whole answer to "admin edits a vocabulary and the quiz
// breaks": named here as which question, not just "in use", so the admin knows what to
// fix rather than only that something failed.
export async function deleteFacetValue(id) {
  const value = await loadFacetValue(id)

  const productCount = await ProductFacetValue.count({ where: { facetValueId: id } })
  if (productCount > 0) {
    throw conflict(
      'FACET_VALUE_IN_USE',
      `${productCount} product${productCount === 1 ? '' : 's'} still tagged with this value`,
    )
  }

  const answers = await QuizAnswer.findAll({
    include: [
      { association: 'facetValues', where: { id }, attributes: [], through: { attributes: [] } },
      { association: 'question', attributes: ['prompt'] },
    ],
  })
  if (answers.length > 0) {
    throw conflict('FACET_VALUE_IN_USE', `Used by the quiz question "${answers[0].question.prompt}"`)
  }

  await value.destroy()
}
