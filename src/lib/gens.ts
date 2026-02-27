import { computed, signal } from '@preact/signals-core'
import { type GenDescriptor, gens as lm3Gens } from 'engine'
import { extra } from './definitions.ts'

export const gens = signal<Record<string, GenDescriptor>>(lm3Gens)

queueMicrotask(() => {
  for (const [name, def] of extra) {
    gens.value[def.name] = {
      name: def.name,
      category: def.category,
      description: def.description.join('\n'),
      parameters: def.parameters?.map(p => ({
        name: p.name,
        description: p.description.join('\n'),
      })) ?? [],
    }
  }
  gens.value = Object.fromEntries(
    Object.entries(gens.value).filter(([, g]) => (g.category ?? 'misc') !== 'test'),
  )
})

export const nameToGenMap = computed(() =>
  new Map<string, GenDescriptor>(
    Object.entries(gens.value).flatMap(([name, gen]) =>
      gen.variants
        ? Object.entries(gen.variants).map(([variantName, description]) =>
          [variantName.toLowerCase(), { ...gen, description }] as [string, GenDescriptor]
        )
        : [[name.toLowerCase(), gen] as [string, GenDescriptor]]
    ),
  )
)
