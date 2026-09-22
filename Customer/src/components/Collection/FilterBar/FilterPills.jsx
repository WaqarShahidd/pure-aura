import FilterPill from './FilterPill'
import { FILTER_DEFS } from '../../../config/filters'
import { countActive } from '../../../utils/productFilters'

export default function FilterPills({ facets, active, onToggle, onClear, onClearAll }) {
  const total = countActive(active)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {FILTER_DEFS.map((def) => (
        <FilterPill
          key={def.id}
          def={def}
          options={facets[def.id] ?? []}
          selected={active[def.id]}
          onToggle={onToggle}
          onClear={onClear}
        />
      ))}

      {total > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-accent underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Clear all ({total})
        </button>
      )}
    </div>
  )
}
