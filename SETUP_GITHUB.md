# Настройка GitHub для хранения метаданных

## Что это?

Метаданные токенов Jetton 2.0 будут храниться в GitHub репозитории в формате JSON файлов.
Каждый токен будет иметь свой файл: `metadata/{contract_address}.json`

## Преимущества:

- ✅ Децентрализованное хранение (GitHub)
- ✅ Публичный доступ через raw content
- ✅ Версионирование (Git history)
- ✅ Надежность (GitHub infrastructure)
- ✅ Бесплатно

## Как настроить:

### 1. Создайте папку metadata в репозитории:

```bash
mkdir metadata
git add metadata
git commit -m "Add metadata directory"
git push origin main
```

### 2. Создайте GitHub Personal Access Token:

1. Откройте [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Нажмите **Generate new token (classic)**
3. Назовите токен (например, `cook-metadata`)
4. Выберите scope: **repo** (полный доступ к репозиторию)
5. Нажмите **Generate token**
6. Скопируйте токен (он показывается только один раз!)

### 3. Добавьте токен в Vercel:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект `cook`
3. Перейдите в **Settings > Environment Variables**
4. Добавьте переменную:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: ваш GitHub токен
   - **Environment**: Production, Preview, Development (все)
5. Нажмите **Save**

### 4. Перезапустите проект:

Vercel автоматически перезапустит проект с новой переменной окружения.

## Как это работает:

1. При деплое токена, метаданные сохраняются в GitHub через API
2. Файл создается/обновляется: `metadata/{contract_address}.json`
3. Эксплореры читают метаданные из: `https://raw.githubusercontent.com/ViberKoder/cook/main/metadata/{address}.json`
4. API endpoint также кэширует метаданные в Vercel KV для быстрого доступа

## Структура файла:

```json
{
  "name": "Token Name",
  "symbol": "SYMBOL",
  "description": "Token description",
  "decimals": "9",
  "image": "https://example.com/image.png"
}
```

## Fallback:

Если GitHub токен не настроен:
- Метаданные будут храниться только в Vercel KV
- Или будут читаться напрямую из контракта (если там есть data URI)

## Проверка:

После настройки, при деплое нового токена:
1. Метаданные сохранятся в GitHub
2. Файл будет доступен по URL: `https://raw.githubusercontent.com/ViberKoder/cook/main/metadata/{address}.json`
3. Эксплореры смогут читать метаданные через этот URL






