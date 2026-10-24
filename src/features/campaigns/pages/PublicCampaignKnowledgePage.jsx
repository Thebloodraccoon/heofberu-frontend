import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { knowledgeTarget } from '../editorNavigation.js'

// Старые ссылки продолжают открывать нужный материал во внутренней вкладке.
export default function PublicCampaignKnowledgePage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  return <Navigate replace to={knowledgeTarget(slug, params)} />
}
