import type { Doc, Widget } from 'editor'

export type WidgetCacheEntry = { doc: Doc; widget: Widget } & Record<string, unknown>
