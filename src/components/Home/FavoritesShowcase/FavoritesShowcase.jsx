import { useState } from 'react'
import SectionHeading, { Accent } from '../../Common/SectionHeading/SectionHeading'
import CategoryPills from '../../Common/CategoryPills/CategoryPills'
import ProductCard from '../../Common/ProductCard/ProductCard'
import { categories, featuredProduct, products } from './products.data'

export default function FavoritesShowcase() {
  const [activeCategory, setActiveCategory] = useState(categories[0])

  return (
    <section>
      <div className="bg-sage px-6 py-14 text-center md:px-10">
        <SectionHeading as="p" size="lg" className="mx-auto max-w-4xl">
          Own your <Accent>Glow</Accent>. Feeling confident in the skin you&apos;re in.
        </SectionHeading>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="mb-8 text-center">
          <SectionHeading size="md">
            Our <Accent>favorite</Accent>.
          </SectionHeading>
        </div>

        <div className="mb-10">
          <CategoryPills
            options={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl bg-sage md:col-span-1">
            {featuredProduct.image && (
              <img
                src={featuredProduct.image}
                alt={featuredProduct.title}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-medium drop-shadow">{featuredProduct.discountLabel}</p>
              <p className="text-lg font-semibold drop-shadow">{featuredProduct.title}</p>
            </div>
          </div>

          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  )
}
