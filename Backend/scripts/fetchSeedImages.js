#!/usr/bin/env node
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { products } from '../seed/data/products.js'
import { collections } from '../seed/data/collections.js'
import { logger } from '../src/lib/logger.js'

// Downloads the photography the seed needs, once, and caches it under seed/assets/ so
// every later run is offline and reproducible.
//
// Source is loremflickr: real Flickr photographs, keyword-addressable, no API key. The
// `lock` parameter is what makes this a seed rather than a lucky dip - the same lock
// always returns the same photograph, so re-seeding produces identical data.
//
// If the network is unavailable the script does NOT fail. It generates an on-brand tile
// with sharp instead, so `npm run seed` always works; you just get illustration rather
// than photography. Both paths produce real image files that go through the real upload
// pipeline, so nothing downstream can tell the difference.

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, '..', 'seed', 'assets')

const WIDTH = 1200
const HEIGHT = 1500

// SINGLE keywords only, deliberately.
//
// loremflickr treats comma-separated tags as AND, and when the combination matches
// nothing it quietly serves one generic fallback image instead of failing. A first pass
// using 'serum,skincare,bottle' and friends produced 128 files containing 25 distinct
// images - 94 of them identical - which the media dedupe then collapsed into 17 assets.
// Every one of these was verified to return four distinct photos for four distinct locks.
const KEYWORDS = {
  Serums: 'skincare',
  Cleansers: 'skincare',
  Toners: 'cosmetics',
  Moisturisers: 'lotion',
  Makeup: 'makeup',
  Body: 'spa',
  collection: 'cosmetics',
  hero: 'beauty',
  routine: 'spa',
  promo: 'perfume',
  category: 'skincare',
}

// Brand palette, for the offline fallback only.
const TINTS = ['#eef1e7', '#dfe4d3', '#faf9f5', '#5c6152', '#e2733a']

function hashOf(seed) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973
  }
  return hash
}

// Every image the seed needs, with a stable key and a stable lock.
export function buildManifest() {
  const entries = []

  for (const product of products) {
    for (let angle = 0; angle < 3; angle += 1) {
      entries.push({
        key: `product-${product.handle}-${angle}`,
        keywords: KEYWORDS[product.category] ?? KEYWORDS.category,
        lock: hashOf(`${product.handle}:${angle}`),
        alt: `${product.title} (${angle + 1})`,
      })
    }
  }

  for (const collection of collections) {
    entries.push({
      key: `collection-${collection.handle}`,
      keywords: KEYWORDS.collection,
      lock: hashOf(`collection:${collection.handle}`),
      alt: collection.title,
    })
  }

  for (const category of ['Serums', 'Cleansers', 'Toners', 'Moisturisers', 'Makeup', 'Body']) {
    entries.push({
      key: `category-${category.toLowerCase()}`,
      keywords: KEYWORDS[category],
      lock: hashOf(`category:${category}`),
      alt: category,
    })
  }

  entries.push(
    { key: 'hero-1', keywords: KEYWORDS.hero, lock: hashOf('hero:1'), alt: 'Your skin. Glowing.' },
    { key: 'hero-2', keywords: KEYWORDS.hero, lock: hashOf('hero:2'), alt: 'Smooth skin. Effortlessly' },
    { key: 'routine-1', keywords: KEYWORDS.routine, lock: hashOf('routine:1'), alt: 'Cleansers' },
    { key: 'routine-2', keywords: KEYWORDS.routine, lock: hashOf('routine:2'), alt: 'Serums' },
    { key: 'routine-3', keywords: KEYWORDS.routine, lock: hashOf('routine:3'), alt: 'Toners' },
    { key: 'promo-tile', keywords: KEYWORDS.promo, lock: hashOf('promo'), alt: 'Puff Official' },
  )

  // Taken from the `seed` values in megaMenu.data.js rather than guessed - those strings
  // are what the mega-menu columns actually key their tint off today.
  const MENU_COLUMNS = [
    'dry-skin', 'oily-skin', 'sensitive-skin',
    'dullness', 'breakouts', 'fine-lines',
    'hyaluronic', 'vitamin-c', 'niacinamide',
    'best-sellers', 'new-arrivals', 'gift-sets',
  ]

  for (const column of MENU_COLUMNS) {
    entries.push({
      key: `menu-${column}`,
      keywords: KEYWORDS.category,
      lock: hashOf(`menu:${column}`),
      alt: column.replace(/-/g, ' '),
    })
  }

  // Hash collisions are rare but not impossible, and two products showing the identical
  // photograph reads as a bug rather than as a coincidence. Nudge duplicates apart, which
  // stays deterministic because the manifest order is.
  const seen = new Set()
  for (const entry of entries) {
    while (seen.has(entry.lock)) entry.lock += 1
    seen.add(entry.lock)
  }

  return entries
}

async function alreadyCached(path) {
  try {
    const info = await stat(path)
    // A truncated download leaves a tiny file behind; treat that as a cache miss rather
    // than seeding a broken image.
    return info.size > 4096
  } catch {
    return false
  }
}

async function download(entry) {
  const url = `https://loremflickr.com/${WIDTH}/${HEIGHT}/${entry.keywords}?lock=${entry.lock}`
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000), redirect: 'follow' })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 4096) throw new Error(`suspiciously small response (${buffer.length}b)`)

  // Re-encode through sharp rather than trusting the bytes: it validates the image is
  // decodable and strips any EXIF the source carried.
  return sharp(buffer).jpeg({ quality: 88 }).toBuffer()
}

// The offline path. Not a photograph, but on-brand and deterministic.
async function generate(entry) {
  const hash = hashOf(entry.key)
  const from = TINTS[hash % TINTS.length]
  const to = TINTS[(hash + 2) % TINTS.length]
  const label = entry.alt.replace(/[<>&]/g, '')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
    <circle cx="${WIDTH / 2}" cy="${HEIGHT * 0.42}" r="${WIDTH * 0.22}" fill="#ffffff" opacity="0.18"/>
    <text x="50%" y="${HEIGHT * 0.78}" text-anchor="middle" font-family="Georgia, serif"
          font-style="italic" font-size="64" fill="#1a1a1a" opacity="0.72">${label}</text>
  </svg>`

  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()
}

export async function fetchSeedImages({ force = false } = {}) {
  await mkdir(assetsDir, { recursive: true })

  const manifest = buildManifest()
  const attribution = []
  let downloaded = 0
  let cached = 0
  let generated = 0

  for (const entry of manifest) {
    const path = join(assetsDir, `${entry.key}.jpg`)

    if (!force && (await alreadyCached(path))) {
      cached += 1
      attribution.push(`- ${entry.key}.jpg - cached`)
      continue
    }

    try {
      const buffer = await download(entry)
      await writeFile(path, buffer)
      downloaded += 1
      attribution.push(
        `- ${entry.key}.jpg - loremflickr.com/${entry.keywords}?lock=${entry.lock} (Flickr, CC)`,
      )
    } catch (error) {
      const buffer = await generate(entry)
      await writeFile(path, buffer)
      generated += 1
      attribution.push(`- ${entry.key}.jpg - generated locally (${error.message})`)
    }
  }

  await writeFile(
    join(assetsDir, 'ATTRIBUTION.md'),
    [
      '# Seed image attribution',
      '',
      'Photographs are fetched from loremflickr.com, which serves Creative Commons images',
      'from Flickr. They are placeholders for development and demos - replace them with',
      'licensed product photography before this shop goes live.',
      '',
      'Entries marked "generated locally" are drawn from the brand palette by sharp,',
      'which is what happens when the network is unavailable.',
      '',
      ...attribution,
      '',
    ].join('\n'),
  )

  logger.info(
    { downloaded, cached, generated, total: manifest.length },
    'seed images ready',
  )

  return { downloaded, cached, generated, total: manifest.length, dir: assetsDir }
}

export async function seedImageCount() {
  try {
    const files = await readdir(assetsDir)
    return files.filter((name) => name.endsWith('.jpg')).length
  } catch {
    return 0
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchSeedImages({ force: process.argv.includes('--force') })
    .then((result) => {
      console.log(
        `${result.total} images ready in ${result.dir}\n` +
          `  downloaded ${result.downloaded} | cached ${result.cached} | generated ${result.generated}`,
      )
      process.exit(0)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
