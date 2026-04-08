import './LoadingSpinner.css'

export function LoadingSpinner({ size = 28, label = 'Loading…' }) {
  return (
    <div className="spinner-wrapper" role="status" aria-label={label}>
      <div
        className="spinner"
        style={{ width: size, height: size, borderWidth: Math.max(2, size / 12) }}
      />
      <span className="spinner-label">{label}</span>
    </div>
  )
}
