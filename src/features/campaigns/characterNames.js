import { useBackgroundDetail, useClassDetail, useRaceDetail } from '@/features/catalog/queries.js'
import { sentenceCase } from '@/lib/i18n/index.js'

// Публичный персонаж приходит с id класса, расы и предыстории — имена берём из открытого справочника.
// Подкласс и подраса — из детали класса и расы, так что запросов три, и они кэшируются на всю витрину.
export function usePublicCharacterNames(character) {
  const { data: classDetail } = useClassDetail(character?.class_id)
  const { data: raceDetail } = useRaceDetail(character?.race_id)
  const { data: backgroundDetail } = useBackgroundDetail(character?.background_id)
  const name = (value) => (value ? sentenceCase(value) : null)
  return {
    className: name(classDetail?.name),
    subclassName: name(classDetail?.subclasses?.find((item) => item.id === character?.subclass_id)?.name),
    raceName: name(raceDetail?.name),
    subraceName: name(raceDetail?.subraces?.find((item) => item.id === character?.subrace_id)?.name),
    backgroundName: name(backgroundDetail?.name),
  }
}
