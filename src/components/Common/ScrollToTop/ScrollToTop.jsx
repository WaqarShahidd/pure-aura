import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { useScrollPosition } from '../../../utils/useScrollPosition'
import { cn } from '../../../utils/classNames'

export default function ScrollToTop() {
  const visible = useScrollPosition(400)

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-white shadow-lg transition-opacity duration-300',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ArrowUpwardIcon fontSize="small" />
    </button>
  )
}
