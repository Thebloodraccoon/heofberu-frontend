// Бэк отвечает по-английски («Only the GM of campaign 5 can do this.»), а интерфейс русский.
// Переводим по `error.type` — имени класса исключения на бэке; статус и тело ответа сохраняем,
// чтобы ErrorBox, тосты и проверки `error.status` работали как прежде.
const MESSAGES = {
  CampaignNotFoundException: 'Кампания не найдена или вы в ней не участвуете.',
  CampaignGmOnlyException: 'Это может только ГМ кампании.',
  CampaignPlayerOnlyException: 'Отзывы оставляют только игроки кампании.',
  CampaignOwnReviewException: 'ГМ не пишет отзыв о своей кампании, даже если играет в ней персонажем.',
  CampaignClosedException: 'Кампания завершена или в архиве: состав больше не меняется.',
  CharacterNotFreeException: 'Персонаж уже играет в другой кампании.',
  CampaignCharacterNotFoundException: 'Этого участника в кампании нет.',
  CampaignCharacterStatusException: 'Такой смены статуса нет. Вернуть персонажа в игру можно, только добавив его заново.',
  CampaignSessionNotFoundException: 'Сессия не найдена.',
  CampaignSessionNotPublishedException: 'Отзыв о сессии можно оставить после публикации хроники.',
  CampaignNoteNotFoundException: 'Заметка не найдена.',
  CampaignReviewNotFoundException: 'Отзыв не найден.',
  CampaignReviewHiddenException: 'Отзыв скрыт модератором: его можно удалить, но не изменить.',
  CampaignListFilterException: 'Фильтр по роли нельзя сочетать с режимом «Все кампании».',
  PublicCampaignLinkNotFoundException: 'Публичная кампания не найдена или ещё не опубликована.',
  PublicCampaignNotFoundException: 'Публичная кампания не найдена.',
  PublicCampaignEditForbiddenException: 'Изменять публичную кампанию могут только её автор и основатель.',
  PublicCampaignStatusTransitionException: 'Из текущего статуса так перевести публичную кампанию нельзя.',
  CharacterAccessDeniedException: 'Персонаж не в вашей кампании: его лист ведёт только ГМ кампании, где он играет.',
  RecordIdsInvalidError: 'Часть выбранных записей больше не существует. Обновите страницу.',
  RecordAlreadyExistsError: 'Такая запись уже есть: например, сессия с этим номером.',
}

const BY_STATUS = {
  403: 'Недостаточно прав для этого действия.',
  404: 'Не найдено.',
  409: 'Данные изменились. Обновите страницу и попробуйте снова.',
}

// onlyKnown — для чужих экранов (лист персонажа, ГМ-панель): переводим только известные типы,
// остальные ошибки показываем как есть, чтобы не потерять их подробности.
export function campaignErrorMessage(error, { onlyKnown = false } = {}) {
  if (!error) return ''
  return MESSAGES[error.data?.error?.type] ?? (onlyKnown ? undefined : BY_STATUS[error.status]) ?? error.message
}

// Ошибка с русским текстом для ErrorBox; `status`/`data` исходной ошибки остаются.
export function toCampaignError(error, options) {
  if (!error) return null
  const translated = new Error(campaignErrorMessage(error, options))
  translated.status = error.status
  translated.data = error.data
  return translated
}
