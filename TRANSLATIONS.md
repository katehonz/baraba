# Translation System Documentation

This document explains the translation structure for the Baraba accounting system.

## Overview

The system supports bilingual (Bulgarian/English) translations across both frontend and backend components.

## Structure

### Frontend Translations
Location: `frontend/public/locales/{lang}/translation.json`

Structure:
- **app**: Application-wide settings
- **login**: Login page specific
- **register**: Registration page specific  
- **recover_password**: Password recovery
- **reset_password**: Password reset
- **homepage**: Dashboard/homepage
- **companies**: Company management
- **accounts**: Chart of accounts
- **journal**: Journal entries
- **counterparts**: Clients/suppliers
- **reports**: Various reports
- **settings**: System settings
- **common**: Shared UI elements and actions
- **backend**: Server-side messages (errors, success, validation, etc.)

### Backend Translations
Location: `locales/{lang}.json`

Structure:
- **errors**: API error messages
- **success**: API success messages
- **messages**: General system messages
- **validation**: Form validation messages
- **email**: Email templates
- **logs**: Audit log messages

## Key Principles

### Language Support
- **bg**: Bulgarian (Български)
- **en**: English
- Default fallback: English

### Translation Keys
- Use dot notation for nested keys (e.g., `companies.title`)
- Backend messages in frontend are under `backend.*` namespace
- Keys should be descriptive and consistent

### Consistency
- Frontend and backend maintain parallel translation keys
- Backend-specific messages are organized separately in frontend under `backend.*`
- All UI text should be translatable

## Usage

### Frontend (React)
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// Basic usage
t('companies.title')
// With parameters
t('backend.validation.password_min_length', { min: 8 })
```

### Backend (Nim)
```nim
import utils/i18n

# Basic usage
i18n("errors.invalid_credentials")
# With parameters
i18nNamed("email.password_reset_body", {"username": user.name, "reset_link": link})
```

## Maintenance

### Adding New Translations
1. Add keys to both `frontend/public/locales/en/translation.json` and `frontend/public/locales/bg/translation.json`
2. Add corresponding backend translations if needed
3. Run validation: `python3 sync_translations.py validate`

### Sync Script
The `sync_translations.py` utility helps:
- Validate translation completeness
- Sync missing translations between languages
- Check for empty or missing values

Commands:
```bash
python3 sync_translations.py validate    # Check completeness
python3 sync_translations.py sync        # Sync missing translations  
python3 sync_translations.py check-empty  # Find empty translations
```

## Best Practices

1. **Keep keys consistent** across languages
2. **Use meaningful keys** that describe the content
3. **Group related translations** under logical sections
4. **Parameterize dynamic content** using `{placeholder}` syntax
5. **Test both languages** when adding new features
6. **Review translations** for cultural appropriateness

## Current Coverage

- **227 common translation keys** between frontend and backend
- **Full Bulgarian and English support**
- **Complete error handling and validation messages**
- **Email templates for authentication flows**
- **Audit logging messages**

## File Locations

```
Frontend:
├── frontend/public/locales/bg/translation.json
├── frontend/public/locales/en/translation.json
├── frontend/src/i18n.ts (i18next configuration)

Backend:
├── locales/bg.json
├── locales/en.json
├── src/utils/i18n.nim (i18n utilities)

Tools:
├── sync_translations.py (synchronization utility)
```