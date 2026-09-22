import { Link } from 'react-router-dom'

// Anchored under its own nav item, unlike the full-width mega and flyout panels.
export default function ListPanel({ item, onNavigate }) {
  return (
    <div className="absolute left-0 top-full z-50 min-w-56 overflow-hidden rounded-2xl border border-charcoal/10 bg-white py-2 shadow-lg">
      <ul>
        {item.children.map((child) => (
          <li key={child.label}>
            <Link
              to={child.href}
              onClick={onNavigate}
              className="block px-5 py-2.5 text-sm text-charcoal transition-colors hover:bg-sage"
            >
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
