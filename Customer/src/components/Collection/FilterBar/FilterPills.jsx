import FilterPill from './FilterPill'
import { countActive } from '../../../utils/productFilters'

// The facet definitions arrive as a prop rather than an import: they are admin-managed
// now, so the set of pills is data, not a constant.
export default function FilterPills({ defs = [], facets, active, onToggle, onClear, onClearAll }) {
  const total = countActive(active)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {defs.map((def) => (
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
