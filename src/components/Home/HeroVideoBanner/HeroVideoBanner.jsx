import { useState } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Button from '../../Common/Button/Button'
import { Accent } from '../../Common/SectionHeading/SectionHeading'
import { cn } from '../../../utils/classNames'

const SLIDES = [
  {
    video: null,
    poster: null,
    fallbackGradient: 'from-[#7a6a5f] to-[#3f342c]',
    heading: (
      <>
        Your skin. <Accent>Glowing.</Accent>
      </>
    ),
    subheading: 'Simple formulas for everyday glow.',
    primaryCta: { label: 'Find my Match', href: '/pages/quiz' },
    secondaryCta: { label: 'Shop All', href: '/collections/all' },
  },
  {
    video: null,
    poster: null,
    fallbackGradient: 'from-[#8a6a52] to-[#2c2419]',
    heading: (
      <>
        Smooth skin. <Accent>Effortlessly</Accent>
      </>
    ),
    subheading: 'Simple formulas for everyday glow.',
    primaryCta: { label: 'New Arrival', href: '/collections/new-arrivals' },
    secondaryCta: { label: 'Shop All', href: '/collections/all' },
  },
]

export default function HeroVideoBanner() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]

  const goTo = (nextIndex) => setIndex((nextIndex + SLIDES.length) % SLIDES.length)

  return (
    <section className="relative flex h-screen min-h-[640px] w-full items-end overflow-hidden bg-charcoal">
      {slide.video ? (
        <video
          key={slide.video}
          className="absolute inset-0 h-full w-full object-cover"
          src={slide.video}
          poster={slide.poster}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div
          className={cn('absolute inset-0 h-full w-full bg-gradient-to-br', slide.fallbackGradient)}
        />
      )}

      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 w-full px-6 pb-20 md:px-10 md:pb-24">
        <div className="max-w-2xl text-white">
          <h1 className="text-5xl font-medium leading-[1.05] md:text-7xl">{slide.heading}</h1>
          <p className="mt-4 text-lg text-white/90">{slide.subheading}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="outline-light" href={slide.primaryCta.href}>
              {slide.primaryCta.label}
            </Button>
            <Button variant="solid-light" href={slide.secondaryCta.href}>
              {slide.secondaryCta.label}
            </Button>
          </div>
        </div>
      </div>

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
    </section>
  )
}
