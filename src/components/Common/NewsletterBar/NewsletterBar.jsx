import { useState } from 'react'
import Input from '../Input/Input'
import Button from '../Button/Button'
import SectionHeading, { Accent } from '../SectionHeading/SectionHeading'

export default function NewsletterBar() {
  const [email, setEmail] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    // Wire up to email provider once available.
  }

  return (
    <section className="bg-sage">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <SectionHeading size="sm">
            Subscribe to <Accent>get 10% off</Accent>.
          </SectionHeading>
          <p className="mt-2 text-sm text-text-muted">
            Be the first to know about new collections and exclusive offers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2 md:w-auto">
          <Input
            type="email"
            placeholder="Email"
            required
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" variant="solid-dark" className="shrink-0">
            Submit
          </Button>
        </form>
      </div>
    </section>
  )
}
