import { useLayoutEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { campaignEditorTarget, knowledgeTarget } from '../editorNavigation.js'

// Постоянная навигация между текстом кампании и её материалами.
export default function CampaignEditorNav({ slug, active = 'text' }) {
  const rootRef = useRef(null)
  const [params] = useSearchParams()
  const text = new URLSearchParams(params)
  text.delete('tab')
  useLayoutEffect(() => {
    const root = rootRef.current
    const update = () => {
      const selected = root.querySelector('[aria-current="page"]')
      if (!selected) return
      root.style.setProperty('--tab-left', `${selected.offsetLeft}px`)
      root.style.setProperty('--tab-width', `${selected.offsetWidth}px`)
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(root)
    root.querySelectorAll('a').forEach((link) => observer.observe(link))
    return () => observer.disconnect()
  }, [active, slug])
  return (
    <nav ref={rootRef} className="campaign-editor-tabs" aria-label="Разделы публичной кампании">
      <Link to={slug ? campaignEditorTarget(slug, text) : '/gm/public-campaigns?slug=new'} aria-current={active === 'text' ? 'page' : undefined}><LoreIcon name="edit" />Текст</Link>
      {slug
        ? <Link to={knowledgeTarget(slug, params)} aria-current={active === 'knowledge' ? 'page' : undefined}><LoreIcon name="book" />База знаний</Link>
        : <span aria-disabled="true" title="Доступно после создания черновика"><LoreIcon name="book" />База знаний</span>}
      <span className="article-editor-tab-indicator" aria-hidden="true" />
    </nav>
  )
}
