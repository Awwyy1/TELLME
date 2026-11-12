# tellme.mom — деплой на Vercel

## Структура проекта
```
tellmemom-project/
├── api/
│   ├── message.js      ← серверная функция (API ключ здесь, браузер не видит)
│   └── config.js       ← публичные настройки для браузера (ключ сайта Turnstile)
├── public/
│   ├── index.html      ← главная страница
│   ├── app.js          ← логика главной (письма, шкатулка, карточка, конверт)
│   ├── site.js         ← общее для всех страниц: ночной режим, офлайн, установка
│   ├── sw.js           ← service worker: сайт открывается без сети
│   ├── manifest.webmanifest + icon-*.png ← установка как приложение
│   ├── pages.css       ← стили страниц с письмами
│   └── fonts/          ← шрифты WOFF2 (только латиница)
├── scripts/            ← генератор страниц /letters и тем
├── vercel.json         ← конфиг Vercel
├── .env.example        ← пример переменных окружения
└── .gitignore
```

## Шаги деплоя

### 1. Загрузи на GitHub
Создай новый репозиторий, загрузи все файлы.
Убедись что `.env` файла нет — только `.env.example`.

### 2. Подключи к Vercel
- vercel.com → New Project → Import Git Repository
- Выбери репозиторий

### 3. Добавь API ключ
- Settings → Environment Variables
- Name: `ANTHROPIC_API_KEY`
- Value: `sk-ant-твой_ключ`
- Environments: Production + Preview + Development
- Нажми Save

### 4. Защита бюджета (рекомендуется)

Без этих шагов сайт работает, но лимиты считаются отдельно в каждом
экземпляре функции и почти не защищают от злоупотреблений.

**Upstash Redis — общие лимиты запросов**
- Vercel → Storage → Create → Upstash Redis (бесплатного тарифа хватает)
- Подключи к проекту — переменные `KV_REST_API_URL` и `KV_REST_API_TOKEN`
  добавятся сами (или задай `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`)

**Cloudflare Turnstile — невидимая проверка «человек ли это»**
- dash.cloudflare.com → Turnstile → Add widget, домены `tellme.mom` и `www.tellme.mom`,
  режим Invisible
- Добавь в Vercel `TURNSTILE_SITE_KEY` и `TURNSTILE_SECRET_KEY`

**Лимиты** (необязательно, значения по умолчанию):
| Переменная | По умолчанию | Что ограничивает |
|---|---|---|
| `PER_MINUTE_LIMIT` | 5 | писем в минуту с одного IP |
| `PER_IP_DAILY_LIMIT` | 60 | писем в день с одного IP |
| `DAILY_MESSAGE_LIMIT` | 3000 | писем в день на весь сайт (потолок расходов) |

Одно письмо на `claude-opus-4-6` стоит примерно $0.005, так что 3000 писем ≈ $16 в день.
Когда лимит исчерпан, посетитель получает заранее написанное письмо с честной пометкой.

IP-адреса не хранятся: в Redis попадает только их необратимый хеш, счётчики удаляются сами.

### 5. Deploy
Vercel задеплоит автоматически.

## Страницы с письмами (SEO)

Страницы `/letters` и семь страниц тем — обычные HTML-файлы в `public/`.
Они собираются из одного файла с текстами:

1. Правь тексты в `scripts/pages-content.mjs`
2. Запусти `node scripts/build-pages.mjs` — обновятся HTML-страницы и `sitemap.xml`
3. Если добавил новую тему, допиши её адрес в маршрут в `vercel.json`
   (скрипт выводит готовую строку)

## Как работает
Браузер → /api/message (Vercel) → Anthropic API → уникальное сообщение от мамы

Каждый раз генерируется новое, живое сообщение. Ключ спрятан навсегда.
