# Heofberu — фронтенд

React + Vite + Tailwind CSS одностраничное приложение.

## Локальный запуск

```bash
npm install
npm run dev
```

По умолчанию запросы к бэкенду идут через dev-прокси на `http://localhost:8000`
(см. `vite.config.js`, `server.proxy`).

## Сборка

```bash
npm run build   # результат в dist/
npm run lint
```

## Деплой на Vercel (бесплатно)

1. Загрузите репозиторий на GitHub.
2. На https://vercel.com/new импортируйте репозиторий.
3. В настройках проекта задайте переменную окружения:

   ```
   VITE_API_URL = https://heofberu-backend.fastapicloud.dev
   ```

   (без `/api` — базовый URL бэкенда).
4. Фреймворк, команда сборки и каталог вывода определяются автоматически
   (`npm run build`, `dist`) — см. `vercel.json`. Там же настроен SPA-fallback
   для клиентского роутинга.
5. Deploy. После первого деплоя при желании привяжите свой домен.

### Установка через CLI

```bash
npm i -g vercel
vercel login
vercel            # preview-деплой
vercel --prod     # production-деплой
vercel env add VITE_API_URL production   # если не задали в дашборде
```
