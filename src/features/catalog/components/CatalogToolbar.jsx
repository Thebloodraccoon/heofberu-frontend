import SearchToolbar from '@/components/ui/SearchToolbar.jsx'

export default function CatalogToolbar(props) {
  return <SearchToolbar {...props} label="Поиск по справочнику" placeholder="Имя или описание…" submitLabel="Поиск" filterLabel={props.filterCount ? "Фильтры применены. Изменить фильтры" : "Открыть фильтры"} />
}
