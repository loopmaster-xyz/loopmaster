import { ShareNetworkIcon } from '@phosphor-icons/react'
import { useState } from 'preact/hooks'
import { SocialIcon } from 'react-social-icons'
import { grayColor, primaryColor } from '../state.ts'
import { Modal } from './Modal.tsx'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  trackUrl: string
  trackTitle: string
  userName: string | null | undefined
}

const SocialButton = ({ platform, url, label }: { platform: string; url: string; label: string }) => {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 border bg-black/50 hover:bg-black/5"
      style={{ borderColor: grayColor.value }}
    >
      <SocialIcon as="span" network={platform} style={{ width: 24, height: 24 }} />
      <span>{label}</span>
    </a>
  )
}

export function ShareModal({ isOpen, onClose, trackUrl, trackTitle, userName }: ShareModalProps) {
  const [showCopied, setShowCopied] = useState(false)

  const shareText = `Listen to ${trackTitle} by ${userName || 'Unknown'} on loopmaster`

  const getSocialShareUrl = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${
          encodeURIComponent(
            shareText,
          )
        }&url=${encodeURIComponent(trackUrl)}`
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackUrl)}`
      case 'reddit':
        return `https://reddit.com/submit?url=${
          encodeURIComponent(
            trackUrl,
          )
        }&title=${encodeURIComponent(shareText)}`
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${
          encodeURIComponent(
            shareText + ' ' + trackUrl,
          )
        }`
      case 'telegram':
        return `https://t.me/share/url?url=${
          encodeURIComponent(
            trackUrl,
          )
        }&text=${encodeURIComponent(shareText)}`
      default:
        return ''
    }
  }

  const handleClose = () => {
    setShowCopied(false)
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(trackUrl)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-4 font-[Space_Grotesk] font-light text-md"
          style={{ color: primaryColor.value }}
        >
          <ShareNetworkIcon weight="light" size={20} />
          <span>
            Share Project
          </span>
        </div>
      }
      width="max-w-md w-full"
      maxWidth="max-w-md"
      className="mx-4"
      contentClassName="!p-6"
    >
      <div className="space-y-3">
        <SocialButton platform="x" url={getSocialShareUrl('twitter')} label="Share on X" />
        <SocialButton platform="facebook" url={getSocialShareUrl('facebook')} label="Share on Facebook" />
        <SocialButton platform="reddit" url={getSocialShareUrl('reddit')} label="Share on Reddit" />
        <SocialButton platform="whatsapp" url={getSocialShareUrl('whatsapp')} label="Share on WhatsApp" />
        <SocialButton platform="telegram" url={getSocialShareUrl('telegram')} label="Share on Telegram" />
      </div>
      <div className="mt-4 pt-4 border-t border-[#333]">
        <div className="text-xs text-[#888] mb-2">Or copy link:</div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={trackUrl}
            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-sm text-white"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          {!showCopied && (
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gradient-to-br from-orange-400 to-red-600 text-white rounded hover:opacity-90 text-sm font-medium"
            >
              Copy
            </button>
          )}
          {showCopied && (
            <span className="text-sm text-green-500 font-medium whitespace-nowrap">
              Copied!
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}
