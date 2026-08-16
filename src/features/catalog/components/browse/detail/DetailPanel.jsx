import ClassDetailCard from './ClassDetailCard.jsx'
import RaceDetailCard from './RaceDetailCard.jsx'
import SpellDetailCard from './SpellDetailCard.jsx'
import BackgroundDetailCard from './BackgroundDetailCard.jsx'
import FeatureDetailCard from './FeatureDetailCard.jsx'
import ItemDetailCard from './ItemDetailCard.jsx'
import FeatDetailCard from './FeatDetailCard.jsx'
import GenericDetail from './GenericDetail.jsx'

export default function DetailPanel({ resource, item, selectedSubId }) {
  if (resource === 'races') {
    const sub = selectedSubId
      ? (item.subraces ?? []).find((s) => String(s.id) === String(selectedSubId))
      : null
    return <RaceDetailCard race={item} selectedSub={sub} />
  }
  if (resource === 'classes') return <ClassDetailCard cls={item} selectedSubId={selectedSubId} />
  if (resource === 'spells') return <SpellDetailCard spell={item} />
  if (resource === 'backgrounds') return <BackgroundDetailCard bg={item} />
  if (resource === 'features') return <FeatureDetailCard item={item} />
  if (resource === 'items') return <ItemDetailCard item={item} />
  if (resource === 'feats') return <FeatDetailCard item={item} />
  return <GenericDetail item={item} hideAbility={resource === 'skills'} />
}
