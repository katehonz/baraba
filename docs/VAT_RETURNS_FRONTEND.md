# ДДС Дневници и Декларации - Frontend Документация

## Обзор

Страницата `/vat-returns` (VatReturnsPage.tsx) е пълнофункционална система за управление на ДДС декларации по българското законодателство. Базирана е на дизайна от nula.bg.

## Структура с 5 таба

### 1. ДДС (Обобщение)
- Информация за компанията (име, ЕИК, ДДС номер)
- Таблица с обобщение на Продажби и Покупки
- Резултат за периода (ДДС за внасяне/възстановяване)
- Бутони за изтегляне на ZIP и маркиране като подадена

### 2. Дневник за Покупки
- Таблица с всички покупки за периода
- Колони: №, Вид, Документ №, Дата, Контрагент №, Контрагент, ДО, ДДС
- Бутон за сваляне на POKUPKI.TXT

### 3. Дневник за Продажби
- Таблица с всички продажби за периода
- Колони: №, Вид, Документ №, Дата, Контрагент №, Контрагент, ДО 20%, ДДС 20%
- Бутон за сваляне на PRODAGBI.TXT

### 4. Декларация
- **Раздел А**: Данни за начислен ДДС (клетки 01-24)
  - ДО 20%, 9%, 0%, ВОД, освободени
  - Начислен ДДС по ставки
- **Раздел Б**: Данъчен кредит (клетки 30-43)
  - ДО без право, с пълен ДК, частичен ДК
  - Общ данъчен кредит
- **Раздел В**: Резултат (клетки 50, 60)
  - ДДС за внасяне (кл.50)
  - ДДС за възстановяване (кл.60)
- Бутон за сваляне на DEKLAR.TXT

### 5. VIES Декларация
- Автоматично от ВОД записите
- Показва общо ВОД за периода
- Бутон за VIES.TXT (в разработка)

## Технически детайли

### Използвани технологии
- **React** + TypeScript
- **Chakra UI v3** - компоненти
- **REST API** - комуникация с backend

### Ключови компоненти от Chakra UI
```tsx
import {
  Box, Heading, Button, Flex, Text, Alert, Card,
  Table, Badge, HStack, VStack, Tabs, NativeSelect,
  Spinner, Grid, Dialog
} from '@chakra-ui/react'
```

### Структура на данните

#### VatReturn интерфейс
```typescript
interface VatReturn {
  id: string
  period_year: number
  period_month: number
  status: string  // DRAFT, CALCULATED, SUBMITTED, ACCEPTED, PAID
  
  // Покупки
  purchase_base_20: string
  purchase_vat_20: string
  purchase_base_9: string
  purchase_vat_9: string
  purchase_base_0: string
  purchase_intra_eu: string
  
  // Продажби
  sales_base_20: string
  sales_vat_20: string
  sales_base_9: string
  sales_vat_9: string
  sales_base_0: string
  sales_intra_eu: string
  sales_exempt: string
  
  // Общи суми
  total_purchase_vat: string
  total_sales_vat: string
  vat_due: string  // Положително = за внасяне, Отрицателно = за възстановяване
}
```

#### JournalEntry интерфейс
```typescript
interface JournalEntry {
  id: string
  entry_number: string
  document_number: string
  document_date: string
  vat_date: string
  description: string
  counterpart_name: string
  counterpart_vat_number: string
  base_amount: string
  vat_amount: string
  vat_operation: string
}
```

## API Endpoints

### GET `/api/companies/{companyId}/vat-returns`
Връща списък с ДДС декларации за компанията.

### POST `/api/companies/{companyId}/vat-returns`
Създава нова ДДС декларация.
```json
{
  "vat_return": {
    "period_year": 2024,
    "period_month": 12
  }
}
```

### GET `/api/companies/{companyId}/journal-entries?vat_period=2024-12&type=purchase`
Връща journal entries за покупки в периода.

### GET `/api/companies/{companyId}/journal-entries?vat_period=2024-12&type=sales`
Връща journal entries за продажби в периода.

### DELETE `/api/vat-returns/{id}`
Изтрива ДДС декларация (само DRAFT/CALCULATED).

### POST `/api/vat-returns/{id}/submit`
Маркира декларацията като подадена.

### GET `/api/vat-returns/{id}/export/{type}`
Експортира файл за НАП.
- `type`: `deklar`, `pokupki`, `prodajbi`, `zip`

## UI Компоненти

### Header с избор на период
```tsx
<Card.Root mb={4}>
  <Card.Body py={3}>
    <Flex justify="space-between" align="center">
      <Heading size="lg">ДДС Дневници:</Heading>
      <HStack gap={3}>
        <Text>Данъчен период:</Text>
        <NativeSelect.Root w="80px">
          <NativeSelect.Field value={month} onChange={...}>
            {/* месеци 01-12 */}
          </NativeSelect.Field>
        </NativeSelect.Root>
        <NativeSelect.Root w="100px">
          <NativeSelect.Field value={year} onChange={...}>
            {/* години */}
          </NativeSelect.Field>
        </NativeSelect.Root>
        <Button onClick={() => setIsModalOpen(true)}>
          Нов период
        </Button>
      </HStack>
    </Flex>
  </Card.Body>
</Card.Root>
```

### Табове
```tsx
<Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
  <Tabs.List>
    <Tabs.Trigger value="dds">ДДС</Tabs.Trigger>
    <Tabs.Trigger value="pokupki">Дневник за Покупки</Tabs.Trigger>
    <Tabs.Trigger value="prodajbi">Дневник за Продажби</Tabs.Trigger>
    <Tabs.Trigger value="deklaracia">Декларация</Tabs.Trigger>
    <Tabs.Trigger value="vies">VIES Декларация</Tabs.Trigger>
  </Tabs.List>
</Tabs.Root>
```

### Таблица с данни
```tsx
<Table.Root size="sm">
  <Table.Header>
    <Table.Row bg="gray.50">
      <Table.ColumnHeader>№</Table.ColumnHeader>
      <Table.ColumnHeader>Документ №</Table.ColumnHeader>
      <Table.ColumnHeader textAlign="right">ДДС</Table.ColumnHeader>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {entries.map((entry, idx) => (
      <Table.Row key={entry.id}>
        <Table.Cell>{idx + 1}</Table.Cell>
        <Table.Cell>{entry.document_number}</Table.Cell>
        <Table.Cell textAlign="right">{formatCurrency(entry.vat_amount)}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
  <Table.Footer>
    <Table.Row bg="gray.100" fontWeight="medium">
      <Table.Cell colSpan={2}>ОБЩО:</Table.Cell>
      <Table.Cell textAlign="right">{formatCurrency(total)}</Table.Cell>
    </Table.Row>
  </Table.Footer>
</Table.Root>
```

### Dialog (Модал)
```tsx
<Dialog.Root open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e.open)}>
  <Dialog.Backdrop />
  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Нов данъчен период</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        {/* форма */}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Отказ</Button>
        <Button colorPalette="blue" onClick={handleSubmit}>Създай</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
```

## Помощни функции

### Форматиране на валута
```typescript
const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('bg-BG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(num || 0)
}
```

### Форматиране на дата
```typescript
const formatDate = (dateStr: string) => 
  dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-'
```

### Status Badge
```typescript
const getStatusBadge = (status: string) => {
  const colors = {
    'DRAFT': 'gray',
    'CALCULATED': 'blue', 
    'SUBMITTED': 'green',
    'ACCEPTED': 'green',
    'PAID': 'purple'
  }
  const labels = {
    'DRAFT': 'Чернова',
    'CALCULATED': 'Изчислена',
    'SUBMITTED': 'Подадена',
    'ACCEPTED': 'Приета',
    'PAID': 'Платена'
  }
  return <Badge colorPalette={colors[status]}>{labels[status]}</Badge>
}
```

## Файлове за НАП

### DEKLAR.TXT
Справка-декларация с всички клетки (01-82).

### POKUPKI.TXT
Дневник за покупките - списък с документи.

### PRODAGBI.TXT
Дневник за продажбите - списък с документи.

### Кодировка
Всички файлове са в **Windows-1251** за съвместимост с НАП.

## Бележки за имплементация

1. **Период**: Месечен или тримесечен (според регистрацията)
2. **ВОД**: Вътреобщностни доставки - 0% ДДС, но се декларират
3. **Данъчен кредит**: Изчислява се автоматично от покупките
4. **Краен срок**: 14-то число на месеца след данъчния период
5. **Статуси**: DRAFT → CALCULATED → SUBMITTED → ACCEPTED → PAID

## Референции

- [nula.bg](https://nula.bg) - оригинален дизайн
- [НАП Портал](https://portal.nap.bg) - подаване на декларации
- [ЗДДС](https://lex.bg/laws/ldoc/2135533201) - Закон за ДДС
