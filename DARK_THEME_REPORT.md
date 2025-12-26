# Dark Theme Implementation Report

## Overview

The application uses Chakra UI v3 with a custom theme system. Dark theme support requires using responsive color objects instead of hardcoded color values.

## Theme System

**Location:** `frontend/src/theme.ts` and `frontend/src/contexts/ThemeContext.tsx`

**Correct Pattern:**
```tsx
// Instead of:
bg="white"
bg="gray.50"
color="gray.600"

// Use:
bg={{ base: "white", _dark: "gray.800" }}
bg={{ base: "gray.50", _dark: "gray.700" }}
color={{ base: "gray.600", _dark: "gray.400" }}
```

## Completed Fixes

### Components
| File | Changes |
|------|---------|
| `components/ScannerToJournalModal.tsx` | Fixed 5 hardcoded backgrounds (gray.50, blue.50, orange.50) |
| `components/SmartEntryForm.tsx` | Fixed dropdown bg, sections, hover states |
| `components/TestModal.tsx` | Fixed 3 hardcoded color boxes |

### Pages
| File | Changes |
|------|---------|
| `pages/CompaniesPage.tsx` | Table container + selected row highlight |
| `pages/AccountsPage.tsx` | Table container |
| `pages/ProductsPage.tsx` | Table container |
| `pages/CounterpartsPage.tsx` | Table container + VIES address input |
| `pages/VatRatesPage.tsx` | Table container |
| `pages/JournalEntriesPage.tsx` | Table container |
| `pages/BankAccountsPage.tsx` | Table container |
| `pages/CurrenciesPage.tsx` | 3 containers (currencies, rates controls, rates table) |
| `pages/AccountingPeriodsPage.tsx` | Filters box + periods table |
| `pages/OpeningBalancesPage.tsx` | Summary box + table |
| `pages/BankTransactionsPage.tsx` | Reconciliation section + tabs content |
| `pages/CurrencyRevaluationPage.tsx` | History tab + stat boxes |
| `pages/ScannedInvoicesPage.tsx` | 4 stat cards with colors |
| `pages/SettingsPage.tsx` | Feature toggles + currency/VAT links |
| `pages/VatReturnsPage.tsx` | Table header rows |
| `pages/DocumentScannerPage.tsx` | Batch file list items |

## Remaining Work

### Files with Correct Pattern (Reference)
`pages/FixedAssetsPage.tsx` - Already uses `_dark={{ bg: 'gray.800' }}` pattern correctly.

### Files That May Need Review

1. **UsersList.tsx** - Check for hardcoded hover colors
2. **Any new components/pages** - Apply the same pattern

### Color Mapping Reference

| Light Mode | Dark Mode | Usage |
|------------|-----------|-------|
| `white` | `gray.800` | Card/panel backgrounds |
| `gray.50` | `gray.700` or `gray.900` | Subtle backgrounds, inputs |
| `gray.100` | `gray.700` | Borders, dividers |
| `gray.600` | `gray.400` | Muted text |
| `blue.50` | `blue.900/30` | Info highlights |
| `blue.100` | `blue.900/50` | Hover states |
| `green.50` | `green.900/30` | Success highlights |
| `orange.50` | `orange.900/30` | Warning highlights |
| `yellow.50` | `yellow.900/30` | Pending/attention |
| `blue.600` | `blue.400` | Primary accent text |
| `green.600` | `green.400` | Success text |
| `orange.700` | `orange.300` | Warning text |

### Search Commands to Find Issues

```bash
# Find hardcoded white backgrounds
grep -r 'bg="white"' frontend/src/

# Find hardcoded gray.50 backgrounds
grep -r 'bg="gray.50"' frontend/src/

# Find hardcoded blue.50 backgrounds
grep -r 'bg="blue.50"' frontend/src/

# Find all potential color issues
grep -rE 'bg="[a-z]+\.[0-9]+"' frontend/src/
grep -rE "bg='[a-z]+\.[0-9]+'" frontend/src/
```

## Build Notes

There are pre-existing TypeScript errors in `src/api/client.ts` (ApiResponse type issues) and unused imports in some files. These are NOT related to dark theme work.

To test changes:
```bash
cd baraba_ub
docker compose build frontend
docker compose up -d frontend
```

## Testing Checklist

1. Switch to dark mode in the app
2. Check each page for:
   - White/light boxes that don't change color
   - Text that becomes unreadable
   - Hover states that look wrong
3. Check all modals/dialogs
4. Check dropdown menus and select components
5. Check table rows (especially selected/hover states)

---
*Report generated: 2025-12-24*
