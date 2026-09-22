import { useState } from 'react'
import SectionHeading, { Accent } from '../../Common/SectionHeading/SectionHeading'
import Button from '../../Common/Button/Button'
import { cn } from '../../../utils/classNames'

const STEPS = [
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

export default function RoutineSteps() {
  const [activeId, setActiveId] = useState(STEPS[STEPS.length - 1].id)
  const activeStep = STEPS.find((step) => step.id === activeId)

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
      <div className="mb-10 text-center">
        <SectionHeading size="md">
          How to take care for <Accent>glowing skin</Accent>.
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
          {STEPS.map((step, index) => {
            const isActive = step.id === activeId
            return (
              <div
                key={step.id}
                className={cn(
                  'cursor-pointer border-t py-5',
                  index === STEPS.length - 1 && 'border-b',
                )}
                onClick={() => setActiveId(step.id)}
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
                    {step.cta && (
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
