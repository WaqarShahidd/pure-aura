import { useState } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Button from '../../Common/Button/Button'
import AccentText from '../../Common/AccentText/AccentText'

// Two things about this section changed shape to become editable, and both were forced:
//
// 1. `heading` was literal JSX - <>Your skin. <Accent>Glowing.</Accent></> - which no admin
//    text field can produce. It is now { text, accent }, rendered by AccentText.
//
// 2. `fallbackGradient` was a Tailwind class string, 'from-[#7a6a5f] to-[#3f342c]'. Tailwind
//    scans source text at build time, so a class assembled from admin input would never be
//    compiled and the gradient would silently vanish. It is now two colours and an inline
//    linear-gradient, which also makes it a colour picker rather than a syntax lesson.
//
// The fallback below is what shipped before the CMS existed. It renders while the homepage
// request is in flight, so the hero never appears as an empty black box.
const FALLBACK_SLIDES = [
  {
    heading: { text: 'Your skin. Glowing.', accent: 'Glowing.' },
    subheading: 'Simple formulas for everyday glow.',
    fallbackGradient: { from: '#7a6a5f', to: '#3f342c' },
    video: null,
    poster: null,
    primaryCta: { enabled: true, label: 'Find my Match', href: '/pages/quiz' },
    secondaryCta: { enabled: true, label: 'Shop All', href: '/collections/all' },
  },
  {
    heading: { text: 'Smooth skin. Effortlessly', accent: 'Effortlessly' },
    subheading: 'Simple formulas for everyday glow.',
    fallbackGradient: { from: '#8a6a52', to: '#2c2419' },
    video: null,
    poster: null,
    primaryCta: { enabled: true, label: 'New Arrival', href: '/collections/new-arrivals' },
    secondaryCta: { enabled: true, label: 'Shop All', href: '/collections/all' },
  },
]

export default function HeroVideoBanner({ content }) {
  const slides = content?.slides?.length ? content.slides : FALLBACK_SLIDES
  const [index, setIndex] = useState(0)

  const slide = slides[index % slides.length]
  const goTo = (nextIndex) => setIndex((nextIndex + slides.length) % slides.length)

  const gradient = slide.fallbackGradient ?? {}
  const primary = slide.primaryCta
  const secondary = slide.secondaryCta

  return (
    <section className="relative flex h-screen min-h-[640px] w-full items-end overflow-hidden bg-charcoal">
      {slide.video ? (
        <video
          key={slide.video}
          className="absolute inset-0 h-full w-full object-cover"
          src={slide.video}
          poster={slide.poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : slide.poster ? (
        <img
          src={slide.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${gradient.from ?? '#7a6a5f'}, ${
              gradient.to ?? '#3f342c'
            })`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 w-full px-6 pb-20 md:px-10 md:pb-24">
        <div className="max-w-2xl text-white">
          <h1 className="text-5xl font-medium leading-[1.05] md:text-7xl">
            <AccentText text={slide.heading?.text} accent={slide.heading?.accent} />
          </h1>
          <p className="mt-4 text-lg text-white/90">{slide.subheading}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/*
              Guarded, where the original dereferenced slide.primaryCta.href directly. Once
              a slide is admin-authored a missing or disabled CTA is an ordinary state, and
              it used to be a white screen.
            */}
            {primary?.enabled !== false && primary?.href && (
              <Button variant="outline-light" to={primary.href}>
                {primary.label}
              </Button>
            )}
            {secondary?.enabled !== false && secondary?.href && (
              <Button variant="solid-light" to={secondary.href}>
                {secondary.label}
              </Button>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 md:bottom-10 md:right-10">
          <button
            type="button"
            aria-label="Previous video"
            onClick={() => goTo(index - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white"
          >
            <ChevronLeftIcon fontSize="small" />
          </button>
          <button
            type="button"
            aria-label="Next video"
            onClick={() => goTo(index + 1)}
            className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg bg-black/40 text-white"
          >
            <ChevronRightIcon fontSize="small" />
          </button>
        </div>
      )}
    </section>
  )
}
