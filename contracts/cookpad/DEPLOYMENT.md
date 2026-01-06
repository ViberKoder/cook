# Cookpad Contract Deployment Guide

## Требования

1. Установленный FunC компилятор
2. TON SDK или toncli
3. Доступ к TON сети (mainnet или testnet)

## Шаги деплоя

### 1. Компиляция контракта

```bash
# Установите FunC компилятор
# Затем скомпилируйте контракт:

func build contracts/cookpad/s_minter.fc -o build/cookpad.fif
```

### 2. Подготовка данных для деплоя

При деплое необходимо указать:
- `content` - метаданные токена в формате TEP-64 (Cell)
- `walletCode` - код Jetton Wallet 2.0 (Cell)
- `curveTon` - начальная сумма TON для bonding curve (например, "0.1")
- `author` - адрес автора (Address)
- `feeRecipient` - адрес для комиссий: `UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz`
- `buyFeeBasis` - 100 (1%)
- `sellFeeBasis` - 100 (1%)
- `stonfiRouter` - адрес STON.fi router
- `stonfiRouterPtonWallet` - адрес STON.fi router pTON wallet

### 3. Деплой через фронтенд

Используйте функцию `deployCookpad` из `lib/deployCookpad.ts`:

```typescript
import { deployCookpad } from '@/lib/deployCookpad';

const result = await deployCookpad({
  content: metadataCell,
  walletCode: jettonWalletCode,
  curveTon: '0.1',
  author: walletAddress.toString(),
  factory: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
}, walletAddress, sendTransaction);
```

### 4. Обновление адреса контракта

После деплоя обновите адрес контракта в `app/cookpad/page.tsx`:

```typescript
const COOKPAD_CONTRACT = 'EQ...'; // Адрес задеплоенного контракта
```

## Проверка работы

1. Откройте `/cookpad` страницу
2. Подключите кошелек
3. Попробуйте купить токены
4. Проверьте, что комиссия отправляется на правильный кошелек
5. Дождитесь достижения 300 TON и проверьте автоматический выход на STON.fi

## Важные замечания

- Контракт автоматически переходит на STON.fi после достижения 300 TON ликвидности
- Комиссия 1% взимается с каждой сделки (buy и sell)
- После выхода на DEX токен становится доступным для торговли на STON.fi



