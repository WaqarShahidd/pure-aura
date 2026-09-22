import { cn } from '../../../utils/classNames'

// Every product image is null until the admin panel supplies real assets. A grid of identical
// sage squares reads as a broken page, so the tint is varied deterministically per handle —
// the same product always gets the same tile. All of this disappears once `src` is non-null.
//
// Class names are written out in full because Tailwind scans source text; a constructed
// string like `bg-${token}` would never be generated.
const TINTS = ['bg-sage', 'bg-sage-dark', 'bg-cream', 'bg-olive/20', 'bg-charcoal/5']

const ASPECTS = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  auto: '',
}

function tintFor(seed = '') {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997
  }
  return TINTS[hash % TINTS.length]
}

export default function ImagePlaceholder({
  src,
  alt = '',
  seed,
  aspect = 'square',
  rounded = 'rounded-2xl',
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        ASPECTS[aspect],
        rounded,
        tintFor(seed || alt),
        className,
      )}
    >
      {src && <img src={src} alt={alt} className="h-full w-full object-cover" />}
      {children}
    </div>
  )
}
