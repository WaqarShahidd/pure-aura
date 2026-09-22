import { cn } from '../../../utils/classNames'

export default function CategoryPills({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            option === active
              ? 'bg-charcoal text-white border-charcoal'
              : 'bg-transparent text-charcoal border-charcoal/20 hover:border-charcoal/40',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
