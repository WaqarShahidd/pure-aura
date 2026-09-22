import { useParams } from 'react-router-dom'
import StaticPage from '../../components/Page/StaticPage/StaticPage'
import PageHero from '../../components/Page/PageHero/PageHero'
import FaqList from '../../components/Page/FaqList/FaqList'
import ContactForm from '../../components/Page/ContactForm/ContactForm'
import BookingForm from '../../components/Page/BookingForm/BookingForm'
import Quiz from '../../components/Page/Quiz/Quiz'
import NotFound from '../NotFound/NotFound'
import { staticPages } from '../../data/pages'

// Slugs that need their own interactive component rather than prose from data.
const CUSTOM_PAGES = {
  faqs: {
    title: 'Frequently asked questions',
    accent: 'questions',
    intro: 'The things people ask us most. If yours is not here, the contact page reaches a person.',
    render: () => <FaqList />,
    width: 'max-w-3xl',
  },
  contact: {
    title: 'Contact',
    intro: 'Questions about an order, a formula, or stocking us — this all reaches the same small team.',
    render: () => <ContactForm />,
    width: 'max-w-3xl',
  },
  'book-a-treatment': {
    title: 'Book a Treatment',
    accent: 'Treatment',
    intro: 'Consultations and facials at our Head Office studio, with the people who formulate the products.',
    render: () => <BookingForm />,
    width: 'max-w-3xl',
  },
  quiz: {
    title: 'Find your ultimate glow',
    accent: 'glow',
    intro: 'Four questions, about two minutes. We will suggest a routine from the answers.',
    render: () => <Quiz />,
    width: 'max-w-3xl',
  },
}

// Renders both /pages/:slug and /policies/:slug — the two differ only in the breadcrumb.
export default function Page({ kind = 'page' }) {
  const { slug } = useParams()
  const custom = CUSTOM_PAGES[slug]
  const crumbs = kind === 'policy' ? [{ label: 'Policies' }] : []

  if (custom) {
    return (
      <>
        <PageHero
          title={custom.title}
          accent={custom.accent}
          intro={custom.intro}
          crumbs={crumbs}
        />
        <section className={`mx-auto ${custom.width} px-6 py-16 md:px-10`}>
          {custom.render()}
        </section>
      </>
    )
  }

  const page = staticPages[slug]
  if (!page) return <NotFound />

  return <StaticPage page={page} crumbs={crumbs} />
}
