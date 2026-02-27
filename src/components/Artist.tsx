import { CircleNotchIcon, PencilSimpleIcon, SignOutIcon, UploadSimpleIcon, UserPlusIcon } from '@phosphor-icons/react'
import { useComputed, useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'
import { luminate } from 'utils/rgb'
import type { Session } from '../../deno/types.ts'
import { api } from '../api.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { cn } from '../lib/cn.ts'
import { resizeImageToJpeg } from '../lib/resize-image-to-jpeg.ts'
import { Link, pathname } from '../router.tsx'
import { backgroundColor, browseProjects, cacheBust, session, userProjectsCount } from '../state.ts'
import { Avatar } from './Avatar.tsx'
import { Minidenticon } from './Minidenticon.tsx'
import { SidebarMain } from './SidebarMain.tsx'

const ArtistButton = (
  { children, onClick, disabled }: { children: preact.ComponentChildren; onClick?: () => void; disabled?: boolean },
) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      class={cn(
        'text-white/50 text-sm flex flex-row items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10',
        { 'opacity-50 cursor-wait': disabled },
        { 'hover:bg-white/5 focus:bg-white/5': !disabled },
      )}
    >
      {children}
    </button>
  )
}

export const Artist = ({ session: propsSession }: { session?: Session }) => {
  const accountSession = useSignal<Session | null>(propsSession ?? null)
  const isLogoutLoading = useSignal(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploadingAvatar = useSignal(false)
  const isEditingArtistName = useSignal(false)
  const artistNameRef = useRef<HTMLHeadingElement>(null)
  const userId = useComputed(() => accountSession.value?.userId ?? pathname.value.split('/')[2] ?? '')

  useReactiveEffect(() => {
    if (session.value && !propsSession && userId.value === session.value.userId) {
      accountSession.value = session.value
    }
  })

  const logout = async () => {
    try {
      isLogoutLoading.value = true
      await api.logout()
    }
    finally {
      isLogoutLoading.value = false
    }
  }

  const handleImageUpload = async (e: preact.TargetedEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0]

    if (!file?.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      isUploadingAvatar.value = true

      const resizedBlob = await resizeImageToJpeg(file, 190)
      await api.uploadAvatar(resizedBlob)

      cacheBust.value++
    }
    catch (err: any) {
      alert(err.message || 'Failed to upload image')
    }
    finally {
      isUploadingAvatar.value = false
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmitArtistName = () => {
    const artistName = artistNameRef.current?.innerText.trim()
    if (artistName) {
      api.updateArtistName(artistName)
      session.value!.artistName = artistName
      browseProjects.value?.forEach(project => {
        if (project.userId === session.value!.userId) {
          project.artistName = artistName
        }
        project.likes.forEach(like => {
          if (like.userId === session.value!.userId) {
            like.artistName = artistName
          }
        })
        project.remixes.forEach(remix => {
          if (remix.userId === session.value!.userId) {
            remix.artistName = artistName
          }
        })
        project.comments.forEach(comment => {
          if (comment.userId === session.value!.userId) {
            comment.artistName = artistName
          }
        })
      })
    }
    else {
      artistNameRef.current!.innerText = accountSession.value!.artistName!
    }
    isEditingArtistName.value = false
  }

  useReactiveEffect(() => {
    if (artistNameRef.current && isEditingArtistName.value) {
      setTimeout(() => artistNameRef.current?.focus(), 0)
      artistNameRef.current.addEventListener('blur', handleSubmitArtistName, { once: true })
    }
  })

  return (
    <SidebarMain class="my-3.5 gap-3 text-center items-center justify-center">
      {accountSession.value && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      )}
      <button class={cn(
        'group relative flex items-center justify-center',
        { 'cursor-pointer': accountSession.value },
        { 'cursor-default': !accountSession.value },
      )} onClick={() => {
        if (accountSession.value) fileInputRef.current?.click()
      }}>
        <Avatar
          userId={userId.value}
          size={190}
          fallback={<Minidenticon username={userId.value} width="190px" class="bg-white/10 rounded-full" />}
        />
        {accountSession.value && (
          <span
            class={`opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 bg-[${
              luminate(backgroundColor.value, 0.4)
            }] bg-opacity-30 rounded-full p-1 text-white group-hover:text-white`}
            onClick={() => {}}
          >
            <UploadSimpleIcon size="24" />
          </span>
        )}
      </button>
      <div class="flex flex-col gap-1">
        <h1 ref={artistNameRef}
          class="relative text-xl text-white font-bold text-center outline-none focus:bg-white/5 px-2"
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              handleSubmitArtistName()
              e.preventDefault()
            }
            if (e.key === 'Escape') {
              isEditingArtistName.value = false
              artistNameRef.current!.innerText = accountSession.value!.artistName!
              e.preventDefault()
            }
          }} contentEditable={isEditingArtistName.value}
        >
          {accountSession.value?.artistName ?? pathname.value.split('/')[3] ?? ''}
          {accountSession.value && !isEditingArtistName.value && (
            <button class="absolute top-1 -right-4 text-neutral-600 hover:text-white" onClick={() => {
              isEditingArtistName.value = true
            }}>
              <PencilSimpleIcon size="20" />
            </button>
          )}
        </h1>
        {accountSession.value && (
          <Link to={`/u/${accountSession.value.userId}/${accountSession.value.artistName}`}>
            @{accountSession.value.artistName}
          </Link>
        )}
        {userProjectsCount.value ? `${userProjectsCount.value} tracks` : null}
      </div>
      {accountSession.value
        ? (
          <ArtistButton onClick={logout} disabled={isLogoutLoading.value}>
            {isLogoutLoading.value
              ? <CircleNotchIcon size={16} class="animate-spin" />
              : <SignOutIcon size={16} class="group-hover:text-white" />}
            {isLogoutLoading.value ? 'Logging out...' : 'Logout'}
          </ArtistButton>
        )
        : (
          <ArtistButton>
            <UserPlusIcon size={16} />
            Follow
          </ArtistButton>
        )}
    </SidebarMain>
  )
}
