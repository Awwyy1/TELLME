# tellme.mom — деплой на Vercel

## Структура проекта
```
tellmemom-project/
├── api/
│   └── message.js      ← серверная функция (API ключ здесь, браузер не видит)
├── public/
│   └── index.html      ← сайт
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

### 4. Deploy
Vercel задеплоит автоматически.

## Как работает
Браузер → /api/message (Vercel) → Anthropic API → уникальное сообщение от мамы

Каждый раз генерируется новое, живое сообщение. Ключ спрятан навсегда.
