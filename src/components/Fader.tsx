import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { primaryGradientA, primaryGradientB } from '../state.ts'

interface FaderProps {
  value: number
  min: number
  max: number
  step?: number
  faderWidth?: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
  mode?: 'crossfade' | 'volume'
}

export function Fader({
  value,
  min,
  max,
  step = 0.01,
  faderWidth = 12, // in pixels
  onChange,
  className = '',
  'aria-label': ariaLabel,
  mode = 'crossfade',
}: FaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const normalized = (value - min) / (max - min)
  const percentage = normalized * 200

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const newNormalized = Math.max(0, Math.min(1, x / rect.width))
      const newValue = min + newNormalized * (max - min)

      if (step) {
        const steppedValue = Math.round(newValue / step) * step
        onChange(steppedValue)
      }
      else {
        onChange(newValue)
      }
    },
    [min, max, step, onChange],
  )

  const handleMouseDown = (e: preact.TargetedMouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    handleInteraction(e.clientX)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleInteraction])

  return (
    <div
      ref={containerRef}
      className={`relative cursor-pointer select-none ${className}`}
      onMouseDown={handleMouseDown}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault()
          onChange(Math.max(min, value - (step || 0.01)))
        }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault()
          onChange(Math.min(max, value + (step || 0.01)))
        }
      }}
    >
      {mode === 'volume'
        ? (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 30"
            preserveAspectRatio="none"
            className="block"
          >
            {/* Track background (single trapezoid from right to left, starting from 200) */}
            <polygon points="200,25 0,15 0,15 200,5" fill="#444" />

            {/* Active track (fills from right to handle position, starting from 200) */}
            {/* Active track with clip-path, filling from right to current value */}
            <g
              style={{
                clipPath: `inset(0px ${(1 - normalized) * 200}px 0px 0px)`,
              }}
            >
              <polygon points="200,25 0,15 0,15 200,5" fill="#ff7316" opacity="0.7" />
            </g>

            {/* Handle */}
            <g transform={`translate(${normalized * (200 - faderWidth) + faderWidth / 2}, 0)`}>
              {/* Handle body */}
              <polygon
                points={`-${faderWidth / 2},0 ${faderWidth / 2},0 ${faderWidth / 2},30 -${faderWidth / 2},30`}
                fill="#f97316"
                stroke="#ff8c42"
                strokeWidth="0.5"
              />
            </g>
          </svg>
        )
        : (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 30"
            preserveAspectRatio="none"
            className="block"
          >
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2=".75" y2=".75">
                <stop offset="0%" stop-color={primaryGradientA.value} />
                <stop offset="100%" stop-color={primaryGradientB.value} />
              </linearGradient>
            </defs>

            {/* Track background (two trapezoids from edges to center) */}
            <polygon points="0,25 100,15 100,15 0,5" fill="#fff1" />
            <polygon points="100,15 200,25 200,5 100,15" fill="#fff1" />

            {/* Active track based on crossfade position */}
            {normalized <= 0.5
              ? (
                /* Left side active when crossfade is on left half */
                <g
                  style={{
                    clipPath: `inset(0px 0px 0px ${normalized * 200}px)`,
                  }}
                >
                  <polygon points="0,25 100,15 100,15 0,5" fill="url(#gradient)" opacity="0.7" />
                </g>
              )
              : (
                /* Right side active when crossfade is on right half */
                <g
                  style={{
                    clipPath: `inset(0px ${(0.5 - (normalized - 0.5)) * 200}px 0px 0px)`,
                  }}
                >
                  <polygon points="100,15 200,25 200,5 100,15" fill="url(#gradient)" opacity="0.7" />
                </g>
              )}

            {/* Handle */}
            <g transform={`translate(${normalized * (200 - faderWidth) + faderWidth / 2}, 0)`}>
              {/* Handle body */}
              <polygon
                points={`-${faderWidth / 2},0 ${faderWidth / 2},0 ${faderWidth / 2},30 -${faderWidth / 2},30`}
                fill="url(#gradient)"
                stroke="url(#gradient)"
                strokeWidth="0.5"
              />
            </g>
          </svg>
        )}
    </div>
  )
}
