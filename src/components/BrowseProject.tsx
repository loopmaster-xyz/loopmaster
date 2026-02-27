import { CircleNotchIcon, HeartIcon, PaperPlaneRightIcon, ShareNetworkIcon, TrashIcon } from '@phosphor-icons/react'
import { useSignal } from '@preact/signals'
import { SocialIcon } from 'react-social-icons'
import { isMobile } from 'utils/is-mobile'
import { luminate } from 'utils/rgb'
import type { Project } from '../../deno/types.ts'
import { api } from '../api.ts'
import { cn } from '../lib/cn.ts'
import { signalify } from '../lib/signalify.ts'
import { timeAgo } from '../lib/time-ago.ts'
import { Link } from '../router.tsx'
import { primaryColor, primaryGradientA, session, sidebarTab, theme } from '../state.ts'
import { Avatar } from './Avatar.tsx'
import { HeartGradientIcon } from './Icons.tsx'
import { InlineEditor } from './InlineEditor.tsx'
import { Minidenticon } from './Minidenticon.tsx'

export const BrowseProject = (
  { project, autoHeight = false, header, headerHeight = 48 }: { project: Project; autoHeight?: boolean;
    header?: ((inner?: preact.ComponentChildren) => preact.ComponentChildren) | null; headerHeight?: number },
) => {
  signalify(project)
  project.likes.forEach(like => {
    signalify(like)
  })
  project.comments.forEach(comment => {
    signalify(comment)
  })
  project.remixes.forEach(remix => {
    signalify(remix)
  })
  const rows = useSignal(1)
  const commentText = useSignal('')
  const commentSending = useSignal(false)
  const handleChange = (event: Event) => {
    const textarea = event.target as HTMLTextAreaElement
    rows.value = textarea.value.split('\n').length
    commentText.value = textarea.value
  }
  const handleCommentSend = async () => {
    const commentTextToSend = commentText.value
    commentText.value = ''
    commentSending.value = true
    try {
      const comment = await api.commentProject(project.id, commentTextToSend)
      project.comments = [...project.comments, comment]
      rows.value = 1
    }
    finally {
      commentSending.value = false
    }
  }
  return (
    <div key={project.id} class="flex flex-col">
      <InlineEditor
        id={project.id}
        code={project.code}
        autoHeight={autoHeight}
        class={!autoHeight ? 'w-full h-[45dvh]' : 'w-full h-full'}
        headerHeight={headerHeight}
        header={header
          || ((inner?: preact.ComponentChildren) => (
            <div class="h-[48px] px-4 bg-black/40 flex flex-row items-center justify-start relative gap-3">
              <div class="flex flex-row gap-2 items-center justify-start">
                <Link to={`/u/${project.userId}/${project.artistName}`}
                  class={`inline-flex flex-row items-center gap-2 text-[${primaryColor.value}] hover:text-[${primaryGradientA.value}]`}
                >
                  <Avatar userId={project.userId} size={16}
                    fallback={
                      <Minidenticon username={project.userId} width={16} height={16} class="bg-white/20 rounded-full" />
                    } />
                  {project.artistName}
                </Link>{' '}
                - <Link to={`/p/${project.id}`} class="text-white hover:underline">{project.name}</Link>
                <span class="ml-1.5 text-white/50 text-xs h-5 flex items-end justify-end flex-col">
                  {timeAgo(new Date(project.updatedAt))}
                </span>
              </div>
              {!isMobile() && (
                <>
                  <button class="group h-5 flex flex-row gap-1 text-xs items-end justify-end" onClick={() => {
                    if (!session.value) {
                      alert('You must be logged in to like a project')
                      sidebarTab.value = 'account'
                      return
                    }
                    if (session.value.likes?.includes(project.id)) {
                      session.value = {
                        ...session.value,
                        likes: session.value.likes?.filter(l => l !== project.id) ?? [],
                      }
                      project.likes = project.likes.filter(l =>
                        l.userId !== session.value!.userId
                      )
                      api.unlikeProject(project.id)
                      return
                    }
                    else {
                      session.value = {
                        ...session.value,
                        likes: [...(session.value?.likes ?? []), project.id],
                      }
                      project.likes = [...project.likes, {
                        userId: session.value.userId,
                        artistName: session.value.artistName,
                      }]
                      api.likeProject(project.id)
                    }
                  }}>
                    <div class="relative -top-[1px]">
                      {session.value?.likes?.includes(project.id)
                        ? <HeartGradientIcon size={16} />
                        : <HeartIcon size={16} weight="regular" class="group-hover:opacity-0" />}
                      {!session.value?.likes?.includes(project.id) && (
                        <HeartIcon size={16} weight={session.value?.likes?.includes(project.id) ? 'regular' : 'fill'}
                          class="absolute inset-0 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                    <span>{project.likes.length}</span>
                  </button>
                  <button class="group h-5 items-end justify-end">
                    <div class="relative top-[1px] flex flex-row gap-2 items-center justify-center">
                      <ShareNetworkIcon size={16} />
                      <div class="opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100 origin-left group-hover:transition-all group-hover:duration-200 flex flex-row gap-2">
                        <SocialIcon as="span" network={'x'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                        <SocialIcon as="span" network={'mastodon'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                        <SocialIcon as="span" network={'facebook'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                        <SocialIcon as="span" network={'reddit'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                        <SocialIcon as="span" network={'whatsapp'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                        <SocialIcon as="span" network={'telegram'} style={{ width: 20, height: 20 }}
                          className="grayscale hover:grayscale-0" />
                      </div>
                    </div>
                  </button>
                </>
              )}
              {inner}
            </div>
          ))}
      />
      <div class={`bg-[${luminate(theme.value.black, 0.04)}]`}>
        <div class="bg-black/40 flex flex-col">
          {project.comments.length
            ? (
              <div class="flex flex-col justify-start py-2 text-sm border-b-2 border-white/5">
                {project.comments.sort((a, b) => a.createdAt - b.createdAt).map(comment => (
                  <div key={comment.id}
                    class="group w-full flex flex-row gap-2 py-0.5 px-3 items-center justify-start hover:bg-white/5"
                  >
                    <div class="flex flex-row gap-2 items-center justify-start">
                      <Link to={`/u/${comment.userId}/${comment.artistName}`}
                        class="flex flex-row gap-2 items-center justify-start hover:text-white"
                      >
                        <Avatar userId={comment.userId}
                          fallback={
                            <Minidenticon username={comment.userId} width={16} height={16}
                              class="bg-white/20 rounded-full" />
                          } />
                        {comment.artistName}
                      </Link>
                      {/* <span class="text-white/50 text-xs">{timeAgo(new Date(comment.createdAt))}</span> */}
                    </div>
                    <span class="text-white">{comment.comment}</span>
                    {session.value?.userId === comment.userId && (
                      <button class="opacity-0 group-hover:opacity-100 text-white/50 text-xs hover:text-white ml-auto"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this comment?')) {
                            api.deleteComment(project.id, comment.id)
                            project.comments = project.comments.filter(c => c.id !== comment.id)
                          }
                        }}
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
            : null}
          {!isMobile() && (session.value
            ? (
              <div class="relative flex flex-row gap-2 items-end justify-start">
                {commentSending.value
                  ? (
                    <div class="relative right-1 flex flex-row gap-2 cursor-wait w-full items-center justify-start text-white/30 text-sm py-2 px-4">
                      <CircleNotchIcon size={16} class="animate-spin" />
                      <span>Sending...</span>
                    </div>
                  )
                  : (
                    <>
                      <div class="absolute top-2.5 left-3">
                        <Avatar userId={session.value?.userId ?? ''} size={16}
                          fallback={
                            <Minidenticon username={session.value?.userId ?? ''} width={16} height={16}
                              class="bg-white/20 rounded-full" />
                          } />
                      </div>
                      <textarea
                        class="text-sm text-white bg-transparent w-full px-4 pl-9 py-2 outline-none resize-none"
                        wrap="off"
                        rows={rows}
                        value={commentText}
                        onChange={handleChange}
                        onKeyDown={(e: KeyboardEvent) => {
                          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                            handleCommentSend()
                            e.preventDefault()
                          }
                        }}
                        placeholder="Leave a comment..."
                      >
                      </textarea>
                    </>
                  )}
                <button
                  class={cn(
                    `flex flex-row gap-2 items-center justify-center text-sm text-white hover:bg-[${
                      luminate(theme.value.black, 0.01)
                    }77] px-4 py-2`,
                    { 'opacity-50 cursor-wait': commentSending.value },
                  )}
                  disabled={commentSending.value}
                  onClick={handleCommentSend}
                >
                  {commentSending.value ? 'Sending...' : 'Send'}
                  {commentSending.value
                    ? <CircleNotchIcon size={16} class="animate-spin" />
                    : <PaperPlaneRightIcon size={16} />}
                </button>
              </div>
            )
            : (
              <div class="relative flex flex-row gap-2 items-end justify-start">
                <div class="text-white/50 text-sm py-2 px-4 flex flex-row gap-1 items-center justify-start">
                  <button onClick={() => {
                    sidebarTab.value = 'account'
                  }} class="text-white hover:underline">
                    Log in
                  </button>
                  to leave a comment.
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
