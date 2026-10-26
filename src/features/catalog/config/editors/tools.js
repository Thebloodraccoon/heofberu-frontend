import { catalogApi as api } from '../../api.js'
import { TOOL_FILTERS } from '../../components/editor/itemFilters.js'
import { toolCategoryLabels } from '@/lib/i18n/index.js'
import { itemKindCfg } from './itemShared.js'
import { optOptional } from './shared.js'

// Инструменты: одна вкладка; вид инструмента — в строке с весом и ценой
// (пишется в PATCH /items/{id}/tool, при создании — внутри tool).
export const toolsCfg = itemKindCfg({
  kind: 'TOOL',
  label: 'Инструменты',
  singular: 'инструмент',
  newTitle: 'Новый инструмент',
  filters: TOOL_FILTERS,
  categoryBadge: (item) => toolCategoryLabels[item.tool_category] ?? item.tool_category,
  statsRowField: { key: 'tool_category', label: 'Вид инструмента', type: 'chips', options: optOptional(toolCategoryLabels) },
  detail: {
    fromRecord: (r) => ({ tool_category: r.tool?.tool_category ?? '' }),
    body: (form) => ({ tool_category: form.tool_category || null }),
    createBody: (core, tool) => ({ ...core, tool }),
    create: (body) => api.items.createTool(body),
    update: (id, body) => api.items.updateTool(id, body),
  },
})
