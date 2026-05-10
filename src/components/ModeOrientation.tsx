type OrientationPoint = {
  label: string
  detail: string
}

type Props = {
  kicker: string
  title: string
  body: string
  points?: OrientationPoint[]
}

export function ModeOrientation({ kicker, title, body, points = [] }: Props) {
  return (
    <section className="mode-orientation" aria-label={`${title} orientation`}>
      <div className="mode-orientation-copy">
        <p className="detail-kicker">{kicker}</p>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {points.length > 0 && (
        <ul className="mode-orientation-points">
          {points.map((point) => (
            <li key={point.label}>
              <strong>{point.label}</strong>
              <span>{point.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
