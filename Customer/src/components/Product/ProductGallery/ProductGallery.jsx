import { useState } from 'react'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import { cn } from '../../../utils/classNames'

export default function ProductGallery({ product }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const images = product.images?.length ? product.images : [product.image]

  return (
    <div className="flex flex-col gap-4">
      <ImagePlaceholder
        src={images[activeIndex]}
        alt={product.title}
        seed={`${product.handle}-${activeIndex}`}
      />

      {images.length > 1 && (
        <div className="grid grid-cols-2 gap-4">
          {images.slice(1).map((image, index) => {
            const thumbIndex = index + 1
            return (
              <button
                key={thumbIndex}
                type="button"
                aria-label={`View image ${thumbIndex + 1}`}
                onClick={() => setActiveIndex(thumbIndex)}
                className={cn(
                  'overflow-hidden rounded-2xl transition-shadow',
                  activeIndex === thumbIndex && 'ring-2 ring-charcoal ring-offset-2',
                )}
              >
                <ImagePlaceholder
                  src={image}
                  alt={`${product.title} view ${thumbIndex + 1}`}
                  seed={`${product.handle}-${thumbIndex}`}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
