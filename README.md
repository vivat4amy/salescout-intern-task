# SaleScout — мини-версия прайс-бота

Бот смотрит на цены конкурентов в наличии и выставляет цену чуть ниже самой низкой,
не выходя за границы `minPrice` / `maxPrice`.

Состоит из трёх частей:

| Часть | Где | Что делает |
| --- | --- | --- |
| Функция расчёта | `src/pricing.ts` | `calculatePrice(product)` — чистая функция без I/O |
| HTTP API (Express) | `server/` | `POST /reprice` — массив товаров на входе, массив результатов на выходе |
| Веб-страница (React + Vite) | `web/` | Таблица «было / стало» с причиной изменения цены |

## Требования

- Node.js 20+
- npm

## Установка и запуск

```bash
npm install
```

Запустить сервер и страницу одной командой:

```bash
npm run dev
```

Или по отдельности, в двух терминалах:

```bash
npm run server   # API на http://localhost:3001
npm run web      # страница на http://localhost:5173
```

Откройте <http://localhost:5173> — страница сама запросит `POST /reprice` с товарами из
`data/products.json` и покажет таблицу. Кнопка «Пересчитать» повторяет запрос.

> Страница обращается к `/reprice`, а Vite перенаправляет запрос на сервер
> (см. `web/vite.config.ts`), поэтому сервер должен быть запущен.
> Порт сервера можно поменять переменной окружения: `PORT=4000 npm run server`
> (тогда поправьте адрес прокси в `web/vite.config.ts`).

## Тесты и проверка типов

```bash
npm test            # vitest: тесты calculatePrice и API
npm run typecheck   # TypeScript для сервера и фронтенда
```

## Правила расчёта цены

1. Учитываются только конкуренты с `inStock: true`.
2. Таких нет → `newPrice = maxPrice`, причина `NO_COMPETITORS`.
3. Иначе `best` — минимальная цена среди них.
4. `candidate = floor(best - step)` — округление вниз до целого тенге.
5. `candidate < minPrice` → `minPrice`, `AT_MIN`; `candidate > maxPrice` → `maxPrice`, `AT_MAX`;
   иначе `candidate`, `UNDERCUT` (границы включительно).

`myPrice` на расчёт не влияет, он просто возвращается как `oldPrice`.

Небольшая деталь: перед `Math.floor` результат вычитания очищается от «плавающего хвоста»
(в JS `100.3 - 0.3` даёт `99.99999999999999`, а должно быть `100`).

## API

`POST /reprice`, `Content-Type: application/json`

Тело — массив товаров (`Product[]`, типы в `src/types.ts`), ответ `200` — массив `PriceResult[]`
в том же порядке.

```bash
curl -X POST http://localhost:3001/reprice \
  -H "Content-Type: application/json" \
  -d @data/products.json
```

Ответ `400` с текстом ошибки приходит, если тело — не массив, JSON битый или в товаре
некорректные поля (нет `sku`, отрицательная цена, `minPrice > maxPrice` и т.д.).

## Структура проекта

```
src/
  pricing.ts        # calculatePrice
  pricing.test.ts   # тесты расчёта
  types.ts          # общие типы
server/
  app.ts            # Express-приложение (POST /reprice)
  validate.ts       # проверка тела запроса
  index.ts          # запуск сервера
  app.test.ts       # тесты API
web/                # React + Vite
data/               # products.json и expected.json из задания
```
