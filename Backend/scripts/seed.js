#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import { env, isProduction } from '../src/config/env.js'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { logger } from '../src/lib/logger.js'
import { uploadMedia } from '../src/services/mediaService.js'
import { mediaUrl } from '../src/serializers/media.js'
import { ORDER_NUMBER_START } from '../src/lib/orderNumber.js'
import { fetchSeedImages } from './fetchSeedImages.js'

import { products } from '../seed/data/products.js'
import { collections, featuredCollectionCards } from '../seed/data/collections.js'
import { staticPages, faqs } from '../seed/data/pages.js'
import { site } from '../seed/data/site.js'
import { navigation } from '../seed/data/navigation.js'
import { footerLinkGroups, footerAbout } from '../seed/data/footerLinks.js'
import { homepageSections } from '../seed/data/homepage.js'
import { deriveVariantsFor, parseVariantSummary } from '../seed/data/variants.js'
import { account, addresses as seedAddresses, orders as seedOrders } from '../seed/data/account.js'

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, '..', 'seed', 'assets')

const batchId = randomUUID()
const ledger = []

// Every insert is recorded so unseed can walk the batch backwards. Reversed insertion
// order is automatically foreign-key-safe, which is why no domain table needs an
// is_seed column.
function track(tableName, recordId, mediaKey = null) {
  ledger.push({ batchId, tableName, recordId: String(recordId), mediaKey })
}

// --- facet vocabularies, derived from the catalogue itself ----------------------------
// Deriving rather than hand-listing means the seeded vocabulary and the seeded products
// cannot disagree - a value exists precisely because some product uses it.
const FACET_DEFS = [
  { key: 'availability', label: 'Availability', fieldKey: 'availability', type: 'list', cardinality: 'single', isSystem: true },
  { key: 'price', label: 'Price', fieldKey: 'price', type: 'range', cardinality: 'single', isSystem: true },
  { key: 'tags', label: 'Tags', fieldKey: 'tags', type: 'list', cardinality: 'multi' },
  { key: 'color', label: 'Color', fieldKey: 'color', type: 'swatch', swatchField: 'colorHex', cardinality: 'single' },
  { key: 'brand', label: 'Brand', fieldKey: 'brand', type: 'list', cardinality: 'single' },
  { key: 'skinType', label: 'Skin type', fieldKey: 'skinType', type: 'list', cardinality: 'multi' },
  { key: 'size', label: 'Size', fieldKey: 'size', type: 'list', cardinality: 'multi' },
  { key: 'texture', label: 'Texture', fieldKey: 'texture', type: 'list', cardinality: 'single' },
  { key: 'collection', label: 'Collection Filter', fieldKey: 'collectionFilter', type: 'list', cardinality: 'single' },
  { key: 'ingredient', label: 'Ingredient', fieldKey: 'ingredientFilter', type: 'list', cardinality: 'multi' },
]

const PRICE_RANGES = [
  { key: 'under-7k', label: 'Under Rs 7,000', minAmount: 0, maxAmount: 7000 },
  { key: '7k-14k', label: 'Rs 7,000 - Rs 14,000', minAmount: 7000, maxAmount: 14000 },
  { key: '14k-28k', label: 'Rs 14,000 - Rs 28,000', minAmount: 14000, maxAmount: 28000 },
  // null, not Infinity. JSON.stringify turns Infinity into null anyway, so this is the
  // honest spelling of what the storefront already ships.
  { key: 'over-28k', label: 'Over Rs 28,000', minAmount: 28000, maxAmount: null },
]

const SORT_OPTIONS = [
  { key: 'alpha-asc', label: 'Alphabetically, A-Z', field: 'title', direction: 'asc', isDefault: true },
  { key: 'alpha-desc', label: 'Alphabetically, Z-A', field: 'title', direction: 'desc' },
  { key: 'price-asc', label: 'Price, low to high', field: 'price', direction: 'asc' },
  { key: 'price-desc', label: 'Price, high to low', field: 'price', direction: 'desc' },
  { key: 'best-selling', label: 'Best selling', field: 'review_count', direction: 'desc' },
  { key: 'rating', label: 'Highest rated', field: 'rating', direction: 'desc' },
]

// The quiz, rebuilt from Quiz.jsx.
//
// Note the two distinct ingredient vocabularies, which are easy to conflate: the FACET
// `ingredientFilter` uses 'Aloe Vera' (13 products), while the composition list
// `ingredients[].name` uses 'Aloe Vera Extract'. The quiz scores against the facet, so
// 'Aloe Vera' is correct here. The foreign key from quiz_answer_values to facet_values
// means picking the wrong one fails loudly at seed time instead of silently scoring zero.
const QUIZ = [
  {
    key: 'skinType', prompt: 'How does your skin usually behave?', facetKey: 'skinType',
    answers: [
      { label: 'Tight and flaky', values: ['Dry skin'] },
      { label: 'Shiny by midday', values: ['Oily skin'] },
      { label: 'Reacts to everything', values: ['Sensitive skin'] },
      { label: 'Fairly balanced', values: ['Normal', 'Combination'] },
    ],
  },
  {
    key: 'concern', prompt: 'What would you change first?', facetKey: 'ingredient',
    answers: [
      { label: 'Dullness and uneven tone', values: ['Vitamin C'] },
      { label: 'Dryness and tightness', values: ['Hyaluronic Acid'] },
      { label: 'Redness and irritation', values: ['Aloe Vera'] },
      { label: 'Texture and congestion', values: ['Niacinamide'] },
    ],
  },
  {
    key: 'texture', prompt: 'How should it feel on your skin?', facetKey: 'texture',
    answers: [
      { label: 'Light and fast-absorbing', values: ['Serum', 'Gel'] },
      { label: 'Rich and cushioning', values: ['Cream', 'Balm'] },
      { label: 'Nourishing and slow', values: ['Oil'] },
      { label: 'No preference', values: [] },
    ],
  },
  {
    key: 'routine', prompt: 'How much of a routine do you want?', facetKey: 'collection',
    answers: [
      { label: 'The absolute basics', values: ['Daily Basics'] },
      { label: 'A glow-focused set', values: ['Glow Edit'] },
      { label: 'Something for evenings', values: ['Night Ritual'] },
    ],
  },
]

async function uploadSeedImage(key, altText, folder, transaction) {
  try {
    const buffer = await readFile(join(assetsDir, `${key}.jpg`))
    const { asset, deduped } = await uploadMedia({
      buffer,
      filename: `${key}.jpg`,
      altText,
      folder,
      transaction,
    })

    // Only the FIRST use of an image gets a ledger row. uploadMedia dedupes on checksum,
    // so several products can share one asset - and tracking it once per use would put
    // the same media_assets id into the ledger repeatedly. Unseed walks the ledger
    // backwards, so the latest duplicate would delete the asset while product_images rows
    // from earlier in the batch still pointed at it, failing on a foreign key.
    if (!deduped) {
      track('media_assets', asset.id, asset.key)
      for (const variant of asset.variants ?? []) track('media_variants', variant.id, variant.key)
    }

    return asset
  } catch (error) {
    logger.warn({ key, err: error.message }, 'seed image missing, continuing without it')
    return null
  }
}

async function seed({ skipMedia = false } = {}) {
  if (isProduction && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed a production database without --force')
  }

  if (!skipMedia) await fetchSeedImages()

  const {
    Setting, SocialLink, FeatureFlag, PaymentMethod, DeliveryMethod, Courier, TaxRate,
    Category, Collection, Product, ProductOption, ProductOptionValue, ProductVariant,
    VariantOptionValue, ProductImage, ProductIngredient, CollectionProduct,
    ProductRoutineProduct, Facet, FacetValue, ProductFacetValue, PriceRange, SortOption,
    QuizQuestion, QuizAnswer, QuizAnswerValue, HomepageSection, StaticPage, PageSection,
    Faq, NavItem, FooterLinkGroup, FooterLink, Announcement, AdminUser, Customer, Address,
    Order, OrderItem, OrderStatusEvent, Payment, SeedRecord,
  } = models

  const t = await sequelize.transaction()

  try {
    // --- settings -------------------------------------------------------------------
    const settings = [
      ['site_name', site.name, 'general'],
      ['tagline', site.tagline, 'general'],
      ['footer_about', footerAbout, 'general'],
      ['currency', 'PKR', 'general'],
      ['free_shipping_threshold', 28000, 'cart'],
      ['reservation_minutes', 10, 'cart'],
      // The copy functions in config/cart.js cannot be stored as functions. They become
      // templates with a {placeholder}, filled client-side by utils/template.js.
      ['cart_copy', {
        title: 'Your cart',
        reservation: 'Items in your cart are reserved for {time} minutes!',
        reservationExpired: 'Your reservation has expired, but your items are still here.',
        freeShippingProgress: 'Add {amount} more to get FREE shipping',
        freeShippingReached: 'You have unlocked free shipping.',
        savings: 'You saved {amount}',
        taxNote: 'Taxes and shipping calculated at checkout',
        upsellTitle: 'Pairs well with',
      }, 'cart'],
      // The footer strip is a trust signal and stays as it is; what checkout OFFERS is a
      // separate list driven by payment_methods. Two different questions, two sources.
      ['footer_payment_icons', site.paymentIcons, 'general'],
    ]
    for (const [key, value, group] of settings) {
      await Setting.create({ key, value, group }, { transaction: t })
      track('settings', key)
    }

    for (const [index, social] of site.socials.entries()) {
      const row = await SocialLink.create(
        { label: social.label, iconKey: social.icon, href: social.href, position: index },
        { transaction: t },
      )
      track('social_links', row.id)
    }

    // --- feature flags and payment methods ------------------------------------------
    for (const flag of [
      { key: 'payments.stripe', label: 'Stripe card payments', description: 'Requires STRIPE_SECRET_KEY and a deploy.' },
      { key: 'payments.paypal', label: 'PayPal', description: 'Requires PayPal credentials and a deploy.' },
    ]) {
      await FeatureFlag.create({ ...flag, isEnabled: false }, { transaction: t })
      track('feature_flags', flag.key)
    }

    const paymentMethods = [
      { code: 'cod', label: 'Cash on Delivery', kind: 'offline', isEnabled: true, iconKey: 'cod', position: 0,
        instructions: 'Pay the courier in cash when your order arrives. Please have the exact amount ready.' },
      { code: 'bank_transfer', label: 'Bank Transfer', kind: 'manual_transfer', isEnabled: true, requiresProof: true,
        iconKey: 'bank', position: 1,
        instructions: 'Transfer the total to the account below and upload your receipt. We will confirm within one working day.',
        config: { bankName: 'Meezan Bank', accountTitle: 'Pure Aura', iban: 'PK36MEZN0001234567890123' } },
      { code: 'card', label: 'Credit or Debit Card', kind: 'gateway', isEnabled: false, iconKey: 'visa',
        featureFlagKey: 'payments.stripe', position: 2 },
      { code: 'paypal', label: 'PayPal', kind: 'gateway', isEnabled: false, iconKey: 'paypal',
        featureFlagKey: 'payments.paypal', position: 3 },
      { code: 'stripe', label: 'Stripe', kind: 'gateway', isEnabled: false, iconKey: 'mastercard',
        featureFlagKey: 'payments.stripe', position: 4 },
    ]
    const paymentMethodByCode = {}
    for (const method of paymentMethods) {
      const row = await PaymentMethod.create({ ...method, isDeletable: false }, { transaction: t })
      paymentMethodByCode[method.code] = row
      track('payment_methods', row.id)
    }

    // --- delivery, couriers, tax ----------------------------------------------------
    const deliveryMethods = [
      { code: 'standard', label: 'Standard', detail: '3-5 working days', priceAmount: 1700,
        freeOverAmount: 28000, etaMinDays: 3, etaMaxDays: 5, position: 0 },
      // 2500, not 14. config/checkout.js carries price: 14.0 - an unconverted USD value
      // that renders as "Rs 14", cheaper than standard. The integer column makes it
      // unrepresentable now; this is a placeholder for the real figure.
      { code: 'express', label: 'Express', detail: 'Next working day if ordered before 2pm',
        priceAmount: 2500, etaMinDays: 1, etaMaxDays: 1, position: 1 },
      { code: 'pickup', label: 'Collect in store', detail: 'Ready at Head Office in 24 hours',
        priceAmount: 0, isPickup: true, etaMinDays: 1, etaMaxDays: 1, position: 2 },
    ]
    const deliveryByCode = {}
    for (const method of deliveryMethods) {
      const row = await DeliveryMethod.create(method, { transaction: t })
      deliveryByCode[method.code] = row
      track('delivery_methods', row.id)
    }

    const couriers = [
      { code: 'tcs', name: 'TCS', trackingUrlTemplate: 'https://www.tcsexpress.com/track/{tracking}', position: 0 },
      { code: 'leopards', name: 'Leopards Courier', trackingUrlTemplate: 'https://www.leopardscourier.com/tracking/{tracking}', position: 1 },
      { code: 'mp', name: 'M&P Express', trackingUrlTemplate: 'https://mulphilog.com/track/{tracking}', position: 2 },
    ]
    const courierByCode = {}
    for (const courier of couriers) {
      const row = await Courier.create(courier, { transaction: t })
      courierByCode[courier.code] = row
      track('couriers', row.id)
    }

    // Prices INCLUDE tax, so this is the portion contained in a total, never an addition.
    const taxRate = await TaxRate.create(
      { country: 'Pakistan', rateBp: 1800, isInclusive: true, isDefault: true },
      { transaction: t },
    )
    track('tax_rates', taxRate.id)

    // --- facets ---------------------------------------------------------------------
    const facetByKey = {}
    const facetValueByKey = {}

    for (const [index, def] of FACET_DEFS.entries()) {
      const facet = await Facet.create(
        { ...def, swatchField: def.swatchField ?? null, position: index, isSystem: def.isSystem ?? false },
        { transaction: t },
      )
      facetByKey[def.key] = facet
      track('facets', facet.id)
    }

    // Collect the distinct values each facet actually needs, straight from the products.
    const valuesFor = {}
    const swatchFor = {}
    for (const product of products) {
      for (const def of FACET_DEFS) {
        if (def.isSystem) continue
        const raw = product[def.fieldKey]
        if (raw == null) continue
        const list = Array.isArray(raw) ? raw : [raw]
        valuesFor[def.key] = valuesFor[def.key] ?? new Set()
        list.forEach((value) => valuesFor[def.key].add(value))
        if (def.key === 'color' && product.colorHex) swatchFor[product.color] = product.colorHex
      }
      // Size is now a variant axis, so the vocabulary must cover every size offered,
      // not just the one the flat literal happened to name.
      const { variants } = deriveVariantsFor(product)
      valuesFor.size = valuesFor.size ?? new Set()
      variants.forEach((variant) => valuesFor.size.add(parseVariantSummary(variant.label).size))
    }

    for (const def of FACET_DEFS) {
      if (def.isSystem) continue
      const sorted = [...(valuesFor[def.key] ?? [])].sort((a, b) => a.localeCompare(b))
      for (const [index, value] of sorted.entries()) {
        const row = await FacetValue.create(
          {
            facetId: facetByKey[def.key].id,
            value,
            label: value,
            swatchHex: def.key === 'color' ? (swatchFor[value] ?? null) : null,
            position: index,
          },
          { transaction: t },
        )
        facetValueByKey[`${def.key}:${value}`] = row
        track('facet_values', row.id)
      }
    }

    for (const [index, range] of PRICE_RANGES.entries()) {
      const row = await PriceRange.create({ ...range, position: index }, { transaction: t })
      track('price_ranges', row.id)
    }
    for (const [index, option] of SORT_OPTIONS.entries()) {
      const row = await SortOption.create(
        { ...option, isDefault: option.isDefault ?? false, position: index },
        { transaction: t },
      )
      track('sort_options', row.id)
    }

    // --- categories and collections -------------------------------------------------
    const categoryTitles = [...new Set(products.map((product) => product.category))].sort()
    const categoryByTitle = {}
    for (const [index, title] of categoryTitles.entries()) {
      const handle = title.toLowerCase().replace(/\s+/g, '-')
      const media = skipMedia ? null : await uploadSeedImage(`category-${handle}`, title, 'categories', t)
      const row = await Category.create(
        { handle, title, position: index, mediaId: media?.id ?? null },
        { transaction: t },
      )
      categoryByTitle[title] = row
      track('categories', row.id)
    }

    const collectionByHandle = {}
    for (const [index, collection] of collections.entries()) {
      const featuredIndex = featuredCollectionCards.indexOf(collection.handle)
      const media = skipMedia
        ? null
        : await uploadSeedImage(`collection-${collection.handle}`, collection.title, 'collections', t)
      const row = await Collection.create(
        {
          handle: collection.handle,
          title: collection.title,
          description: collection.description,
          cardLabel: collection.cardLabel,
          mediaId: media?.id ?? null,
          position: index,
          isFeatured: featuredIndex !== -1,
          featuredPosition: featuredIndex === -1 ? null : featuredIndex,
        },
        { transaction: t },
      )
      collectionByHandle[collection.handle] = row
      track('collections', row.id)
    }

    // --- products -------------------------------------------------------------------
    const productByHandle = {}

    for (const [index, product] of products.entries()) {
      const images = []
      if (!skipMedia) {
        for (let angle = 0; angle < 3; angle += 1) {
          const media = await uploadSeedImage(
            `product-${product.handle}-${angle}`,
            `${product.title} (${angle + 1})`,
            'products',
            t,
          )
          if (media) images.push(media)
        }
      }

      const row = await Product.create(
        {
          handle: product.handle,
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          vendor: product.vendor,
          badge: product.badge,
          crueltyFree: product.crueltyFree,
          rating: product.rating,
          reviewCount: product.reviewCount,
          ingredientNote: product.ingredientNote,
          stockLabel: product.stockLabel,
          categoryId: categoryByTitle[product.category].id,
          primaryImageId: images[0]?.id ?? null,
          isFavorite: product.isFavorite,
          isUpsell: product.isUpsell,
          status: 'active',
          publishedAt: new Date(),
          position: index,
        },
        { transaction: t },
      )
      productByHandle[product.handle] = row
      track('products', row.id)

      for (const [imageIndex, media] of images.entries()) {
        const imageRow = await ProductImage.create(
          { productId: row.id, mediaId: media.id, position: imageIndex, altText: product.title },
          { transaction: t },
        )
        track('product_images', imageRow.id)
      }

      for (const [ingredientIndex, ingredient] of product.ingredients.entries()) {
        const ingredientRow = await ProductIngredient.create(
          { productId: row.id, name: ingredient.name, percent: ingredient.percent, position: ingredientIndex },
          { transaction: t },
        )
        track('product_ingredients', ingredientRow.id)
      }

      // Options and variants
      const { options, variants } = deriveVariantsFor(product)
      const optionValueRows = {}

      for (const [optionIndex, option] of options.entries()) {
        const optionRow = await ProductOption.create(
          { productId: row.id, name: option.name, position: optionIndex },
          { transaction: t },
        )
        track('product_options', optionRow.id)

        for (const [valueIndex, value] of option.values.entries()) {
          const valueRow = await ProductOptionValue.create(
            { optionId: optionRow.id, value, position: valueIndex },
            { transaction: t },
          )
          track('product_option_values', valueRow.id)
          optionValueRows[`${option.name}:${value}`] = valueRow
        }
      }

      for (const variant of variants) {
        const variantRow = await ProductVariant.create(
          {
            productId: row.id,
            sku: variant.sku,
            label: variant.label,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stockQuantity: variant.stockQuantity,
            isDefault: variant.isDefault,
            position: variant.position,
          },
          { transaction: t },
        )
        track('product_variants', variantRow.id)

        for (const [optionName, value] of Object.entries(variant.optionValues)) {
          const optionValueRow = optionValueRows[`${optionName}:${value}`]
          if (!optionValueRow) continue
          await VariantOptionValue.create(
            { variantId: variantRow.id, optionValueId: optionValueRow.id },
            { transaction: t },
          )
          track('variant_option_values', `${variantRow.id}:${optionValueRow.id}`)
        }
      }

      // Facet values
      for (const def of FACET_DEFS) {
        if (def.isSystem) continue

        let values
        if (def.key === 'size') {
          values = [...new Set(variants.map((variant) => parseVariantSummary(variant.label).size))]
        } else {
          const raw = product[def.fieldKey]
          values = raw == null ? [] : Array.isArray(raw) ? raw : [raw]
        }

        for (const value of values) {
          const facetValue = facetValueByKey[`${def.key}:${value}`]
          if (!facetValue) continue
          await ProductFacetValue.create(
            { productId: row.id, facetValueId: facetValue.id, facetId: facetByKey[def.key].id },
            { transaction: t },
          )
          track('product_facet_values', `${row.id}:${facetValue.id}`)
        }
      }

      for (const [collectionIndex, handle] of product.collections.entries()) {
        const collection = collectionByHandle[handle]
        if (!collection) continue
        await CollectionProduct.create(
          { collectionId: collection.id, productId: row.id, position: collectionIndex },
          { transaction: t },
        )
        track('collection_products', `${collection.id}:${row.id}`)
      }
    }

    // routineWith needs every product to exist first, so it runs as a second pass.
    for (const product of products) {
      for (const [index, relatedHandle] of (product.routineWith ?? []).entries()) {
        const related = productByHandle[relatedHandle]
        if (!related || relatedHandle === product.handle) continue
        await ProductRoutineProduct.create(
          { productId: productByHandle[product.handle].id, relatedProductId: related.id, position: index },
          { transaction: t },
        )
        track('product_routine_products', `${productByHandle[product.handle].id}:${related.id}`)
      }
    }

    // --- quiz -----------------------------------------------------------------------
    for (const [index, question] of QUIZ.entries()) {
      const questionRow = await QuizQuestion.create(
        { key: question.key, prompt: question.prompt, facetId: facetByKey[question.facetKey].id, position: index },
        { transaction: t },
      )
      track('quiz_questions', questionRow.id)

      for (const [answerIndex, answer] of question.answers.entries()) {
        const answerRow = await QuizAnswer.create(
          { questionId: questionRow.id, label: answer.label, position: answerIndex },
          { transaction: t },
        )
        track('quiz_answers', answerRow.id)

        for (const value of answer.values) {
          const facetValue = facetValueByKey[`${question.facetKey}:${value}`]
          if (!facetValue) {
            throw new Error(
              `Quiz answer "${answer.label}" references ${question.facetKey}="${value}", which no product has.`,
            )
          }
          await QuizAnswerValue.create(
            { answerId: answerRow.id, facetValueId: facetValue.id },
            { transaction: t },
          )
          track('quiz_answer_values', `${answerRow.id}:${facetValue.id}`)
        }
      }
    }

    // --- homepage, pages, faqs ------------------------------------------------------
    for (const section of homepageSections) {
      // Swap the media keys in the content blob for real asset ids.
      const content = JSON.parse(JSON.stringify(section.content))
      const resolve = async (mediaKey, alt) => {
        if (!mediaKey || skipMedia) return null
        const media = await uploadSeedImage(mediaKey, alt, 'homepage', t)
        return media?.id ?? null
      }

      if (content.slides) {
        for (const slide of content.slides) {
          slide.posterMediaId = await resolve(slide.posterMediaKey, slide.heading.text)
          delete slide.posterMediaKey
          delete slide.videoMediaKey
        }
      }
      if (content.promoTile) {
        content.promoTile.mediaId = await resolve(content.promoTile.mediaKey, content.promoTile.title)
        delete content.promoTile.mediaKey
      }
      if (content.steps) {
        for (const step of content.steps) {
          step.mediaId = await resolve(step.mediaKey, step.label)
          delete step.mediaKey
        }
      }

      const row = await HomepageSection.create(
        { key: section.key, label: section.label, position: section.position, content, isEnabled: true },
        { transaction: t },
      )
      track('homepage_sections', row.id)
    }

    // The four interactive slugs get real rows too, so their titles and intros stop being
    // hardcoded in Page.jsx and become editable like every other page.
    const customPages = [
      { slug: 'faqs', title: 'Frequently asked questions', accent: 'questions', customComponent: 'faqs',
        intro: 'Everything we get asked most often, in one place.' },
      { slug: 'contact', title: 'Contact us', accent: 'us', customComponent: 'contact',
        intro: 'Questions about an order, a formula, or a partnership? Send us a note.' },
      { slug: 'book-a-treatment', title: 'Book a treatment', accent: 'treatment', customComponent: 'book-a-treatment',
        intro: 'Choose a treatment and a time that suits you.' },
      { slug: 'quiz', title: 'Find your routine', accent: 'routine', customComponent: 'quiz',
        intro: 'Four questions, two minutes, and a routine built around your skin.' },
    ]

    let pagePosition = 0
    for (const [slug, page] of Object.entries(staticPages)) {
      const row = await StaticPage.create(
        {
          slug,
          title: page.title,
          accent: page.accent ?? null,
          kind: page.kind,
          updatedLabel: page.updated ?? null,
          intro: page.intro,
          position: pagePosition,
        },
        { transaction: t },
      )
      track('static_pages', row.id)
      pagePosition += 1

      for (const [sectionIndex, section] of (page.sections ?? []).entries()) {
        const sectionRow = await PageSection.create(
          { pageId: row.id, heading: section.heading, body: section.body, position: sectionIndex },
          { transaction: t },
        )
        track('page_sections', sectionRow.id)
      }
    }

    for (const page of customPages) {
      const row = await StaticPage.create(
        { ...page, kind: 'page', position: pagePosition },
        { transaction: t },
      )
      track('static_pages', row.id)
      pagePosition += 1
    }

    for (const [index, faq] of faqs.entries()) {
      const row = await Faq.create(
        { key: faq.id, question: faq.question, answer: faq.answer, position: index },
        { transaction: t },
      )
      track('faqs', row.id)
    }

    // --- navigation -----------------------------------------------------------------
    for (const [index, item] of navigation.entries()) {
      const rootRow = await NavItem.create(
        {
          kind: 'root',
          label: item.label,
          layout: item.layout ?? (item.children ? 'list' : 'link'),
          targetType: 'custom',
          customHref: item.href,
          highlight: item.highlight ?? false,
          position: index,
        },
        { transaction: t },
      )
      track('nav_items', rootRow.id)

      const children = item.children ?? []
      for (const [childIndex, child] of children.entries()) {
        const childRow = await NavItem.create(
          { parentId: rootRow.id, kind: 'link', label: child.label, targetType: 'custom',
            customHref: child.href, position: childIndex },
          { transaction: t },
        )
        track('nav_items', childRow.id)
      }

      for (const [groupIndex, group] of (item.groups ?? []).entries()) {
        const groupRow = await NavItem.create(
          { parentId: rootRow.id, kind: 'group', label: group.label, targetType: 'custom',
            customHref: group.allHref, allLabel: group.allLabel, allHref: group.allHref, position: groupIndex },
          { transaction: t },
        )
        track('nav_items', groupRow.id)

        for (const [linkIndex, link] of (group.allLinks ?? []).entries()) {
          const linkRow = await NavItem.create(
            { parentId: groupRow.id, kind: 'link', label: link.label, targetType: 'custom',
              customHref: link.href, position: linkIndex },
            { transaction: t },
          )
          track('nav_items', linkRow.id)
        }

        for (const [columnIndex, column] of (group.columns ?? []).entries()) {
          const media = skipMedia || !column.seed
            ? null
            : await uploadSeedImage(`menu-${column.seed}`, column.heading, 'navigation', t)

          const columnRow = await NavItem.create(
            { parentId: groupRow.id, kind: 'column', label: column.heading, targetType: 'custom',
              customHref: column.href, seed: column.seed ?? null, mediaId: media?.id ?? null,
              position: columnIndex + 100 },
            { transaction: t },
          )
          track('nav_items', columnRow.id)

          for (const [linkIndex, link] of (column.links ?? []).entries()) {
            const linkRow = await NavItem.create(
              { parentId: columnRow.id, kind: 'link', label: link.label, targetType: 'custom',
                customHref: link.href, position: linkIndex },
              { transaction: t },
            )
            track('nav_items', linkRow.id)
          }
        }
      }

      for (const [panelIndex, panel] of (item.panels ?? []).entries()) {
        const panelRow = await NavItem.create(
          { parentId: rootRow.id, kind: 'group', label: panel.label, targetType: 'custom',
            customHref: panel.href, position: panelIndex },
          { transaction: t },
        )
        track('nav_items', panelRow.id)

        for (const [linkIndex, link] of (panel.links ?? []).entries()) {
          const linkRow = await NavItem.create(
            { parentId: panelRow.id, kind: 'link', label: link.label, targetType: 'custom',
              customHref: link.href, position: linkIndex },
            { transaction: t },
          )
          track('nav_items', linkRow.id)
        }
      }
    }

    // --- footer and announcements ---------------------------------------------------
    for (const [index, group] of footerLinkGroups.entries()) {
      const groupRow = await FooterLinkGroup.create(
        { title: group.title, position: index },
        { transaction: t },
      )
      track('footer_link_groups', groupRow.id)

      for (const [linkIndex, link] of group.links.entries()) {
        const linkRow = await FooterLink.create(
          { groupId: groupRow.id, label: link.label, targetType: 'custom', customHref: link.href, position: linkIndex },
          { transaction: t },
        )
        track('footer_links', linkRow.id)
      }
    }

    for (const [index, announcement] of site.announcements.entries()) {
      const row = await Announcement.create(
        {
          message: announcement.message,
          ctaLabel: announcement.ctaLabel,
          ctaTargetType: 'custom',
          ctaCustomHref: announcement.ctaHref,
          position: index,
        },
        { transaction: t },
      )
      track('announcements', row.id)
    }

    // --- admin, customer, orders ----------------------------------------------------
    const adminPassword = env.SEED_ADMIN_PASSWORD || randomUUID().slice(0, 16)
    const admin = await AdminUser.create(
      {
        email: env.SEED_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: 'Pure Aura Owner',
        role: 'owner',
      },
      { transaction: t },
    )
    track('admin_users', admin.id)

    const customer = await Customer.create(
      {
        email: account.email,
        passwordHash: await bcrypt.hash('password123', 10),
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        birthday: account.birthday,
        marketingOptIn: account.marketingOptIn,
        smsOptIn: account.smsOptIn,
        rewardPoints: account.rewardPoints,
      },
      { transaction: t },
    )
    track('customers', customer.id)

    const addressByLegacyId = {}
    for (const address of seedAddresses) {
      const row = await Address.create(
        {
          customerId: customer.id,
          label: address.label,
          isDefault: address.isDefault,
          name: address.name,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          region: address.region,
          postcode: address.postcode,
          country: address.country,
          phone: address.phone,
        },
        { transaction: t },
      )
      addressByLegacyId[address.id] = row
      track('addresses', row.id)
    }

    // The three historical orders from data/account.js, with back-dated event chains so
    // the new OrderTimeline has real history to render. tax is zero on these: they were
    // written before tax existed in the mock, and their stored totals must keep matching
    // what the storefront renders for them today.
    const STATUS_CHAINS = {
      Delivered: ['confirmed', 'processing', 'packed', 'handed_to_courier', 'in_transit', 'out_for_delivery', 'delivered'],
      'In transit': ['confirmed', 'processing', 'packed', 'handed_to_courier', 'in_transit'],
    }

    let orderNumber = ORDER_NUMBER_START
    for (const order of seedOrders) {
      const address = addressByLegacyId[order.shippingAddressId]
      const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const chain = STATUS_CHAINS[order.status] ?? ['confirmed']
      const finalStatus = chain[chain.length - 1]
      const placedAt = new Date(`${order.placedOn}T10:00:00Z`)

      const row = await Order.create(
        {
          number: `PA-${orderNumber}`,
          customerId: customer.id,
          status: finalStatus,
          paymentStatus: 'paid',
          subtotalAmount: subtotal,
          discountAmount: 0,
          shippingAmount: order.shipping ?? 0,
          taxRateBp: 0,
          taxAmount: 0,
          totalAmount: subtotal + (order.shipping ?? 0),
          deliveryMethodId: deliveryByCode.standard.id,
          deliveryMethodLabel: 'Standard',
          paymentMethodId: paymentMethodByCode.cod.id,
          paymentMethodLabel: order.paymentLabel,
          contactEmail: account.email,
          contactPhone: account.phone,
          shipName: address.name,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipCity: address.city,
          shipRegion: address.region,
          shipPostcode: address.postcode,
          shipCountry: address.country,
          shipPhone: address.phone,
          courierId: courierByCode.tcs.id,
          trackingNumber: order.trackingNumber,
          trackingUrl: `https://www.tcsexpress.com/track/${order.trackingNumber}`,
          placedAt,
          confirmedAt: placedAt,
          deliveredAt: order.deliveredOn ? new Date(`${order.deliveredOn}T14:00:00Z`) : null,
          handedToCourierAt: new Date(placedAt.getTime() + 86_400_000),
        },
        { transaction: t },
      )
      track('orders', row.id)
      orderNumber += 1

      for (const [itemIndex, item] of order.items.entries()) {
        const product = products.find((candidate) => candidate.handle === item.handle)
        const productRow = productByHandle[item.handle]
        const variantRow = productRow
          ? await ProductVariant.findOne({
              where: { productId: productRow.id, isDefault: true },
              transaction: t,
            })
          : null

        // The line item snapshots its own image URL, which is the whole point of the
        // snapshot columns: order history has to keep rendering after a product is
        // archived or its photos are replaced.
        const primaryImage = productRow?.primaryImageId
          ? await models.MediaAsset.findByPk(productRow.primaryImageId, {
              include: [{ association: 'variants' }],
              transaction: t,
            })
          : null

        const itemRow = await OrderItem.create(
          {
            orderId: row.id,
            productId: productRow?.id ?? null,
            variantId: variantRow?.id ?? null,
            handle: item.handle,
            title: product?.title ?? item.handle,
            variantLabel: product?.variantSummary ?? null,
            sku: variantRow?.sku ?? null,
            imageUrl: mediaUrl(primaryImage),
            unitPrice: item.price,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
            position: itemIndex,
          },
          { transaction: t },
        )
        track('order_items', itemRow.id)
      }

      let previous = null
      for (const [stepIndex, status] of chain.entries()) {
        const event = await OrderStatusEvent.create(
          {
            orderId: row.id,
            fromStatus: previous,
            toStatus: status,
            actorType: stepIndex === 0 ? 'system' : 'admin',
            actorId: stepIndex === 0 ? null : admin.id,
            createdAt: new Date(placedAt.getTime() + stepIndex * 43_200_000),
          },
          { transaction: t },
        )
        track('order_status_events', event.id)
        previous = status
      }

      const payment = await Payment.create(
        {
          orderId: row.id,
          paymentMethodId: paymentMethodByCode.cod.id,
          kind: 'offline',
          amount: subtotal + (order.shipping ?? 0),
          status: 'succeeded',
          verifiedAt: placedAt,
        },
        { transaction: t },
      )
      track('payments', payment.id)
    }

    // Keep the sequence ahead of what we just inserted.
    await sequelize.query(`SELECT setval('order_number_seq', ${orderNumber}, false)`, { transaction: t })

    // --- ledger ---------------------------------------------------------------------
    await SeedRecord.bulkCreate(ledger, { transaction: t })

    await t.commit()

    logger.info(
      { batchId, rows: ledger.length, products: products.length },
      'seed complete',
    )

    return { batchId, rows: ledger.length, adminEmail: env.SEED_ADMIN_EMAIL, adminPassword }
  } catch (error) {
    await t.rollback()
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed({ skipMedia: process.argv.includes('--skip-media') })
    .then(async (result) => {
      console.log(`\nSeeded ${result.rows} rows in batch ${result.batchId}`)
      console.log(`Admin login: ${result.adminEmail} / ${result.adminPassword}`)
      console.log('Customer login: jamie.fletcher@example.com / password123')
      await sequelize.close()
      process.exit(0)
    })
    .catch(async (error) => {
      logger.error({ err: error }, 'seed failed')
      await sequelize.close()
      process.exit(1)
    })
}

export { seed }
