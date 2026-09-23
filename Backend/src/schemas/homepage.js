import { z } from 'zod'

// Per-section schemas for the homepage `content` blob.
//
// jsonb accepts anything, so without these an admin (or a bug) could store a shape the
// storefront cannot render and the failure would appear on the live site rather than at
// the point of saving. Validating per key is also what keeps "fixed sections, editable
// fields" honest: the set of fields is defined here, not discovered at runtime.

// Headings are { text, accent } where accent is a substring of text. AccentText falls back
// to the plain text when it does not match, so a mismatch degrades rather than breaks -
// but catching it here means the admin finds out immediately.
const heading = z
  .object({
    text: z.string().min(1, 'Required'),
    accent: z.string().default(''),
  })
  .refine((value) => !value.accent || value.text.includes(value.accent), {
    message: 'The accent must appear inside the heading',
    path: ['accent'],
  })

const cta = z.object({
  enabled: z.boolean().default(true),
  label: z.string().default(''),
  href: z.string().default(''),
})

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #7a6a5f')

export const HOMEPAGE_SCHEMAS = {
  hero: z.object({
    slides: z
      .array(
        z.object({
          heading,
          subheading: z.string().default(''),
          // Two colours, not a Tailwind class string: a class assembled at runtime is
          // invisible to Tailwind's scanner and would never be compiled.
          fallbackGradient: z.object({ from: hexColour, to: hexColour }),
          posterMediaId: z.string().uuid().nullish(),
          videoMediaId: z.string().uuid().nullish(),
          primaryCta: cta,
          secondaryCta: cta,
        }),
      )
      .min(1, 'The hero needs at least one slide'),
  }),

  favorites: z.object({
    bandHeading: heading,
    sectionHeading: heading,
    promoTile: z.object({
      title: z.string().default(''),
      discountLabel: z.string().default(''),
      mediaId: z.string().uuid().nullish(),
      href: z.string().default(''),
    }),
  }),

  marquee_quiz: z.object({
    marqueeItems: z.array(z.string().min(1)).min(1, 'Add at least one word'),
    marqueeSpeed: z.number().int().min(5).max(120),
    eyebrow: z.string().default(''),
    heading,
    body: z.string().default(''),
    cta: z.object({ label: z.string(), href: z.string() }),
    disclaimer: z.object({
      prefix: z.string().default(''),
      linkLabel: z.string().default(''),
      href: z.string().default(''),
    }),
  }),

  routine_steps: z.object({
    heading,
    defaultOpenStepIndex: z.number().int().min(0).default(0),
    steps: z
      .array(
        z.object({
          label: z.string().min(1, 'Required'),
          mediaId: z.string().uuid().nullish(),
          description: z.string().nullish(),
          cta,
        }),
      )
      .min(1, 'Add at least one step'),
  }),
}

export function schemaForSection(key) {
  return HOMEPAGE_SCHEMAS[key] ?? null
}
