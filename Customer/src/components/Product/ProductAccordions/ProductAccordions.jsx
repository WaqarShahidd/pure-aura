import Accordion from '../../Common/Accordion/Accordion'
import IngredientBars from '../IngredientBars/IngredientBars'
import { productAccordionSections } from '../../../config/productPage'

export default function ProductAccordions({ product }) {
  const sections = [
    {
      id: 'ingredient-bar',
      title: 'Ingredient bar',
      content: (
        <IngredientBars ingredients={product.ingredients} note={product.ingredientNote} />
      ),
    },
    ...productAccordionSections.map((section) => ({
      id: section.id,
      title: section.title,
      content: <p className="text-sm leading-relaxed text-text-muted">{section.body}</p>,
    })),
  ]

  return <Accordion sections={sections} defaultOpenId="ingredient-bar" />
}
