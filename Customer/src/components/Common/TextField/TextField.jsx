import { cn } from '../../../utils/classNames'

// A plain input/textarea/select rather than MUI's TextField: no `!` prefix needed for colours,
// and it avoids the theme's global pill radius on multi-line and select controls.
export default function TextField({
  id,
  label,
  as = 'input',
  error,
  className,
  options,
  required,
  ...props
}) {
  const Tag = as === 'textarea' ? 'textarea' : as === 'select' ? 'select' : 'input'
  const isPill = Tag === 'input'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm">
          {label}
          {required && <span className="text-accent"> *</span>}
        </label>
      )}

      <Tag
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'w-full border px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-text-muted',
          isPill ? 'rounded-full' : 'rounded-2xl',
          error ? 'border-accent' : 'border-charcoal/20 focus:border-charcoal',
        )}
        {...props}
      >
        {as === 'select'
          ? options?.map((option) => (
              <option key={option.value ?? option} value={option.value ?? option}>
                {option.label ?? option}
              </option>
            ))
          : undefined}
      </Tag>

      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  )
}
