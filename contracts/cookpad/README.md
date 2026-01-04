# Cookpad Contract

Cookpad - это memepad с bonding curve, который работает до достижения 300 TON ликвидности, после чего токен автоматически выходит на DEX STON.fi.

## Параметры

- **Максимальная ликвидность**: 300 TON
- **Комиссия**: 1% (100 basis points) с каждой сделки
- **Кошелек для комиссий**: UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz
- **DEX**: STON.fi (после достижения 300 TON)

## Структура файлов

Контракт основан на примере memepad и использует ту же архитектуру:
- `params.fc` - параметры контракта
- `storage.fc` - структура хранения данных
- `errors.fc` - коды ошибок
- `op_codes.fc` - коды операций
- `common.fc` - общие функции (buy, sell, etc.)
- `i_bcl_math.fc` - математика bonding curve
- `s_minter.fc` - основной контракт
- `s_storage.fc` - функции загрузки/сохранения данных
- `s_ston_fi.fc` - интеграция с STON.fi

## Компиляция

Для компиляции контракта используйте func-js или toncli:

```bash
func build contracts/cookpad/s_minter.fc -o build/cookpad.fif
```

## Деплой

После компиляции контракт можно задеплоить через фронтенд или напрямую через TON.

## Важные отличия от memepad

1. Лимит ликвидности установлен на 300 TON
2. Комиссия фиксирована на 1% (100 basis points)
3. Кошелек для комиссий: UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz
4. После достижения 300 TON токен автоматически депозится на STON.fi

