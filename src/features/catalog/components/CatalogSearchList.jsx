import { useState } from 'react'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'
import CatalogFilterSummary from '@/features/catalog/components/CatalogFilterSummary.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'

// Выбор записи справочника (предмет, заклинание, черта, особенность): общий
// SearchPickerList + фильтры каталога (узкая панель FilterModal и сводка
// применённых). filters — определения { name, label, options }: выбранное
// уходит в запрос параметром name; params — постоянные параметры (вид предмета…).
export default function CatalogSearchList({ queryKey, list, params = {}, filters = [], ...rest }) {
  const [value, setValue] = useState({})
  const [open, setOpen] = useState(false)
  const filterParams = Object.fromEntries(filters.filter(({ name }) => value[name]?.length).map(({ name }) => [name, value[name]]))

  return (
    <SearchPickerList
      {...rest}
      queryKey={[...queryKey, params, filterParams]}
      fetchPage={(page) => list({ ...params, ...filterParams, ...page })}
      onFilters={filters.length ? () => setOpen(true) : undefined}
      filtersOpen={open}
      filterCount={Object.values(value).reduce((count, values) => count + values.length, 0)}
      header={
        <>
          <CatalogFilterSummary definitions={filters} value={value} onChange={setValue} />
          {open && <FilterModal filters={filters} value={value} onChange={setValue} onClose={() => setOpen(false)} />}
        </>
      }
    />
  )
}
