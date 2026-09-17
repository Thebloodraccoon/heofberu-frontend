import { useSubraceDetail, useSubclassDetail } from '@/features/catalog/queries.js'
import ClassDetailCard from './ClassDetailCard.jsx'
import RaceDetailCard from './RaceDetailCard.jsx'
import SpellDetailCard from './SpellDetailCard.jsx'
import BackgroundDetailCard from './BackgroundDetailCard.jsx'
import FeatureDetailCard from './FeatureDetailCard.jsx'
import ItemDetailCard from './ItemDetailCard.jsx'
import FeatDetailCard from './FeatDetailCard.jsx'
import GenericDetail from './GenericDetail.jsx'

export default function DetailPanel({ resource, item, selectedSubId }) {
  const raceSubQ = useSubraceDetail(resource === 'races' ? item.id : null, selectedSubId)
  const classSubQ = useSubclassDetail(resource === 'classes' ? item.id : null, selectedSubId)

  if (resource === 'races') {
    const basicSub = selectedSubId
      ? (item.subraces ?? []).find((s) => String(s.id) === String(selectedSubId))
      : null
    const selectedSub = selectedSubId ? { ...(basicSub ?? {}), ...(raceSubQ.data ?? {}) } : null
    return (
      <RaceDetailCard
        race={item}
        selectedSub={selectedSub}
        subLoading={!!selectedSubId && raceSubQ.isLoading}
      />
    )
  }
  if (resource === 'classes') {
    return (
      <ClassDetailCard
        cls={item}
        selectedSubId={selectedSubId}
        subDetail={classSubQ.data}
        subLoading={!!selectedSubId && classSubQ.isLoading}
      />
    )
  }
  if (resource === 'spells') return <SpellDetailCard spell={item} />
  if (resource === 'backgrounds') return <BackgroundDetailCard bg={item} />
  if (resource === 'features') return <FeatureDetailCard item={item} />
  if (resource === 'items') return <ItemDetailCard item={item} />
  if (resource === 'feats') return <FeatDetailCard item={item} />
  return <GenericDetail item={item} hideAbility={resource === 'skills'} />
}
