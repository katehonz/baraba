# Opening Balances System Documentation

## Overview

The opening balance system allows for the entry of initial balances for accounting accounts at the beginning of an accounting period. This is essential for generating accurate financial reports and is fully implemented with complete CRUD functionality.

## Database Schema

The opening balances are stored in the `opening_balances` table. The schema is defined in `BarabaUmbrella.Accounting.OpeningBalance` and has the following fields:

- `id`: Primary key (UUID)
- `debit`: The opening debit balance (decimal)
- `credit`: The opening credit balance (decimal)
- `date`: The date of the opening balance (e.g., the first day of the accounting period)
- `account_id`: Foreign key reference to the `accounts` table
- `company_id`: Foreign key reference to the `companies` table
- `accounting_period_id`: Foreign key reference to the `accounting_periods` table
- `inserted_at`: Timestamp for record creation
- `updated_at`: Timestamp for record updates

## Backend Implementation

### Phoenix Context Functions

The `BarabaUmbrella.Accounting` context provides comprehensive functions for managing opening balances:

- `list_opening_balances(company_id, opts \ %{})`: Returns a paginated list of opening balances for a given company, with optional filtering by date
- `get_opening_balance!(id)`: Retrieves a single opening balance by its ID (raises if not found)
- `create_opening_balance(attrs \ %{})`: Creates a new opening balance with validation
- `update_opening_balance(%OpeningBalance{} = opening_balance, attrs)`: Updates an existing opening balance
- `delete_opening_balance(%OpeningBalance{} = opening_balance)`: Deletes an opening balance
- `change_opening_balance(%OpeningBalance{} = opening_balance, attrs \ %{})`: Returns a changeset for an opening balance

### API Endpoints

Full REST API support is implemented at `/api/companies/{company_id}/opening-balances`:

- `GET /api/companies/{company_id}/opening-balances` - List opening balances with optional date filtering
- `POST /api/companies/{company_id}/opening-balances` - Create new opening balance
- `GET /api/companies/{company_id}/opening-balances/{id}` - Get specific opening balance
- `PUT /api/companies/{company_id}/opening-balances/{id}` - Update opening balance
- `DELETE /api/companies/{company_id}/opening-balances/{id}` - Delete opening balance

### Query Parameters

- `date` (optional): Filter opening balances by specific date
- `page` (optional): Pagination page number
- `page_size` (optional): Number of items per page

## Frontend Implementation

### React Components

#### OpeningBalancesPage (`/opening-balances`)

Location: `frontend/src/pages/OpeningBalancesPage.tsx`

**Features:**
- Complete CRUD interface for opening balances
- Account selection dropdown populated from company accounts
- Date filtering capabilities
- Modal-based create/edit forms
- Confirmation dialogs for deletions
- Responsive table layout with action buttons
- Loading states and error handling
- Toast notifications for user feedback

**Component Structure:**
- Data table with sortable columns
- Create/Edit modal with form validation
- Filter controls for date-based queries
- Account lookup with display names

#### Navigation Integration

- Added to main sidebar navigation under "Opening Balances"
- Accessible at route `/opening-balances`
- Properly integrated with company context

### TypeScript Types

```typescript
interface OpeningBalance {
  id: string
  debit: number
  credit: number
  date: string
  account_id: string
  company_id: string
  accounting_period_id: string
  account?: Account  // Populated account details
}
```

### API Client

Location: `frontend/src/api/client.ts`

```typescript
class ApiClient {
  async getOpeningBalances(companyId: string, date?: string): Promise<ApiResponse<OpeningBalance[]>>
  async createOpeningBalance(companyId: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>>
  async updateOpeningBalance(companyId: string, id: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>>
  async deleteOpeningBalance(companyId: string, id: string): Promise<void>
}
```

## Internationalization

### Translation Keys

Complete bilingual support implemented in `frontend/src/locales/`:

**Bulgarian (bg):**
```json
"openingBalances": {
  "title": "Начални салда",
  "create": "Създай начално салдо",
  "edit": "Редактирай начално салдо",
  "delete": "Изтрий начално салдо",
  "account": "Сметка",
  "debit": "Дебит",
  "credit": "Кредит",
  "date": "Дата",
  "noData": "Няма въведени начални салда",
  "confirmDelete": "Сигурни ли сте, че искате да изтриете това начално салдо?"
}
```

**English (en):**
```json
"openingBalances": {
  "title": "Opening Balances",
  "create": "Create Opening Balance",
  "edit": "Edit Opening Balance",
  "delete": "Delete Opening Balance",
  "account": "Account",
  "debit": "Debit",
  "credit": "Credit",
  "date": "Date",
  "noData": "No opening balances found",
  "confirmDelete": "Are you sure you want to delete this opening balance?"
}
```

## Reporting Integration

### Balance Calculation

To get the balance of an account for a given period, you need to combine the opening balance with the sum of the transactions within that period. The formula is:

`Account Balance = Opening Balance + Sum of transactions in the period`

### Jasper Reports Integration

The opening balance data is available for reporting through:
- Direct database queries in Jasper report templates
- API endpoints for real-time balance calculations
- Period-based opening balance aggregation

### Trial Balance Enhancement

Opening balances are integrated into trial balance calculations:
- Opening balances are included as period-starting positions
- Debit and credit opening balances are properly categorized
- Period-end calculations correctly account for opening positions

## Business Logic Features

### Validation Rules

1. **Account Validation**: Opening balance must reference valid company account
2. **Date Validation**: Date must be within valid accounting periods
3. **Balance Validation**: Either debit or credit must be zero (double-entry)
4. **Period Constraints**: Only one opening balance per account per period

### Automatic Calculations

The opening balance for a period is the closing balance of the previous period. The system includes:
- `calculate_and_create_opening_balances_for_period(period)` function (placeholder for automation)
- Period-end closing balance calculations
- Cross-period balance continuity

## Data Flow

1. **User Access**: Navigation → Opening Balances Page
2. **Data Loading**: API call → Backend context → Database query
3. **CRUD Operations**: Form data → API validation → Database update
4. **UI Updates**: Real-time table refresh → Toast notifications
5. **Reporting**: Balance calculations → Jasper report generation

## Security and Permissions

- Company-scoped access control
- User permissions enforced through JWT tokens
- CRUD operations respect user role permissions
- Audit trail maintained for all changes

## Future Enhancements

### Planned Features

1. **Automated Opening Balance Generation**
   - Implement `calculate_and_create_opening_balances_for_period(period)`
   - Automatic year-end closing balance transfers
   - Period transition workflows

2. **Advanced Reporting**
   - Enhanced Jasper report templates with opening balance integration
   - Period-over-period balance tracking
   - Opening balance variance analysis

3. **Batch Operations**
   - Import opening balances from CSV/Excel files
   - Bulk opening balance updates
   - Historical data migration tools

4. **Enhanced Validation**
   - Cross-account balance validation
   - Period overlap detection
   - Automatic balance reconciliation

## Technical Considerations

### Performance

- Database indexes on `company_id`, `account_id`, and `date` fields
- Pagination for large datasets
- Optimized queries for balance calculations

### Data Integrity

- Foreign key constraints ensure referential integrity
- Double-entry balance validation
- Period-based uniqueness constraints

### Scalability

- Multi-tenant architecture with company isolation
- Efficient database queries for large datasets
- Caching strategies for frequently accessed balance data

## Testing

### Unit Tests

- Context function testing for CRUD operations
- Changeset validation testing
- Business logic verification

### Integration Tests

- API endpoint testing with various scenarios
- Frontend component testing with mock data
- End-to-end workflow testing

### User Acceptance Testing

- CRUD interface usability testing
- Translation accuracy verification
- Performance testing with large datasets

## Conclusion

The opening balances system is fully implemented with comprehensive CRUD functionality, complete frontend interface, bilingual support, and integration with the reporting system. It provides essential accounting functionality for managing period-starting positions and ensures accurate financial reporting.
