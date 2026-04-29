/**
 * Kata Design System — Icon Component
 * Phase 81: KDS-02
 *
 * Wraps Material Symbols Outlined web font glyphs.
 * The CDN <link> for Material Symbols is loaded in app/layout.tsx.
 *
 * Usage: <Icon name="search" size={16} />
 * Replaces all lucide-react imports across the codebase.
 */

interface IconProps {
  name: string
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

export function Icon({
  name,
  size = 20,
  className = '',
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={{
        fontSize: size,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
        lineHeight: 1,
        verticalAlign: 'middle',
        userSelect: 'none',
      }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  )
}
