import { primaryGradientStyle } from '../state.ts'

export const Logo = (
  {
    text = 'lm',
    size = '2.5em',
    textShadow = false,
    onClick,
    onContextMenu,
    class: className = '',
  }: {
    text?: string
    size?: string
    textShadow?: boolean
    onClick?: preact.MouseEventHandler<HTMLHeadingElement>
    onContextMenu?: preact.MouseEventHandler<HTMLHeadingElement>
    class?: string
  },
) => (
  <h1
    onClick={onClick}
    onContextMenu={onContextMenu}
    class={`text-[${size}] relative font-extrabold font-[Turret_Road] select-none ${
      onClick || onContextMenu ? 'cursor-pointer' : ''
    } ${className}`}
  >
    <span class="text-transparent">{text}</span>
    <span class="bg-clip-text text-transparent absolute z-10 left-0" style={primaryGradientStyle.value}>{text}</span>
    {textShadow && (
      <span class="text-black absolute top-0.5 left-0" style={{
        textShadow: `0px 0px 5px #0003`,
      }}>
        {text}
      </span>
    )}
  </h1>
)
