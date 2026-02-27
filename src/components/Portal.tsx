import { ComponentChildren, render } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

interface PortalProps {
  children: ComponentChildren
  containerId?: string // optional, defaults to body
}

export function Portal({ children, containerId }: PortalProps) {
  const elRef = useRef<HTMLElement | null>(null)

  if (!elRef.current) {
    elRef.current = document.createElement('div')
  }

  useEffect(() => {
    const container = containerId
      ? document.getElementById(containerId) || document.body
      : document.body

    container.appendChild(elRef.current!)

    render(children, elRef.current!)

    return () => {
      if (elRef.current?.parentNode) {
        elRef.current.parentNode.removeChild(elRef.current)
      }
    }
  }, [children, containerId])

  return null
}
