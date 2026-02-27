import { SocialIcon } from 'react-social-icons'
import { currentProject, currentProjectId, session } from '../state.ts'
import { SidebarButton } from './SidebarButton.tsx'

const SocialButton = ({ platform, url, label }: { platform: string; url: string; label: string }) => {
  return (
    <SidebarButton onClick={() => window.open(url, '_blank')}>
      <SocialIcon as="span" network={platform} style={{ width: 20, height: 20 }}
        className="grayscale hover:grayscale-0 group-hover:grayscale-0" />
      <span>{label}</span>
    </SidebarButton>
  )
}

export const ShareProject = () => {
  const trackUrl = location.origin + '/p/' + currentProject.value?.id
  const trackTitle = `${session.value?.artistName} - ${currentProject.value?.name}`
  const userName = session.value?.artistName

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

  const handleShare = (url: string) => () => {
    window.open(url, '_blank')
  }

  return (
    currentProject.value?.isSaved && currentProject.value?.isPublic
      ? (
        <div class="flex flex-col h-full w-52 py-2.5 gap-0 text-neutral-400 text-sm select-none">
          <SocialButton label="Share on X" platform="x" url={getSocialShareUrl('twitter')} />
          <SocialButton label="Share on Mastodon" platform="mastodon" url={getSocialShareUrl('mastodon')} />
          <SocialButton label="Share on Facebook" platform="facebook" url={getSocialShareUrl('facebook')} />
          <SocialButton label="Share on Reddit" platform="reddit" url={getSocialShareUrl('reddit')} />
          <SocialButton label="Share on WhatsApp" platform="whatsapp" url={getSocialShareUrl('whatsapp')} />
          <SocialButton label="Share on Telegram" platform="telegram" url={getSocialShareUrl('telegram')} />
        </div>
      )
      : (
        <div class="flex flex-col h-full w-52 py-2.5 px-2 gap-0 text-neutral-400 text-sm select-none">
          Save the project and/or make it public before sharing.
        </div>
      )
  )
}
