# Jasper Reports Service

Java-based microservice for generating professional reports in PDF, Excel, HTML, and CSV formats using JasperReports.

## Overview

| Property | Value |
|----------|-------|
| **Port** | 5005 |
| **Technology** | Java 17, Spring Boot 3.2, JasperReports 6.21 |
| **Build** | Maven |

## API Endpoints

### Health Check
```
GET /api/reports/health
```

### Generate Report (POST)
```
POST /api/reports/generate
Content-Type: application/json

{
    "reportName": "journal_entries",
    "format": "pdf",
    "parameters": {
        "company_id": 1,
        "date_from": "2024-01-01",
        "date_to": "2024-12-31"
    }
}
```

### Generate Report (GET)
```
GET /api/reports/generate/{reportName}?format=pdf&company_id=1
```

### List Available Templates
```
GET /api/reports/templates
```

### List Supported Formats
```
GET /api/reports/formats
```

## Supported Formats

| Format | Content-Type | Extension |
|--------|--------------|-----------|
| PDF | application/pdf | .pdf |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | .xlsx |
| HTML | text/html | .html |
| CSV | text/csv | .csv |

## Available Report Templates

| Template | Description |
|----------|-------------|
| `journal_entries` | Journal Entries Report with date range filtering |
| `counterparts` | Counterparts List with type filtering |
| `trial_balance` | Trial Balance / Оборотна ведомост |
| `balance_sheet` | Balance Sheet Report |
| `income_statement` | Income Statement Report |
| `vat_report` | VAT Report for Bulgarian NRA |

## Adding New Reports

1. Create a `.jrxml` file in `src/main/resources/reports/`
2. Use JasperReports Studio or iReport for visual design
3. Deploy - the service auto-detects new templates

### Example Template Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport ...>
    <parameter name="company_id" class="java.lang.Long"/>
    <queryString>
        <![CDATA[SELECT * FROM table WHERE company_id = $P{company_id}]]>
    </queryString>
    <field name="column_name" class="java.lang.String"/>
    ...
</jasperReport>
```

## Development

### Build
```bash
cd jasper_service
mvn clean package
```

### Run Locally
```bash
mvn spring-boot:run
```

### Run with Docker
```bash
docker build -t baraba-jasper .
docker run -p 5005:5005 -e DB_HOST=localhost baraba-jasper
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | jesterac | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | pas+123 | Database password |

## Usage Examples

### Generate PDF Report (curl)
```bash
curl -X POST http://localhost:5005/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportName":"journal_entries","format":"pdf","parameters":{"company_id":1}}' \
  --output report.pdf
```

### Generate Excel Report
```bash
curl "http://localhost:5005/api/reports/generate/counterparts?format=xlsx&company_id=1" \
  --output counterparts.xlsx
```

### From Frontend (JavaScript)
```javascript
const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        reportName: 'trial_balance',
        format: 'pdf',
        parameters: { company_id: 1 }
    })
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
window.open(url);
```
