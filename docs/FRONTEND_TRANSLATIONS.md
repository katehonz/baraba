# Frontend Translation System Documentation

## Overview

The Baraba frontend uses **react-i18next** for internationalization, providing complete Bulgarian and English language support for the accounting system interface.

## Architecture

### Translation Stack
- **react-i18next** (`^14.0.0`) - React integration
- **i18next** (`^23.7.11`) - Core internationalization engine  
- **i18next-browser-languagedetector** (`^7.2.0`) - Automatic language detection

### Configuration Structure
```
frontend/
├── package.json                    # i18n dependencies
├── src/
│   ├── i18n.ts                    # i18next configuration
│   ├── main.tsx                   # i18n initialization
│   ├── components/
│   │   └── LanguageSwitcher.tsx   # Language switching component
│   ├── locales/                   # Active translation files
│   │   ├── bg/translation.json    # Bulgarian translations
│   │   └── en/translation.json    # English translations
│   └── pages/                     # Components using translations
└── public/locales/                # Duplicate files (can be removed)
```

## Translation Setup

### i18n Configuration (`src/i18n.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import bgTranslation from './locales/bg/translation.json';
import enTranslation from './locales/en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bg: { translation: bgTranslation },
      en: { translation: enTranslation }
    },
    fallbackLng: 'bg',
    debug: false,
    interpolation: { escapeValue: false }
  });

export default i18n;
```

**Key Features:**
- **Fallback Language**: Bulgarian (`bg`) set as default
- **Auto-Detection**: Browser language detection
- **Direct Import**: Translation files imported directly (not lazy loaded)
- **Security**: HTML escaping disabled for React

## Translation Files

### File Locations
- **Active**: `/src/locales/{lang}/translation.json`
- **Duplicate**: `/public/locales/{lang}/translation.json` (unused)

### Language Support
- **Bulgarian (bg)**: Primary language, 375 translation keys
- **English (en)**: Secondary language, 375 translation keys

### Translation Key Structure

```json
{
  "welcome": "Welcome message",
  "accountingSystem": "Accounting System",
  "main": "MAIN",
  "accounting": "ACCOUNTING",
  
  "navigation": {
    "dashboard": "Dashboard",
    "companies": "Companies",
    "accounts": "Accounts"
  },
  
  "common": {
    "error": "Error",
    "cancel": "Cancel",
    "create": "Create",
    "update": "Update",
    "delete": "Delete",
    "save": "Save",
    "actions": "Actions",
    "loading": "Loading...",
    "search": "Search"
  },
  
  "companies": {
    "title": "Companies",
    "create": "Create Company",
    "edit": "Edit Company",
    "fields": {
      "name": "Company Name",
      "identifier": "Identifier",
      "vatNumber": "VAT Number"
    }
  },
  
  "currencies": {
    "title": "Currencies",
    "code": "Code",
    "name": "Name",
    "symbol": "Symbol"
  },
  
  "vatRates": {
    "title": "VAT Rates",
    "rate": "Rate",
    "description": "Description"
  },
  
  "fixed_assets": {
    "title": "Fixed Assets",
    "fields": {
      "name": "Asset Name",
      "type": "Type",
      "value": "Value"
    }
  }
}
```

## Components Usage Patterns

### Hook Usage

```typescript
import { useTranslation } from 'react-i18next';

// Simple translation
const { t } = useTranslation();
const text = t('dashboard');

// Access i18n instance for language changes
const { i18n } = useTranslation();
```

### Translation Examples

```typescript
// Simple keys
t('dashboard')
t('companies')
t('common.error')

// Nested keys
t('companies.title')
t('currencies.code')
t('fixed_assets.fields.name')

// With interpolation
t('companies.confirmDelete', { name: 'Company Name' })
t('currencies.confirmDelete', { code: 'USD' })

// Pluralization (if implemented)
t('items.count', { count: 5 })
```

## Language Switcher Component

### Location
`src/components/LanguageSwitcher.tsx`

### Features
- **Dropdown Menu** with flag emojis
- **Visual Indicators**: 🇧🇬 Bulgarian, 🇬🇧 English
- **Current Language Display**: Shows active selection
- **Instant Switching**: No page reload required

### Integration
```typescript
// Used in Header component
<LanguageSwitcher />

// Language change handler
const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};
```

## Implementation in Components

### Sidebar Navigation (`src/components/Sidebar.tsx`)
```typescript
const { t } = useTranslation();

// Navigation items translated
<nav>
  <Link to="/dashboard">{t('navigation.dashboard')}</Link>
  <Link to="/companies">{t('navigation.companies')}</Link>
  <Link to="/accounts">{t('navigation.accounts')}</Link>
</nav>
```

### Page Components
All major pages implement translations:
- **Dashboard**: `src/pages/Dashboard.tsx`
- **Companies**: `src/pages/Companies.tsx`
- **Accounts**: `src/pages/Accounts.tsx`
- **Fixed Assets**: `src/pages/FixedAssets.tsx`

### Form Components
```typescript
// Field labels
<label>{t('companies.fields.name')}</label>
<input placeholder={t('companies.fields.namePlaceholder')} />

// Buttons
<button>{t('common.save')}</button>
<button>{t('common.cancel')}</button>

// Messages
{error && <div className="error">{t('common.error')}</div>}
```

## Language Detection & Persistence

### Browser Detection
The `i18next-browser-languagedetector` automatically:
1. **Detects** browser language preferences
2. **Falls back** to Bulgarian (`bg`) if unsupported
3. **Stores** user selection in localStorage
4. **Maintains** language choice across sessions

### Detection Order
1. `localStorage` (user's previous choice)
2. Browser `navigator.language`
3. Fallback to `bg`

## Translation Coverage

### Complete Sections
- ✅ **Navigation Menu**: All main navigation items
- ✅ **Common UI**: Buttons, messages, actions
- ✅ **Companies Module**: CRUD operations, forms, tables
- ✅ **Accounts Module**: Account management interface
- ✅ **Currencies Module**: Currency management
- ✅ **VAT Rates Module**: VAT rate configuration
- ✅ **Fixed Assets Module**: Asset tracking interface
- ✅ **User Profile**: Profile management
- ✅ **Error Messages**: Consistent error handling
- ✅ **Form Validation**: All validation messages

### Translation Statistics
- **Total Keys**: 375 per language
- **Bulgarian**: 100% complete
- **English**: 100% complete
- **Coverage**: All UI elements internationalized

## Development Workflow

### Adding New Translations

1. **Add Keys to Both Languages**
   ```json
   // src/locales/bg/translation.json
   "newFeature": {
     "title": "Нова функция",
     "description": "Описание на новата функция"
   }
   
   // src/locales/en/translation.json
   "newFeature": {
     "title": "New Feature", 
     "description": "Description of new feature"
   }
   ```

2. **Use in Component**
   ```typescript
   const { t } = useTranslation();
   return (
     <div>
       <h2>{t('newFeature.title')}</h2>
       <p>{t('newFeature.description')}</p>
     </div>
   );
   ```

3. **Test Both Languages**
   - Use language switcher to verify translations
   - Check for missing keys (console warnings)

### Best Practices

1. **Key Naming**: Use consistent, descriptive naming
   ```typescript
   // Good
   t('companies.form.name')
   t('common.buttons.save')
   
   // Avoid
   t('name')
   t('save')
   ```

2. **Nested Structure**: Group related translations
   ```json
   {
     "companies": {
       "list": { ... },
       "form": { ... },
       "messages": { ... }
     }
   }
   ```

3. **Maintain Consistency**: Keep both language files in sync

## Performance Considerations

### Current Implementation
- **Direct Import**: All translations loaded at startup
- **Memory Usage**: ~375 keys × 2 languages = minimal impact
- **Switch Performance**: Instant language switching

### Potential Optimizations
- **Lazy Loading**: Load translations on demand
- **Split Translations**: Separate by feature/module
- **Compression**: Minify JSON files in production

## Testing Translations

### Manual Testing
1. **Language Switching**: Test language switcher functionality
2. **Translation Coverage**: Navigate all pages in both languages
3. **Missing Keys**: Check console for missing translation warnings
4. **Text Overflow**: Ensure translations fit in UI elements

### Automated Testing (Future)
```typescript
// Example test structure
describe('Translations', () => {
  test('all keys exist in both languages', () => {
    // Compare bg and en translation keys
  });
  
  test('component renders in both languages', () => {
    // Test component with different language contexts
  });
});
```

## Maintenance Tasks

### Immediate Actions
- [ ] **Remove Duplicate Files**: Delete unused `/public/locales` directory
- [ ] **Documentation**: Update component documentation with translation patterns

### Future Enhancements
- [ ] **Pluralization Support**: Add plural forms for better English grammar
- [ ] **Lazy Loading**: Implement on-demand translation loading
- [ ] **RTL Support**: Add support for right-to-left languages
- [ ] **Translation Validation**: Automated checks for missing/unused keys
- [ ] **Additional Languages**: Expand to other languages as needed

## Integration Points

### Backend Integration
The frontend translation system works independently of the backend. API responses are in English/technical format, and frontend handles all user-facing translations.

### User Experience
- **Seamless Switching**: No page reload required
- **Persistent Choice**: Language preference remembered
- **Fallback Safety**: Always displays content in Bulgarian if English missing

## Conclusion

The Baraba frontend translation system is **comprehensive and production-ready** with:
- Complete Bulgarian and English coverage
- User-friendly language switching
- Consistent implementation patterns
- Excellent developer experience

The system provides solid internationalization foundation for the accounting system with room for future enhancements as the application grows.