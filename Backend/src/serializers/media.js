import { storage } from '../lib/storage/index.js'

// The storefront consumes a plain URL string wherever an image goes, and ImagePlaceholder
// already renders its tinted tile whenever that value is null. So the only job here is
// "give me a string or null" - which is why turning images on required no component change.

export const DEFAULT_VARIANT = 'md'

export function mediaUrl(asset, label = DEFAULT_VARIANT) {
  if (!asset) return null

  const variant = asset.variants?.find((candidate) => candidate.label === label)
  return storage.url(variant?.key ?? asset.key)
}

// The full payload, for the admin media library and anywhere the client picks a size.
export function serializeMedia(asset) {
  if (!asset) return null

  const urls = { original: storage.url(asset.key) }
  for (const variant of asset.variants ?? []) {
    urls[variant.label] = storage.url(variant.key)
  }

  return {
    id: asset.id,
    alt: asset.altText ?? null,
    url: urls[DEFAULT_VARIANT] ?? urls.original,
    urls,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    mime: asset.mime,
    folder: asset.folder,
    createdAt: asset.createdAt,
  }
}
