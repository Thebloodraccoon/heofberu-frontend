export default function CatalogEmptyState({ filtered, onReset, onCreate }) {
  return (
    <div className="catalog-empty-state" role="status">
      <span className="catalog-empty-symbol" aria-hidden="true">⌕</span>
      <h2>{filtered ? 'Ничего не найдено по запросу' : 'В справочнике пока нет записей'}</h2>
      <p>{filtered ? 'Попробуйте другое название или сбросьте поиск и фильтры.' : onCreate ? 'Добавьте первую запись, чтобы начать наполнять справочник.' : 'Новые записи появятся здесь, когда ГМ добавит их в справочник.'}</p>
      {filtered ? (
        <button type="button" className="catalog-toolbar-button catalog-toolbar-filter" onClick={onReset}>Сбросить поиск и фильтры</button>
      ) : onCreate ? (
        <button type="button" className="catalog-toolbar-button catalog-toolbar-submit" onClick={onCreate}>Создать запись</button>
      ) : null}
    </div>
  )
}
