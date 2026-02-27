import { useEffect, useRef, useState } from 'preact/hooks'
import { cn } from '../lib/cn.ts'
import { primaryColor, theme } from '../state.ts'

export function Switch({
  checked,
  onChange,
  disabled = false,
  className = '',
}: {
  checked?: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const [internal, setInternal] = useState<boolean>(checked ?? false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [didMount, setDidMount] = useState(false)

  useEffect(() => {
    if (checked !== undefined) setInternal(checked)
  }, [checked])

  const isOn = checked === undefined ? internal : checked

  function toggle(e: preact.TargetedPointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (disabled) return
    const next = !isOn
    if (checked === undefined) setInternal(next)
    onChange?.(next)
  }

  useEffect(() => {
    if (buttonRef.current && !didMount) {
      setTimeout(() => {
        setDidMount(true)
      }, 500)
    }
  }, [buttonRef])

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={isOn}
      onPointerDown={toggle}
      disabled={disabled}
      className={cn(
        'inline-flex items-center w-6 h-4 p-1 rounded-sm border-2',
        className,
        {
          'transition-colors duration-200': didMount,
          'border-orange-600': isOn,
          'border-black': !isOn,
          'opacity-50 cursor-not-allowed': disabled,
        },
      )}
      style={{
        borderColor: isOn ? primaryColor.value : 'transparent',
        backgroundImage: `linear-gradient(to bottom, ${theme.value.black} , #ffffff22)`,
      }}
    >
      <span
        aria-hidden
        className={`block bg-neutral-500 group-hover:bg-white w-0.5 h-1.5 transform ${
          didMount ? 'transition-transform duration-200' : ''
        } `
          + `${isOn ? 'translate-x-2.5' : 'translate-x-0'}`}
      />
    </button>
  )
}

export default Switch
