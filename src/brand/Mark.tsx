import { useId } from 'react'

interface MarkProps {
  size?: number
  /** `full` keeps the brand gradient; `mono` inherits currentColor. */
  tone?: 'full' | 'mono'
  className?: string
  /** Slow idle rotation of the spiral blades. */
  animated?: boolean
}

/**
 * VayuDrishti mark — three cyclone blades spiralling around a central eye,
 * ringed by instrument orbits. Rebuilt as vector so it stays crisp at every
 * size and can pick up the page's accent colour.
 */
export default function Mark({
  size = 28,
  tone = 'full',
  className,
  animated = false,
}: MarkProps) {
  const uid = useId().replace(/:/g, '')
  const blade = `blade-${uid}`
  const iris = `iris-${uid}`

  const bladeFill = tone === 'mono' ? 'currentColor' : `url(#${blade})`
  const irisFill = tone === 'mono' ? 'currentColor' : `url(#${iris})`
  const ringStroke = tone === 'mono' ? 'currentColor' : 'var(--teal)'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="VayuDrishti"
    >
      <defs>
        <linearGradient id={blade} x1="20" y1="14" x2="80" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7fd9e6" />
          <stop offset="46%" stopColor="#2e8fa8" />
          <stop offset="100%" stopColor="#16457e" />
        </linearGradient>
        <radialGradient id={iris} cx="0.42" cy="0.34" r="0.78">
          <stop offset="0%" stopColor="#bfeef5" />
          <stop offset="55%" stopColor="#3f9ab4" />
          <stop offset="100%" stopColor="#0d2f52" />
        </radialGradient>
      </defs>

      {/* Instrument orbits */}
      <g stroke={ringStroke} fill="none" opacity={tone === 'mono' ? 0.45 : 0.6}>
        <circle cx="50" cy="50" r="46" strokeWidth="1" strokeDasharray="128 44" strokeLinecap="round" />
        <circle cx="50" cy="50" r="39.5" strokeWidth="0.8" strokeDasharray="92 38" strokeLinecap="round" opacity="0.72" />
      </g>
      {/* Orbit nodes */}
      <g fill="none" stroke={ringStroke} strokeWidth="1" opacity={tone === 'mono' ? 0.6 : 0.85}>
        <circle cx="84.4" cy="34.2" r="2.6" />
        <circle cx="19.5" cy="41.8" r="2.2" />
        <circle cx="61.2" cy="90.4" r="2.2" />
      </g>

      {/* Spiral blades */}
      <g fill={bladeFill} opacity={tone === 'mono' ? 0.92 : 1}>
        {animated && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="34s"
            repeatCount="indefinite"
          />
        )}
        {[0, 120, 240].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg} 50 50)`}
            d="M50 21.5
               C66.5 21.5 78.8 32.8 78.8 47.4
               C78.8 58.6 71.2 66.8 60.4 68.6
               C68.4 63.4 72.4 56.2 72.4 47.4
               C72.4 35.8 63.2 27.8 50 27.8
               Z"
          />
        ))}
      </g>

      {/* Eye */}
      <path
        d="M31.5 50 C38.5 40.6 61.5 40.6 68.5 50 C61.5 59.4 38.5 59.4 31.5 50 Z"
        fill={tone === 'mono' ? 'none' : '#03101f'}
        stroke={tone === 'mono' ? 'currentColor' : '#bfeef5'}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="7.2" fill={irisFill} />
      <circle cx="52.4" cy="47.2" r="2.1" fill="#eaf8fc" opacity={tone === 'mono' ? 0.8 : 1} />
    </svg>
  )
}
