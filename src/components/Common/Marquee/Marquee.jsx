import { cn } from '../../../utils/classNames'

export default function Marquee({
  items,
  className,
  itemClassName,
  speed = 30,
}) {
  const track = (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {items.map((item, index) => (
        <span
          key={index}
          className={cn(
            'whitespace-nowrap text-3xl md:text-5xl font-medium uppercase tracking-wide',
            index % 2 === 1
              ? 'text-transparent [-webkit-text-stroke:1px_white]'
              : 'text-white',
            itemClassName,
          )}
        >
          {item}
        </span>
      ))}
    </div>
  )

  return (
    <div className={cn('overflow-hidden flex', className)}>
      <div
        className="flex shrink-0 animate-marquee"
        style={{ animationDuration: `${speed}s` }}
      >
        {track}
        {track}
      </div>
    </div>
  )
}
