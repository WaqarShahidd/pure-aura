import { Router } from 'express'
import multer from 'multer'
import { Op } from 'sequelize'
import { z } from 'zod'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { serializeMedia } from '../../serializers/media.js'
import { deleteMedia, uploadMedia } from '../../services/mediaService.js'
import { auditFrom } from '../../services/auditService.js'
import { storage } from '../../lib/storage/index.js'
import { conflict, notFound } from '../../lib/errors.js'

const { MediaAsset, ProductImage, Product, Collection, Category } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// Memory storage, not disk: the pipeline needs the bytes in hand to sniff the magic
// number and generate variants, and writing a temp file first just adds cleanup nobody
// remembers to do when an upload fails.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
})

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(48),
  folder: z.string().optional(),
  q: z.string().optional(),
})

router.get(
  '/',
  validate(listQuery, 'query'),
  asyncRoute(async (req, res) => {
    const { page, perPage, folder, q } = req.query
    const where = { visibility: 'public' }
    if (folder) where.folder = folder
    if (q) where.originalFilename = { [Op.iLike]: `%${q}%` }

    const { rows, count } = await MediaAsset.findAndCountAll({
      where,
      include: [{ association: 'variants' }],
      order: [['createdAt', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
      distinct: true,
    })

    res.json({
      data: rows.map(serializeMedia),
      meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) },
    })
  }),
)

router.post(
  '/',
  requireRole('manager'),
  upload.single('file'),
  asyncRoute(async (req, res) => {
    const { asset, deduped } = await uploadMedia({
      buffer: req.file?.buffer,
      filename: req.file?.originalname,
      altText: req.body?.altText || null,
      folder: req.body?.folder || 'general',
      createdBy: req.admin.id,
    })

    if (!deduped) {
      await auditFrom(req)({
        action: 'media.upload',
        entityType: 'media',
        entityId: asset.id,
        after: { key: asset.key, bytes: asset.bytes },
      })
    }

    // 200 rather than 201 when the bytes were already here: nothing was created, and the
    // caller gets the existing asset so the upload still "works" from their side.
    res.status(deduped ? 200 : 201).json({ data: serializeMedia(asset) })
  }),
)

router.patch(
  '/:id',
  requireRole('manager'),
  validate(z.object({ altText: z.string().nullish(), folder: z.string().optional() })),
  asyncRoute(async (req, res) => {
    const asset = await MediaAsset.findByPk(req.params.id, {
      include: [{ association: 'variants' }],
    })
    if (!asset) throw notFound('No such file')

    await asset.update(req.body)
    res.json({ data: serializeMedia(asset) })
  }),
)

// Counts everything pointing at an asset, so the admin can see why a delete is blocked
// rather than just being told no.
async function usageOf(id) {
  const [productImages, primaryImages, collections, categories, variants] = await Promise.all([
    ProductImage.count({ where: { mediaId: id } }),
    Product.count({ where: { primaryImageId: id } }),
    Collection.count({ where: { mediaId: id } }),
    Category.count({ where: { mediaId: id } }),
    models.ProductVariant.count({ where: { mediaId: id } }),
  ])

  return { productImages, primaryImages, collections, categories, variants }
}

router.get(
  '/:id/usage',
  asyncRoute(async (req, res) => {
    res.json({ data: await usageOf(req.params.id) })
  }),
)

router.delete(
  '/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const usage = await usageOf(req.params.id)
    const total = Object.values(usage).reduce((sum, count) => sum + count, 0)

    // product_images references media with ON DELETE RESTRICT, so this would fail at the
    // database anyway - but a 409 naming what still uses the file is a far better answer
    // than a foreign key error.
    if (total > 0) {
      throw conflict('MEDIA_IN_USE', 'That file is still being used', [
        { field: 'media', message: `Used by ${total} item(s)` },
      ])
    }

    const removed = await deleteMedia(req.params.id)
    if (!removed) throw notFound('No such file')

    await auditFrom(req)({
      action: 'media.delete',
      entityType: 'media',
      entityId: req.params.id,
    })

    res.status(204).end()
  }),
)

// Private assets - bank transfer proofs - are never served by the static middleware under
// either storage driver. This is the only way to read one, and it needs an admin session.
router.get(
  '/:id/raw',
  asyncRoute(async (req, res) => {
    const asset = await MediaAsset.findByPk(req.params.id)
    if (!asset) throw notFound('No such file')

    const buffer = await storage.get(asset.key)
    res.setHeader('Content-Type', asset.mime)
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(buffer)
  }),
)

export default router
