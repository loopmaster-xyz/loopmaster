import { XIcon } from '@phosphor-icons/react'
import { useEffect } from 'preact/hooks'
import { backgroundColor, grayColor } from '../state.ts'
import { Portal } from './Portal.tsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: preact.ComponentChildren
  width?: string
  maxWidth?: string
  className?: string
  contentClassName?: string
  children: preact.ComponentChildren
}

export function Modal({
  isOpen,
  onClose,
  title,
  width = 'w-full',
  maxWidth = 'max-w-lg',
  className = '',
  contentClassName = '',
  children,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = (e: preact.TargetedEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <Portal containerId="modal-root">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div
          className={`border ${width} ${maxWidth} ${className}`}
          style={{ backgroundColor: backgroundColor.value, borderColor: grayColor.value }}
          onClick={handleBackdropClick}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: grayColor.value }}>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="hover:text-white text-2xl leading-none"
                style={{ color: grayColor.value }}
                aria-label="Close modal"
              >
                <XIcon weight="light" size={24} />
              </button>
            </div>
          )}
          <div className={`text-white ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}
