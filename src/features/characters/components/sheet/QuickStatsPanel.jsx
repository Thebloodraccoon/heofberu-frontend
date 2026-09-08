import { BoxedValue, RollButton } from '@/components/sheet/primitives.jsx'

const ShieldIcon = ({ className = 'size-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" />
  </svg>
)

const HeartIcon = ({ className = 'size-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 21s-6.7-4.35-9.3-8.1C.6 9.9 1.6 6.4 4.6 5.1c2-.85 4.15-.2 5.4 1.35C11.25 8 12 8 12 8s.75 0 2-1.55c1.25-1.55 3.4-2.2 5.4-1.35 3 1.3 4 4.8 1.9 7.8C18.7 16.65 12 21 12 21Z" />
  </svg>
)

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
            <span className="flex items-center justify-center gap-1 leading-none">
              <ShieldIcon className="size-4 text-stone-400" />
              {(character.armor_class ?? 0) + (character.shield ?? 0)}
              {(character.shield ?? 0) > 0 && <ShieldIcon className="size-3 text-gold" />}
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
            <span className="flex items-center justify-center gap-1 leading-none">
              <HeartIcon className="sheet-hp__heart size-4" />
              {character.current_hp ?? 0}/{character.max_hp ?? 0}
              {Number(character.temp_hp) > 0 && (
                <span className="flex items-center gap-0.5 whitespace-nowrap text-[10px] font-normal text-emerald-300">
                  <HeartIcon className="size-2.5" />
                  {character.temp_hp}
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