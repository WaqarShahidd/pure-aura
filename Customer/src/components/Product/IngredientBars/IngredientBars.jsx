import ProgressBar from '../../Common/ProgressBar/ProgressBar'

// Bars show the literal share of the formula, so a 5% active reads as a 5% bar. Scaling them
// against the largest listed ingredient would make four equal actives all look like 100%.
export default function IngredientBars({ ingredients, note }) {
  return (
    <div className="flex flex-col gap-4">
      {ingredients.map((ingredient) => (
        <ProgressBar
          key={ingredient.name}
          value={ingredient.percent / 100}
          label={ingredient.name}
          valueLabel={`${ingredient.percent}%`}
        />
      ))}
      {note && <p className="text-xs leading-relaxed text-text-muted">{note}</p>}
    </div>
  )
}
