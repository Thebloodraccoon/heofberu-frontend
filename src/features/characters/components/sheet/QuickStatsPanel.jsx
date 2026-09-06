import { BoxedValue, RollButton } from '@/components/sheet/primitives.jsx'

export default function QuickStatsPanel({
  character,
  pb,
  inspiration,
  onOpenInspiration,
  onOpenHp,
  onOpenAc,
  initiativeBonus,
  initiativeLast,
  onRollInitiative,
}) {
  return (
    <section className="fantasy-panel rounded-lg p-4 max-sm:p-2.5">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:justify-around sm:gap-x-5 sm:max-lg:justify-center max-sm:pt-2.5 max-sm:[&>*]:grow max-sm:[&>*]:basis-[calc(33.333%_-_1rem)]">
        <BoxedValue label="КД" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenAc}
            title="Класс доспеха и щит — нажмите, чтобы изменить"
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span>{(character.armor_class ?? 0) + (character.shield ?? 0)}</span>
              {(character.shield ?? 0) > 0 && (
                <span className="whitespace-nowrap text-[10px] font-normal text-gold">🛡 +{character.shield}</span>
              )}
            </span>
          </button>
        </BoxedValue>
        <BoxedValue label="Хиты" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenHp}
            title="Хиты и отдых"
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span className="flex items-center gap-1">
                <span className="sheet-hp__heart">♥</span>
                {character.current_hp ?? 0}/{character.max_hp ?? 0}
              </span>
              {Number(character.temp_hp) > 0 && (
                <span className="whitespace-nowrap text-[10px] font-normal text-emerald-300">
                  ♥ {character.temp_hp}
                </span>
              )}
            </span>
          </button>
        </BoxedValue>
        <BoxedValue label="Скорость">
          <span>{character.speed ?? '—'}</span>
        </BoxedValue>
        <BoxedValue label="Владение">
          <span>+{pb}</span>
        </BoxedValue>
        <BoxedValue label="Инициатива" boxClassName="min-w-14">
          <RollButton
            bonus={initiativeBonus}
            label={initiativeLast != null ? String(initiativeLast) : undefined}
            onClick={onRollInitiative}
            className="!text-sm !min-w-10 !h-9"
            title={initiativeLast != null ? `Последний бросок инициативы: ${initiativeLast}` : 'Инициатива'}
          />
        </BoxedValue>
        <BoxedValue label="Вдохновения" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenInspiration}
            title="Вдохновения — нажмите, чтобы изменить"
          >
            <span>{inspiration}</span>
          </button>
        </BoxedValue>
      </div>
    </section>
  )
}