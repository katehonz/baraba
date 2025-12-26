# OCR Integration with Azure Document Intelligence

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#архитектура)
3. [Backend Implementation](#backend-scanner-service-nim)
4. [Frontend Implementation](#frontend-react-integration)
5. [Azure Setup](#сетъп-на-azure-document-intelligence)
6. [Deployment](#deployment)
7. [Usage Guide](#използване)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Overview

Този документ описва пълната интеграция на **Azure Document Intelligence (Form Recognizer)** в Baraba счетоводната система за автоматично разпознаване на фактури и попълване на счетоводни записи.

## Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React Frontend │    │  Scanner Service │    │  Azure AI Service │
│                │    │   (Nim)         │    │ Document Intel    │
│ • File Upload  │───▶│ • OCR Processing │───▶│ • Invoice Field  │
│ • Preview UI   │    │ • Data Parsing  │    │   Extraction     │
│ • Auto-fill    │    │ • JSON Output   │    │ • Confidence    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
           │                       │                       │
           └───────────────────────▶───────────────────────┘
                              HTTP/REST API
```

## Backend: Scanner Service (Nim)

### Основни файлове:
- `scanner_service/src/scanner_service.nim` - Main service
- `scanner_service/Dockerfile` - Container конфигурация
- `scanner_service/.env.example` - Environment variables

### API Endpoints:

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/scan` | Сканиране на PDF с Azure AI |
| GET | `/health` | Health check и status |

### Azure Document Intelligence Интеграция

#### Environment Variables:
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key
PORT=5001
CONFIDENCE_THRESHOLD=0.7
ENABLE_MOCK_FALLBACK=true
```

#### Core Functions:

1. **`callAzureDocumentIntelligence(base64Pdf: string)`**
   - Изпраща PDF към Azure AI
   - Използва async processing с polling
   - Обработва грешки и timeouts

2. **`parseAzureInvoiceResult(jsonData: JsonNode)`**
   - Извлича полета от Azure response
   - Парсва дати, суми, контрагенти
   - Изчислява confidence score

3. **Main Processing Flow:**
```nim
# 1. Получава PDF файл
# 2. Конвертира до base64
# 3. Изпраща към Azure
# 4. Poll за резултат
# 5. Парсва данни
# 6. Връща JSON с разпознати полета
```

### Извличани полета от фактури:

| Поле | Azure Field | Описание |
|------|-------------|----------|
| `vendorName` | `VendorName` | Име на доставчик |
| `vendorVatNumber` | `VendorTaxId` | ДДС номер на доставчик |
| `customerName` | `CustomerName` | Име на клиент |
| `customerVatNumber` | Customer Tax ID | ДДС номер на клиент |
| `invoiceId` | `InvoiceId` | Номер на фактура |
| `invoiceDate` | `InvoiceDate` | Дата на издаване |
| `dueDate` | `DueDate` | Дата на плащане |
| `subtotal` | `SubTotal` | Данъчна основа |
| `totalTax` | `TotalTax` | Сума ДДС |
| `invoiceTotal` | `InvoiceTotal` | Обща сума |

### Error Handling & Fallback:

1. **High Confidence (>0.7)** - Автоматично обработване
2. **Low Confidence (<0.7)** - Изисква ръчен преглед
3. **Azure Errors** - Mock data fallback
4. **No API Key** - Mock mode with предупреждение

## Frontend: React Integration

### Компоненти:

#### 1. **DocumentScannerPage.tsx**
- Drag&drop upload за PDF файлове
- Избор между покупка/продажба
- Преглед на резултати
- Бутон за създаване на журнал запис

#### 2. **ScannerToJournalModal.tsx** 
- Интеграция със счетоводна книга
- Автоматично генериране на entry lines
- Preview на данни преди запис
- Корекция на счетове и контрагенти

### Flow на обработка:

```
1. User качва PDF файл
   ↓
2. Frontend изпраща към scanner_service
   ↓
3. Azure AI извлича данни
   ↓
4. Показва резултати в UI
   ↓
5. User клика "Създай журнал запис"
   ↓
6. ScannerToJournalModal генерира данни
   ↓
7. Автоматично попълване на JournalEntry форма
   ↓
8. User коригира и записва
```

### API Client (`frontend/src/api/scanner.ts`):

```typescript
export const scannerApi = {
  // Основно сканиране
  scanInvoice: async (file: File, invoiceType: 'purchase' | 'sales', companyId: string): Promise<RecognizedInvoice> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('invoiceType', invoiceType)
    formData.append('companyId', companyId)
    
    const response = await fetch(`${SCANNER_API_URL}/scan`, {
      method: 'POST',
      body: formData,
    })
    
    return response.json()
  },
  
  // Запазване на сканирани фактури
  saveScannedInvoice: async (companyId: string, recognized: RecognizedInvoice, fileName?: string): Promise<ScannedInvoice> => {
    // Implementation
  }
}
```

## TypeScript Типове

### RecognizedInvoice Interface:
```typescript
export interface RecognizedInvoice {
  vendorName: string
  vendorVatNumber: string
  vendorAddress: string
  customerName: string
  customerVatNumber: string
  customerAddress: string
  invoiceId: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  totalTax: number
  invoiceTotal: number
  direction: 'PURCHASE' | 'SALE' | 'UNKNOWN'
  validationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'NOT_APPLICABLE' | 'MANUAL_REVIEW'
  viesValidationMessage: string
  suggestedAccounts: SuggestedAccounts
  requiresManualReview: boolean
  manualReviewReason: string
  confidence?: number
  aiProvider?: string
  processingTime?: string
}
```

## Deployment

### Docker Configuration

```yaml
# docker-compose.scanner.yml
services:
  scanner_service:
    build: 
      dockerfile: scanner_service/Dockerfile
    ports:
      - "5001:5001"
    environment:
      - AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=${AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}
      - AZURE_DOCUMENT_INTELLIGENCE_KEY=${AZURE_DOCUMENT_INTELLIGENCE_KEY}
    volumes:
      - ./scanner_service/.env:/app/.env:ro
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Startup Script (`start-scanner.sh`):

```bash
#!/bin/bash
# 1. Проверява .env файл
# 2. Load-ва environment variables  
# 3. Build-ва Docker image
# 4. Стартира service
# 5. Прави health check
# 6. Показва status и полезни команди
```

## Сетъп на Azure Document Intelligence

### 1. Създаване на Azure ресурс:
```bash
# Azure Portal
1. Влезте в https://portal.azure.com
2. Create Resource → "Document Intelligence" 
3. Name: baraba-doc-intelligence
4. Region: West Europe (или близка)
5. Pricing tier: Free (500 страници/месец)
6. Resource Group: Existing или нова
7. Create
```

### 2. Получаване на credentials:
```bash
# От ресурса в Azure Portal:
1. Keys and Endpoint
2. Copy Endpoint (https://baraba-doc-intelligence.cognitiveservices.azure.com/)
3. Copy Key (xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
4. Добавете в scanner_service/.env
```

### 3. Конфигурация:
```bash
# scanner_service/.env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://baraba-doc-intelligence.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-key-here
CONFIDENCE_THRESHOLD=0.7
```

## Използване

### 1. Стартиране на service:
```bash
# Конфигуриране на Azure
cp scanner_service/.env.example scanner_service/.env
# Редактирайте с вашите Azure credentials

# Стартиране
./start-scanner.sh

# Проверка
curl http://localhost:5001/health
```

### 2. Тестване:
```bash
# Upload тест с curl
curl -X POST \
  -F "file=@test-invoice.pdf" \
  -F "invoiceType=purchase" \
  -F "companyId=1" \
  http://localhost:5001/scan
```

### 3. Frontend интеграция:
```typescript
// В React компонента
const result = await scannerApi.scanInvoice(pdfFile, 'purchase', companyId)

// Резултатът съдържа разпознати данни
console.log(result.vendorName)
console.log(result.invoiceTotal) 
console.log(result.confidence)
```

## Performance Optimization

### Backend Optimization:
1. **Async Processing** - Azure работи asynchronously
2. **Connection Pooling** - Reuse HTTP connections  
3. **Caching** - Кеширане на API responses
4. **Timeouts** - Конфигурируеми timeouts

### Frontend Optimization:
1. **File Size Limits** - Максимум 50MB
2. **Progress Indicators** - Loading states
3. **Error Handling** - Graceful fallbacks
4. **Preview Mode** - Проверка преди запис

## Security

### Data Protection:
1. **Encryption in Transit** - HTTPS към Azure
2. **API Key Security** - Environment variables
3. **File Validation** - Само PDF файлове
4. **Size Limits** - Защита от DoS

### Azure Security:
1. **Region Selection** - EU region за GDPR
2. **RBAC** - Role-based access control
3. **Logging** - Audit trails
4. **Compliance** - ISO/SOC сертификация

## Monitoring & Debugging

### Health Checks:
```bash
# Service health
curl http://localhost:5001/health

# Response example
{
  "status": "healthy",
  "service": "Baraba Scanner Service", 
  "version": "1.0.0",
  "azureConfigured": true,
  "timestamp": "2025-12-21 16:45:00"
}
```

### Logging:
```bash
# View logs
docker-compose -f docker-compose.scanner.yml logs -f scanner_service

# Примерен лог
Scanning request received for company: 1, type: purchase
File size: 245678 bytes
Calling Azure Document Intelligence at: https://baraba-doc-intelligence.cognitiveservices.azure.com/
Polling Azure for result (attempt 1/30)
Azure Document Intelligence processing completed successfully
Azure confidence: 0.85
```

### Debug Mode:
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Mock mode за тестване
export AZURE_DOCUMENT_INTELLIGENCE_KEY=""
```

## Тroubleshooting

### Често срещани проблеми:

#### 1. **Azure API Key грешка**
```
Грешка: "Azure Document Intelligence key not set"
Решение: Настройте AZURE_DOCUMENT_INTELLIGENCE_KEY в .env
```

#### 2. **Connection timeout**
```
Грешка: "Azure Document Intelligence timed out"
Решение: Увеличете AZURE_TIMEOUT_SECONDS
```

#### 3. **Low confidence**
```
Грешка: "Low confidence in AI recognition"
Решение: Намалете CONFIDENCE_THRESHOLD или подобрете качество на PDF
```

#### 4. **File format**
```
Грешка: "Only PDF files are allowed"
Решение: Конвертирайте файла до PDF формат
```

### Debug commands:
```bash
# Check service status
docker-compose -f docker-compose.scanner.yml ps

# Test Azure connection manually
curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  "https://your-resource.cognitiveservices.azure.com/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31"

# Check environment variables
docker-compose -f docker-compose.scanner.yml exec scanner_service env | grep AZURE
```

## Future Enhancements

### Short Term (3 месеца):
1. **Multi-language Support** - Фактури на английски, немски, френски
2. **Batch Processing** - Обработка на множество файлове
3. **Confidence Learning** - Машинно обучение за подобрена точност
4. **Template Matching** - Custom templates за конкретни доставчици

### Long Term (6+ месеца):
1. **Real-time Scanning** - Камера integration
2. **Mobile App** - iOS/Android приложение
3. **Advanced AI** - GPT-4 Vision integration
4. **Workflow Automation** - Automatic approvals и routing

## Integration с други services

### VIES Service:
```nim
# Автоматично валидиране на ДДС номера
if vendorVatNumber.len > 0:
    viesResult = await validateVIES(vendorVatNumber)
    if viesResult.valid:
        validationStatus = "VALID"
    else:
        validationStatus = "INVALID"
```

### Accounting Context:
```elixir
# Интеграция с JournalEntry creation
def create_from_scanned_invoice(company_id, scanned_data) do
  # Автоматично разпределение на суми
  # Създаване на контрагенти ако не съществуват
  # Генериране на entry lines
  # VAT валидация
end
```

---

**Версия:** 1.0  
**Дата:** 21.12.2025  
**Автор:** OpenCode Assistant  
**AI Provider:** Microsoft Azure Document Intelligence