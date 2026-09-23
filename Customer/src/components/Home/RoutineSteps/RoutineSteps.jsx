import { useState } from 'react'
import SectionHeading from '../../Common/SectionHeading/SectionHeading'
import AccentText from '../../Common/AccentText/AccentText'
import Button from '../../Common/Button/Button'
import { cn } from '../../../utils/classNames'

const FALLBACK_HEADING = {
  text: 'How to take care for glowing skin.',
  accent: 'glowing skin',
}

const FALLBACK_STEPS = [
  { id: 1, label: 'Cleansers', image: null },
  { id: 2, label: 'Serums', image: null },
  {
    id: 3,
    label: 'Toners',
    image: null,
    description:
      'Achieve glowing skin with our toners as part of your skincare routine. Scientifically formulated for optimal results.',
    cta: { label: 'Shop Toners', href: '/collections/toners' },
  },
]

export default function RoutineSteps({ content }) {
  const steps = content?.steps?.length ? content.steps : FALLBACK_STEPS
  const heading = content?.heading ?? FALLBACK_HEADING

  // Which step opens first used to be the magic expression STEPS[STEPS.length - 1].id -
  // "the last one". It is an explicit index now, so an admin can choose it, and the
  // active step is DERIVED rather than stored: content arriving asynchronously would
  // otherwise leave state pointing at a step from the fallback list.
  const defaultIndex = Math.min(
    content?.defaultOpenStepIndex ?? steps.length - 1,
    steps.length - 1,
  )
  const [chosenIndex, setChosenIndex] = useState(null)
  const activeIndex = chosenIndex ?? defaultIndex
  const activeStep = steps[activeIndex]

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
      <div className="mb-10 text-center">
        <SectionHeading size="md">
          <AccentText text={heading.text} accent={heading.accent} />
        </SectionHeading>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-sage">
          {activeStep?.image && (
            <img
              src={activeStep.image}
              alt={activeStep.label}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col">
          {steps.map((step, index) => {
            const isActive = index === activeIndex
            return (
              <div
                key={step.id ?? `${step.label}-${index}`}
                className={cn(
                  'cursor-pointer border-t py-5',
                  index === steps.length - 1 && 'border-b',
                )}
                onClick={() => setChosenIndex(index)}
              >
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Step {index + 1}
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <h3 className="text-2xl font-medium">{step.label}</h3>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-sage">
                    {step.image && (
                      <img
                        src={step.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {isActive && step.description && (
                  <div className="mt-4">
                    <p className="max-w-md text-sm text-text-muted">{step.description}</p>
                    {step.cta?.enabled !== false && step.cta?.href && (
                      <Button variant="solid-dark" to={step.cta.href} className="mt-4">
                        {step.cta.label}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
