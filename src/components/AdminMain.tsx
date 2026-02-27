import {
  ArrowClockwiseIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  DownloadIcon,
  EnvelopeSimpleIcon,
  MegaphoneSimpleIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { useComputed, useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'
import type { Projects, Users } from '../../deno/types.ts'
import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { definitions, definitionToCode } from '../lib/definitions.ts'
import { timeAgo } from '../lib/time-ago.ts'
import { toPascalCase } from '../lib/to-pascal-case.ts'
import { Link, pathname } from '../router.tsx'
import { admin, favIconSvgText, projects } from '../state.ts'
import { AdminIcon } from './Admin.tsx'
import { Avatar } from './Avatar.tsx'
import { Grid } from './Grid.tsx'
import { GridItem } from './GridItem.tsx'
import { Header } from './Header.tsx'
import { Main } from './Main.tsx'
import { Minidenticon } from './Minidenticon.tsx'

type SortColumn = 'createdAt' | 'updatedAt'
const AdminUsers = () => {
  const users = useAsyncMemo(async () => {
    return await api.fetchAdminUsers()
  })
  const sortColumn = useSignal<SortColumn | null>('updatedAt')
  const sortDesc = useSignal(true)
  const setUsers = (fn: (users: Users) => Users) => {
    if (users.value) users.value = fn(users.value)
  }
  const sortedUsers = useComputed(() => {
    const list = users.value ?? []
    const col = sortColumn.value
    if (!col) return list
    return [...list].sort((a, b) => {
      const diff = a[col] - b[col]
      return sortDesc.value ? -diff : diff
    })
  })
  const toggleSort = (col: SortColumn) => {
    if (sortColumn.value === col) sortDesc.value = !sortDesc.value
    else {
      sortColumn.value = col
      sortDesc.value = true
    }
  }
  const SortHeader = ({ col, label }: { col: SortColumn; label: string }) => (
    <th class="cursor-pointer hover:text-white select-none" onClick={() =>
      toggleSort(col)}
    >
      <span class="inline-flex items-center gap-0.5">
        {label}
        {sortColumn.value === col
          ? (sortDesc.value ? <CaretDownIcon size={12} /> : <CaretUpIcon size={12} />)
          : <CaretDownIcon size={12} class="opacity-40" />}
      </span>
    </th>
  )
  return (
    <Main class="px-8 py-4">
      <table class="table-auto text-sm w-full text-left">
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Artist</th>
            <th>Email</th>
            <SortHeader col="createdAt" label="Created At" />
            <SortHeader col="updatedAt" label="Updated At" />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.value.map(user => (
            <tr key={user.id} class="border-t border-white/10">
              <td class="flex items-center justify-center">
                <Avatar userId={user.id}
                  fallback={<Minidenticon username={user.id} width={12} height={12} class="bg-white/20 rounded-full" />}
                  size={24} />
              </td>
              <td>{user.id}</td>
              <td class="text-white">
                <Link to={`/u/${user.id}/${user.artistName}`}>{user.artistName}</Link>
              </td>
              <td class="text-white">
                <Link to={`mailto:${user.email}`}>{user.email}</Link>
              </td>
              <td>{timeAgo(new Date(user.createdAt))} - {new Date(user.createdAt).toLocaleString()}</td>
              <td>{timeAgo(new Date(user.updatedAt))} - {new Date(user.updatedAt).toLocaleString()}</td>
              <td class="inline-flex items-center gap-1">
                {!user.sentWelcomeEmail && (
                  <button class="hover:text-white" title="Send welcome email" onMouseDown={() => {
                    api.sendWelcomeEmail(user.id).then(() => {
                      setUsers(us => us.map(u => u.id === user.id ? { ...u, sentWelcomeEmail: true } : u))
                    }).catch(e => {
                      console.error(e)
                      alert(e instanceof Error ? e.message : 'Failed')
                    })
                  }}>
                    <EnvelopeSimpleIcon size={16} />
                  </button>
                )}
                {(!user.sentBetaEmail || user.email === 'gstagas@gmail.com') && (
                  <button class="hover:text-white" title="Send beta email" onMouseDown={() => {
                    api.sendBetaEmail(user.id).then(() => {
                      setUsers(us => us.map(u => u.id === user.id ? { ...u, sentBetaEmail: true } : u))
                    }).catch(e => {
                      console.error(e)
                      alert(e instanceof Error ? e.message : 'Failed')
                    })
                  }}>
                    <MegaphoneSimpleIcon size={16} />
                  </button>
                )}
                <button class="hover:text-white" title="Delete user" onMouseDown={() => {
                  if (!confirm('Delete this user?')) return
                  api.deleteUser(user.id).then(() => {
                    setUsers(us => us.filter(u => u.id !== user.id))
                  }).catch(e => {
                    console.error(e)
                    alert(e instanceof Error ? e.message : 'Failed')
                  })
                }}>
                  <TrashIcon size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Main>
  )
}

const AdminProjects = () => {
  const projects = useAsyncMemo(async () => {
    return await api.fetchAdminProjects()
  })

  const publicProjects = useAsyncMemo(async () => {
    return await api.fetchAdminPublicProjects()
  })

  const Table = ({ projects }: { projects: Projects }) => (
    <table class="table-auto text-sm w-full text-left">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Artist</th>
          <th>Public</th>
          <th>Comments</th>
          <th>Likes</th>
          <th>Remixes</th>
          <th>Created At</th>
          <th>Updated At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {projects.map(project => (
          <tr key={project.id} class="border-t border-white/10">
            <td>{project.id}</td>
            <td class="text-white">
              <Link to={`/p/${project.id}`}>{project.name}</Link>
            </td>
            <td class="text-white">
              <Link to={`/u/${project.artistName}`}>{project.artistName}</Link>
            </td>
            <td>{project.isPublic ? 'Yes' : 'No'}</td>
            <td>{project.comments?.length ?? 0}</td>
            <td>{project.likes?.length ?? 0}</td>
            <td>{project.remixes?.length ?? 0}</td>
            <td>{new Date(project.createdAt).toLocaleString()}</td>
            <td>{new Date(project.updatedAt).toLocaleString()}</td>
            <td class="items-center justify-center inline-flex">
              <button class="hover:text-white" onMouseDown={() => {
                api.deleteProject(project.id)
              }}>
                <TrashIcon size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <Main class="px-8 py-4 gap-1 flex flex-col text-white/50">
      <button class="hover:text-white flex items-center gap-1" onClick={() => {
        api.reindexPublicProjects().then(() => {
          alert('Done')
        })
      }}>
        <ArrowsClockwiseIcon size={16} />
        Reindex Public Projects
      </button>
      <h2 class="text-lg font-bold">All Projects</h2>
      <Table projects={projects.value ?? []} />
      <h2 class="text-lg font-bold">Public Projects</h2>
      <Table projects={publicProjects.value?.publicProjects ?? []} />
      <h2 class="text-lg font-bold">Public Projects by Timestamp</h2>
      <Table projects={publicProjects.value?.publicProjectsByTimestamp ?? []} />
      <h2 class="text-lg font-bold">Public Projects by User ID</h2>
      <Table projects={publicProjects.value?.publicProjectsByUserId ?? []} />
    </Main>
  )
}

const AdminActions = () => {
  const usersFileRef = useRef<HTMLInputElement>(null)
  const profileImagesFileRef = useRef<HTMLInputElement>(null)
  const backupFileRef = useRef<HTMLInputElement>(null)
  const uploadV1 = async () => {
    const usersFile = usersFileRef.current?.files?.[0]
    const profileImagesFile = profileImagesFileRef.current?.files?.[0]
    if (!usersFile) {
      alert('Select users JSON file')
      return
    }
    try {
      const usersText = await usersFile.text()
      const users = JSON.parse(usersText)
      if (!Array.isArray(users)) {
        alert('Users file: expected JSON array')
        return
      }
      let profileImages: unknown[] = []
      if (profileImagesFile) {
        const profileImagesText = await profileImagesFile.text()
        const parsed = JSON.parse(profileImagesText)
        profileImages = Array.isArray(parsed) ? parsed : []
      }
      const result = await api.uploadUsersFromV1(users, profileImages)
      alert(`Imported ${result.imported} users (${result.skipped} skipped), ${result.avatarsImported} avatars`)
    }
    catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Upload failed')
    }
    usersFileRef.current && (usersFileRef.current.value = '')
    profileImagesFileRef.current && (profileImagesFileRef.current.value = '')
  }
  return (
    <Main class="p-4">
      <label class="flex flex-row items-center gap-2">
        Edit docs
        <input type="checkbox" checked={admin.editDocs} onChange={e => {
          admin.editDocs = (e.target as HTMLInputElement).checked
        }} />
      </label>
      <button class="hover:bg-white/5 p-2" onClick={() => {
        const docs: Record<string, string> = {}
        for (let key in localStorage) {
          if (key.startsWith('docs-')) {
            const [, name] = key.split('-')
            const code = JSON.parse(localStorage.getItem(key)!).buffer.code
            docs[name] = code
          }
        }
        navigator.clipboard.writeText(JSON.stringify(docs, null, 2))
      }}>
        Copy docs to clipboard
      </button>
      <button class="hover:bg-white/5 p-2 flex items-center gap-1" onClick={() => {
        navigator.clipboard.writeText(favIconSvgText.value)
      }}>
        Copy favicon SVG to clipboard
      </button>
      <button class="hover:bg-white/5 p-2 flex items-center gap-1" onClick={() => {
        api.fetchAdminBackup().then(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.zip`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }).catch(e => {
          console.error(e)
          alert(e instanceof Error ? e.message : 'Failed')
        })
      }}>
        <DownloadIcon size={16} />
        Download backup
      </button>
      <div class="flex flex-col gap-2 mt-2">
        <div class="flex items-center gap-2">
          <input ref={backupFileRef} type="file" accept=".zip,application/zip" class="text-sm" />
          <span class="text-white/50 text-sm">backup.zip</span>
        </div>
        <button class="hover:bg-white/5 p-2 flex items-center gap-1 w-fit" onClick={async () => {
          const file = backupFileRef.current?.files?.[0]
          if (!file) {
            alert('Select backup zip file')
            return
          }
          if (!confirm(
            'This will clear all users, projects, one-liners and related data, then restore from the backup. Continue?',
          )) {
            return
          }
          try {
            const result = await api.restoreBackup(file)
            alert(`Restore completed${
              'users' in result
                ? ` (users: ${(result as any).users}, projects: ${(result as any).projects}, one-liners: ${
                  (result as any).oneLiners
                }, avatars: ${(result as any).avatars})`
                : ''
            }`)
          }
          catch (e) {
            console.error(e)
            alert(e instanceof Error ? e.message : 'Restore failed')
          }
          backupFileRef.current && (backupFileRef.current.value = '')
        }}>
          <UploadSimpleIcon size={16} />
          Restore from backup
        </button>
      </div>
      <button class="hover:bg-white/5 p-2 flex items-center gap-1" onClick={() => {
        api.resetMigrations().then(() => {
          alert('Migrations reset. Restart the server to re-run from scratch.')
        })
      }}>
        <ArrowClockwiseIcon size={16} />
        Reset migrations
      </button>
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <input ref={usersFileRef} type="file" accept=".json,application/json" class="text-sm" />
          <span class="text-white/50 text-sm">users.json</span>
        </div>
        <div class="flex items-center gap-2">
          <input ref={profileImagesFileRef} type="file" accept=".json,application/json" class="text-sm" />
          <span class="text-white/50 text-sm">profile_images.json</span>
        </div>
        <button class="hover:bg-white/5 p-2 flex items-center gap-1 w-fit" onClick={uploadV1}>
          <UploadSimpleIcon size={16} />
          Upload Users from V1
        </button>
      </div>
      <button class="hover:bg-white/5 p-2 flex items-center gap-1" onClick={() => {
        if (!confirm('Remove all users except admins?')) {
          return
        }
        api.removeAllUsers().then(result => {
          alert(`Removed ${result.removed} users`)
        }).catch(e => {
          console.error(e)
          alert(e instanceof Error ? e.message : 'Failed')
        })
      }}>
        <TrashIcon size={16} />
        Remove all users
      </button>
      <textarea class="text-black w-full h-full" onClick={e => {
        navigator.clipboard.writeText((e.target as HTMLTextAreaElement).value)
      }} value={[...new Set([...definitions.values()].sort((a, b) => a.name.localeCompare(b.name))
        .map(d => `${definitionToCode(d, true)}: ${d.description.join(' ')}`)).values()].join('\n')}
      >
      </textarea>
      <textarea class="text-black w-full h-full" onClick={e => {
        navigator.clipboard.writeText((e.target as HTMLTextAreaElement).value)
      }} value={projects.value?.filter(p => p.isSaved).map(p => `${p.name}\n------\n${p.doc.code}`).join('\n======\n')}>
      </textarea>
    </Main>
  )
}

export const AdminMain = () => {
  const section = useComputed(() => pathname.value.split('/')[2] ?? '')

  return (
    <>
      <Header>
        <AdminIcon section={section.value} />
        <span class="text-md font-bold">{toPascalCase(section.value)}</span>
      </Header>
      {section.value === 'users'
        ? <AdminUsers />
        : section.value === 'projects'
        ? <AdminProjects />
        : section.value === 'actions'
        ? <AdminActions />
        : (
          <Main class="p-4">
            <Grid cols={3}>
              <GridItem to="/admin/users">
                <AdminIcon section="users" size={24} />
                Users
              </GridItem>
              <GridItem to="/admin/projects">
                <AdminIcon section="projects" size={24} />
                Projects
              </GridItem>
              <GridItem to="/admin/actions">
                <AdminIcon section="actions" size={24} />
                Actions
              </GridItem>
            </Grid>
          </Main>
        )}
    </>
  )
}
