import { k } from './kv.ts'

export type Migration = {
  version: number
  name: string
  up: (kv: Deno.Kv) => Promise<void>
}

export const MIGRATIONS: readonly Migration[] = [] as const

export async function runMigrations(kv: Deno.Kv) {
  const curr = (await kv.get<number>(k.migrationsVersion())).value ?? 0
  const pending = MIGRATIONS
    .slice()
    .sort((a, b) => a.version - b.version)
    .filter(m => m.version > curr)

  for (const m of pending) {
    await m.up(kv)
    const timestamp = Date.now()
    await kv.atomic()
      .set(k.migrationsVersion(), m.version)
      .set(k.migration(m.version), { version: m.version, name: m.name, timestamp })
      .commit()
  }
}
