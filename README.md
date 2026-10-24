# Push-Ups

Офлайн-PWA для iPhone, для прогресса в отжиманиях.

Тренировки идут короткими циклами: три дня объёма **A → B → C** (по 5 подходов в процентах от текущего
максимума) и **тест максимума D**, после которого следующий цикл пересчитывается под новый результат.
Отдых между подходами адаптивный (1:30–5:00), при плато включается облегчённый цикл на 90%.
Данные хранятся только на устройстве, есть экспорт и импорт бэкапа в JSON.

## Стек

| Слой | Технологии |
|---|---|
| UI | Svelte 5 (runes), TypeScript, собственный CSS без UI-библиотек |
| Сборка | Vite |
| Офлайн / PWA | vite-plugin-pwa (Workbox): service worker, манифест, обновление по кнопке |
| Хранение | IndexedDB через Dexie |
| Браузерные API | Web Audio (сигналы без аудиофайлов), Screen Wake Lock, Web Share, Storage Persistence |
| Тесты | Vitest + fake-indexeddb, svelte-check |

Логика программы — чистые функции с юнит-тестами в `src/core/`.

## Запуск

```bash
npm install
npm run dev      # dev-сервер
npm test         # юнит-тесты
npm run build    # сборка в dist/ (для GitHub Pages: BASE_PATH=/push-up-app/ npm run build)
npm run icons    # перегенерировать иконки и сплэш-экраны iOS в public/
```
