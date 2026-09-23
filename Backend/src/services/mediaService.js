import { createHash, randomUUID } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { storage, PRIVATE_PREFIX } from '../lib/storage/index.js'
import { badRequest, unprocessable } from '../lib/errors.js'

const { MediaAsset, MediaVariant } = models

// One pipeline for every image that enters the system, whether it arrives from an admin
// upload, a bank transfer proof, or the seed script. The seed deliberately goes through
// here rather than inserting rows directly, so seeding exercises the same sharp calls,
// the same storage adapter and the same URL construction as production traffic.

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const ALLOWED_DOCUMENT_MIMES = new Set(['application/pdf'])

// 200 / 800 / 1600 wide. The storefront reads `md` everywhere; `lg` is for the PDP
// gallery and `thumb` for admin tables and the cart drawer.
const VARIANTS = [
  { label: 'thumb', width: 200 },
  { label: 'md', width: 800 },
  { label: 'lg', width: 1600 },
]

function keyPrefix(visibility) {
  if (visibility === 'private') return PRIVATE_PREFIX
  return 'uploads'
}

function datePath(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
}

export async function uploadMedia({
  buffer,
  filename,
  altText = null,
  folder = 'general',
  visibility = 'public',
  createdBy = null,
  allowDocuments = false,
  transaction: outerTransaction = null,
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw badRequest('No file was uploaded')
  }

  // Sniff the magic bytes. A client-supplied Content-Type is a claim, not evidence, and
  // trusting it is how an executable gets stored as image/png.
  //
  // A short or corrupted buffer makes the sniffer throw rather than return undefined -
  // that is still just "not a file we recognise", not a server error, so it is folded
  // into the same unprocessable response below instead of reaching the error handler.
  const sniffed = await fileTypeFromBuffer(buffer).catch(() => null)
  const mime = sniffed?.mime

  const isImage = mime && ALLOWED_IMAGE_MIMES.has(mime)
  const isDocument = allowDocuments && mime && ALLOWED_DOCUMENT_MIMES.has(mime)

  if (!isImage && !isDocument) {
    throw unprocessable(
      'UNSUPPORTED_FILE_TYPE',
      allowDocuments
        ? 'Upload a JPG, PNG, WEBP or PDF'
        : 'Upload a JPG, PNG or WEBP image',
      [{ field: 'file', message: `Detected ${mime ?? 'an unrecognised file type'}` }],
    )
  }

  const checksum = createHash('sha256').update(buffer).digest('hex')

  // Identical bytes are the same asset. Re-uploading the same photo should not double the
  // storage bill or leave two rows the admin has to tell apart.
  const existing = await MediaAsset.findOne({
    where: { checksumSha256: checksum },
    include: [{ association: 'variants' }],
    transaction: outerTransaction,
  })
  if (existing) return { asset: existing, deduped: true }

  const id = randomUUID()
  const extension = sniffed.ext
  const baseKey = `${keyPrefix(visibility)}/${datePath()}/${id}`
  const originalKey = `${baseKey}.${extension}`

  let width = null
  let height = null
  const derived = []
  const writtenKeys = []

  if (isImage) {
    // rotate() applies the EXIF orientation and then drops the metadata, which both
    // fixes sideways phone photos and strips any GPS coordinates that came with them.
    const base = sharp(buffer).rotate()
    const metadata = await base.metadata()
    width = metadata.width ?? null
    height = metadata.height ?? null

    for (const variant of VARIANTS) {
      const output = await sharp(buffer)
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true })

      derived.push({
        label: variant.label,
        // A private original (a bank transfer proof) must produce a private thumbnail
        // too. `derived/` is one of the two prefixes served statically to anyone, by key
        // alone - a private asset's variant living there would be an unauthenticated
        // leak of the one thing this visibility flag exists to protect, reachable by
        // anyone who guessed or observed the uuid.
        key:
          visibility === 'private'
            ? `${PRIVATE_PREFIX}/${datePath()}/${id}-${variant.label}.webp`
            : `derived/${datePath()}/${id}-${variant.label}.webp`,
        width: output.info.width,
        height: output.info.height,
        bytes: output.data.length,
        buffer: output.data,
      })
    }
  }

  const transaction = outerTransaction ?? (await sequelize.transaction())

  try {
    await storage.put(originalKey, buffer, { contentType: mime, visibility })
    writtenKeys.push(originalKey)

    for (const variant of derived) {
      await storage.put(variant.key, variant.buffer, { contentType: 'image/webp', visibility })
      writtenKeys.push(variant.key)
    }

    const asset = await MediaAsset.create(
      {
        id,
        key: originalKey,
        originalFilename: filename ?? null,
        mime,
        bytes: buffer.length,
        width,
        height,
        altText,
        checksumSha256: checksum,
        folder,
        visibility,
        createdBy,
      },
      { transaction },
    )

    for (const variant of derived) {
      await MediaVariant.create(
        {
          mediaId: id,
          label: variant.label,
          key: variant.key,
          width: variant.width,
          height: variant.height,
          bytes: variant.bytes,
        },
        { transaction },
      )
    }

    if (!outerTransaction) await transaction.commit()

    const saved = await MediaAsset.findByPk(id, {
      include: [{ association: 'variants' }],
      transaction: outerTransaction,
    })

    return { asset: saved, deduped: false }
  } catch (error) {
    if (!outerTransaction) await transaction.rollback()

    // Storage is not transactional, so anything already written has to be swept up by
    // hand - otherwise a failed upload leaves orphaned files nothing points at.
    await Promise.all(writtenKeys.map((key) => storage.delete(key).catch(() => {})))
    throw error
  }
}

export async function deleteMedia(assetId, { transaction = null } = {}) {
  const asset = await MediaAsset.findByPk(assetId, {
    include: [{ association: 'variants' }],
    transaction,
  })
  if (!asset) return false

  const keys = [asset.key, ...(asset.variants ?? []).map((variant) => variant.key)]
  await asset.destroy({ transaction })
  await Promise.all(keys.map((key) => storage.delete(key).catch(() => {})))

  return true
}
