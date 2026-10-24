export function campaignEditorTarget(slug, params = new URLSearchParams()) {
  const search = new URLSearchParams(params)
  search.set('slug', slug)
  return { pathname: '/gm/public-campaigns', search: `?${search}` }
}

export function knowledgeTarget(slug, params, patch = {}) {
  const search = new URLSearchParams(params)
  search.set('tab', 'knowledge')
  for (const [key, value] of Object.entries(patch)) {
    if (value) search.set(key, value)
    else search.delete(key)
  }
  return campaignEditorTarget(slug, search)
}

export function sameCampaignEditor(current, next) {
  return current.pathname === '/gm/public-campaigns' && next.pathname === current.pathname
    && new URLSearchParams(current.search).get('slug') === new URLSearchParams(next.search).get('slug')
}

export function sameCampaignMaterial(current, next) {
  if (!sameCampaignEditor(current, next)) return false
  const before = new URLSearchParams(current.search)
  const after = new URLSearchParams(next.search)
  return ['article', 'edit', 'type'].every((key) => before.get(key) === after.get(key))
}
