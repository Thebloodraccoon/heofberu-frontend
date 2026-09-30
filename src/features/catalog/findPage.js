const LOOKUP_SIZE = 100
const LOOKUP_BATCH_SIZE = 6

export async function findCatalogPage(list, id, total, pageSize, params = {}) {
  const pageCount = Math.ceil(total / LOOKUP_SIZE)

  for (let start = 1; start <= pageCount; start += LOOKUP_BATCH_SIZE) {
    const pageNumbers = Array.from(
      { length: Math.min(LOOKUP_BATCH_SIZE, pageCount - start + 1) },
      (_, index) => start + index,
    )
    const results = await Promise.all(
      pageNumbers.map((page) => list({ ...params, page, size: LOOKUP_SIZE })),
    )

    for (let index = 0; index < results.length; index += 1) {
      const itemIndex = (results[index]?.items ?? []).findIndex((item) => String(item.id) === String(id))
      if (itemIndex >= 0) {
        const absoluteIndex = (pageNumbers[index] - 1) * LOOKUP_SIZE + itemIndex
        return Math.floor(absoluteIndex / pageSize) + 1
      }
    }
  }

  return null
}
