# Cookpad Contract

Cookpad - это memepad с bonding curve, который работает до достижения 300 TON ликвидности, после чего токен автоматически выходит на DEX STON.fi.

## Параметры

- **Максимальная ликвидность**: 300 TON
- **Комиссия**: 1% (100 basis points) с каждой сделки
- **Кошелек для комиссий**: UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz
- **DEX**: STON.fi (после достижения 300 TON)

## Структура файлов

Контракт основан на примере memepad и использует ту же архитектуру:
- `params.fc` - параметры контракта (300 TON лимит, 1% комиссия)
- `storage.fc` - структура хранения данных
- `errors.fc` - коды ошибок
- `op_codes.fc` - коды операций
- `common.fc` - общие функции (buy, sell, etc.)
- `imports/i_bcl_math.fc` - математика bonding curve
- `imports/i_stdlib_modern.fc` - стандартная библиотека FunC (нужно скопировать из TON SDK)
- `imports/i_discovery_params.fc` - параметры discovery
- `imports/i_workchain.fc` - работа с workchain
- `s_minter.fc` - основной контракт
- `s_storage.fc` - функции загрузки/сохранения данных
- `s_ston_fi.fc` - интеграция с STON.fi
- `utils/u_jetton_utils.fc` - утилиты для работы с Jetton
- `utils/u_log.fc` - логирование
- `factory/f_params.fc` - параметры фабрики

## Компиляция

Для компиляции контракта используйте func-js или toncli:

1. Убедитесь, что у вас установлен FunC компилятор
2. Скопируйте `i_stdlib_modern.fc` из TON SDK в `imports/`
3. Компилируйте контракт:

```bash
func build contracts/cookpad/s_minter.fc -o build/cookpad.fif
```

## Деплой

После компиляции контракт можно задеплоить через фронтенд (`lib/deployCookpad.ts`) или напрямую через TON.

При деплое необходимо указать:
- `content` - метаданные токена (TEP-64)
- `walletCode` - код Jetton Wallet 2.0
- `curveTon` - начальная сумма TON для bonding curve
- `author` - адрес автора
- `factory` - адрес фабрики (опционально)

## Важные отличия от memepad

1. **Лимит ликвидности**: установлен на 300 TON (константа `max_liquidity_ton`)
2. **Комиссия**: фиксирована на 1% (100 basis points) для buy и sell
3. **Кошелек для комиссий**: UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz
4. **Автоматический выход на DEX**: после достижения 300 TON токен автоматически депозится на STON.fi через `deposit_liquidity_to_ston_fi()`

## Bonding Curve

Контракт использует bonding curve формулу из `i_bcl_math.fc`:
- Цена токена растет по мере увеличения supply
- При покупке: пользователь отправляет TON, получает токены
- При продаже: пользователь отправляет токены, получает TON
- Комиссия 1% вычитается из каждой сделки и отправляется на кошелек комиссий

## Интеграция с STON.fi

После достижения 300 TON ликвидности:
1. Контракт автоматически вызывает `deposit_liquidity_to_ston_fi()`
2. Создается пул ликвидности на STON.fi
3. Токен становится доступным для торговли на DEX
4. Фаза контракта меняется на `phase::listed`

