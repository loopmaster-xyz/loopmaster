import { primaryGradientA, primaryGradientB } from '../state.ts'

export const GradientIcon = (
  { path, size = 24, class: className }: { path: string; size?: number; class?: string },
) => (
  <svg width={size} height={size} viewBox="0 0 256 256" class={className}>
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2=".75" y2=".75">
        <stop offset="0%" stop-color={primaryGradientA.value} />
        <stop offset="100%" stop-color={primaryGradientB.value} />
      </linearGradient>
    </defs>
    <path d={path} fill="url(#gradient)" />
  </svg>
)

export const PlayGradientIcon = ({ size = 24 }: { size?: number }) => (
  <GradientIcon size={size}
    path="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
)

export const PauseGradientIcon = ({ size = 24 }: { size?: number }) => (
  <GradientIcon size={size}
    path="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z" />
)

export const StopGradientIcon = ({ size = 24 }: { size?: number }) => (
  <GradientIcon size={size}
    path="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" />
)

export const HeartGradientIcon = ({ size = 24, class: className }: { size?: number; class?: string }) => (
  <GradientIcon size={size} class={className}
    path="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z" />
)
