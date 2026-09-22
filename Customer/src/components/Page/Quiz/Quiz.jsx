import { useState } from 'react'
import ProductCard from '../../Common/ProductCard/ProductCard'
import Button from '../../Common/Button/Button'
import ProgressBar from '../../Common/ProgressBar/ProgressBar'
import { getAllProducts } from '../../../data/catalog'
import { collectionPath } from '../../../config/routes'
import { cn } from '../../../utils/classNames'

// Each answer carries the facet values it favours; the result scores every product against
// the collected preferences rather than hard-coding a routine per answer combination.
const QUESTIONS = [
  {
    id: 'skinType',
    prompt: 'How does your skin usually behave?',
    field: 'skinType',
    answers: [
      { label: 'Tight and flaky', values: ['Dry skin'] },
      { label: 'Shiny by midday', values: ['Oily skin'] },
      { label: 'Oily T-zone, dry cheeks', values: ['Combination'] },
      { label: 'Reacts to most things', values: ['Sensitive skin'] },
    ],
  },
  {
    id: 'concern',
    prompt: 'What would you most like to change?',
    field: 'ingredientFilter',
    answers: [
      { label: 'Dullness and uneven tone', values: ['Vitamin C'] },
      { label: 'Dehydration', values: ['Hyaluronic Acid'] },
      { label: 'Congestion and visible pores', values: ['Niacinamide'] },
      { label: 'Redness and sensitivity', values: ['Aloe Vera'] },
    ],
  },
  {
    id: 'texture',
    prompt: 'What texture do you actually enjoy using?',
    field: 'texture',
    answers: [
      { label: 'Light and fast-absorbing', values: ['Serum', 'Gel'] },
      { label: 'Cushiony cream', values: ['Cream'] },
      { label: 'Rich balm or oil', values: ['Balm', 'Oil'] },
      { label: 'No preference', values: [] },
    ],
  },
  {
    id: 'routine',
    prompt: 'How much time do you want to spend?',
    field: 'collectionFilter',
    answers: [
      { label: 'The absolute basics', values: ['Daily Basics'] },
      { label: 'A proper evening ritual', values: ['Night Ritual'] },
      { label: 'Whatever gives the most glow', values: ['Glow Edit'] },
      { label: 'No preference', values: [] },
    ],
  },
]

function recommend(answers) {
  const products = getAllProducts()

  const scored = products.map((product) => {
    let score = 0
    for (const question of QUESTIONS) {
      const chosen = answers[question.id]
      if (!chosen) continue

      const field = product[question.field]
      const productValues = Array.isArray(field) ? field : [field]
      if (chosen.values.some((value) => productValues.includes(value))) score += 1
    }
    // Tie-break toward things people actually rate well, and away from what we cannot ship.
    return { product, score: score + product.rating / 10 - (product.inStock ? 0 : 5) }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.product)
}

export default function Quiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})

  const isResult = step >= QUESTIONS.length
  const question = QUESTIONS[step]

  const choose = (answer) => {
    setAnswers((current) => ({ ...current, [question.id]: answer }))
    setStep((current) => current + 1)
  }

  const restart = () => {
    setAnswers({})
    setStep(0)
  }

  if (isResult) {
    const results = recommend(answers)

    return (
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-medium">Your routine</h2>
          <p className="mt-2 text-sm text-text-muted">
            Based on your answers, start with these three and give them a fortnight.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {results.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="solid-dark" to={collectionPath('all')}>
            Shop the full range
          </Button>
          <Button variant="outline-dark" onClick={restart}>
            Start over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
          Question {step + 1} of {QUESTIONS.length}
        </p>
        <ProgressBar value={step / QUESTIONS.length} />
      </div>

      <h2 className="text-center text-xl font-medium md:text-2xl">{question.prompt}</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {question.answers.map((answer) => (
          <button
            key={answer.label}
            type="button"
            onClick={() => choose(answer)}
            className={cn(
              'rounded-2xl border border-charcoal/20 px-5 py-4 text-left text-sm transition-colors',
              'hover:border-charcoal hover:bg-sage/40',
            )}
          >
            {answer.label}
          </button>
        ))}
      </div>

      {step > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="text-sm text-text-muted underline underline-offset-4 hover:text-charcoal"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
