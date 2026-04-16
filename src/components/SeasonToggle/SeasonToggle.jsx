import './SeasonToggle.css'

export function SeasonToggle({ value, onChange }) {
  return (
    <div className="season-toggle">
      <button
        className={`season-toggle__btn ${value === 'playoffs' ? 'season-toggle__btn--active' : ''}`}
        onClick={() => onChange('playoffs')}
      >
        Playoffs
      </button>
      <button
        className={`season-toggle__btn ${value === 'regular' ? 'season-toggle__btn--active' : ''}`}
        onClick={() => onChange('regular')}
      >
        Regular Season
      </button>
    </div>
  )
}
