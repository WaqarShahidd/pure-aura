import TuneIcon from '@mui/icons-material/Tune'
import ViewListIcon from '@mui/icons-material/ViewList'
import GridViewIcon from '@mui/icons-material/GridView'
import FilterPills from './FilterPills'
import SortSelect from './SortSelect'
import { cn } from '../../../utils/classNames'

export default function FilterBar({
  resultCount,
  filtersOpen,
  onToggleFilters,
  view,
  onViewChange,
  sortId,
  onSortChange,
  facets,
  active,
  onToggle,
  onClear,
  onClearAll,
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-charcoal/15 px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-2 text-sm text-accent"
          >
            <TuneIcon fontSize="small" />
            {filtersOpen ? 'Hide filter' : 'Show filter'}
          </button>
          <span className="text-charcoal/20">|</span>
          <span className="text-sm text-charcoal">
            {resultCount} {resultCount === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            {[
              { id: 'list', Icon: ViewListIcon, label: 'List view' },
              { id: 'grid', Icon: GridViewIcon, label: 'Grid view' },
            ].map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={view === id}
                onClick={() => onViewChange(id)}
                className={cn(
                  'transition-colors',
                  view === id ? 'text-charcoal' : 'text-charcoal/35 hover:text-charcoal/60',
                )}
              >
                <Icon fontSize="small" />
              </button>
            ))}
          </div>

          <SortSelect value={sortId} onChange={onSortChange} />
        </div>
      </div>

      {filtersOpen && (
        <div className="mt-5">
          <FilterPills
            facets={facets}
            active={active}
            onToggle={onToggle}
            onClear={onClear}
            onClearAll={onClearAll}
          />
        </div>
      )}
    </div>
  )
}
