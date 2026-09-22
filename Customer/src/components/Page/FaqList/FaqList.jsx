import Accordion from '../../Common/Accordion/Accordion'
import { faqs } from '../../../data/pages'

export default function FaqList() {
  const sections = faqs.map((faq) => ({
    id: faq.id,
    title: faq.question,
    content: <p className="text-sm leading-relaxed text-text-muted">{faq.answer}</p>,
  }))

  return <Accordion sections={sections} defaultOpenId={faqs[0].id} />
}
