import { ClockIcon, CodeIcon, FireSimpleIcon, HeartIcon, StarIcon } from '@phosphor-icons/react'
import { session } from '../state.ts'
import { SidebarLink } from './SidebarLink.tsx'
import { SidebarMain } from './SidebarMain.tsx'

export const Browse = () => {
  return (
    <SidebarMain>
      <SidebarLink to="/browse/newest">
        <ClockIcon size={16} class="group-hover:text-white" />
        <span>Newest</span>
      </SidebarLink>
      {
        /* <SidebarLink to="/browse/popular">
        <StarIcon size={16} class="group-hover:text-white" />
        <span>Popular</span>
      </SidebarLink>
      <SidebarLink to="/browse/hottest">
        <FireSimpleIcon size={16} class="group-hover:text-white" />
        <span>Hottest</span>
      </SidebarLink> */
      }
      <SidebarLink to="/browse/one-liners">
        <CodeIcon size={16} class="group-hover:text-white" />
        <span>One-Liners</span>
      </SidebarLink>
      {session.value && (
        <SidebarLink to="/browse/liked">
          <HeartIcon size={16} class="group-hover:text-white" />
          <span>Liked</span>
        </SidebarLink>
      )}
    </SidebarMain>
  )
}
