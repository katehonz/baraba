# Security Audit Report
## Date: 2025-12-25

## Executive Summary
Critical authentication and authorization vulnerabilities discovered in the Baraba accounting system. The Phoenix API is completely unprotected and accessible to anyone without any JWT verification.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. NO AUTHENTICATION ON PHOENIX API (CRITICAL)

**Location:** `baraba_ub/apps/baraba_umbrella_web/lib/baraba_umbrella_web/router.ex:4-6`

**Issue:**
```elixir
pipeline :api do
  plug(:accepts, ["json"])
end
```

**Impact:**
- All API endpoints are COMPLETELY OPEN without any authentication
- Anyone can access, modify, delete ANY company, account, journal entry, counterpart, bank account, etc.
- No user validation, no permission checking, no company isolation
- Full database access via REST API

**Affected Endpoints (ALL UNPROTECTED):**
- `GET /api/companies` - List ALL companies
- `GET /api/companies/:id` - View any company
- `POST /api/companies` - Create companies
- `PUT /api/companies/:id` - Modify any company
- `DELETE /api/companies/:id` - Delete any company
- `GET /api/companies/:id/accounts` - View any company's accounts
- `POST /api/companies/:id/accounts` - Create accounts
- `GET /api/companies/:id/journal-entries` - View all journal entries
- `POST /api/companies/:id/journal-entries` - Create accounting entries
- `POST /api/companies/:id/journal-entries/:id/post` - Post journal entries to GL
- `GET /api/companies/:id/counterparts` - View all counterparts
- `POST /api/companies/:id/counterparts` - Create counterparts
- `GET /api/companies/:id/bank-accounts` - View bank accounts
- `GET /api/companies/:id/fixed-assets` - View all fixed assets
- `POST /api/companies/:id/fixed-assets` - Create fixed assets
- `POST /api/companies/:id/currency-revaluations` - Create revaluations
- `POST /api/companies/:id/reports/generate` - Generate financial reports
- `GET /api/currencies` - Modify currencies
- `GET /api/exchange-rates` - View/modify exchange rates
- ALL OTHER ENDPOINTS

**Risk Level:** CRITICAL

**Recommendation:**
```elixir
# Create JWT verification plug
defmodule BarabaUmbrellaWeb.Plugs.Authenticate do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    token = get_req_header(conn, "authorization")
           |> List.first()
           |> String.replace_prefix("Bearer ", "")

    case verify_jwt_token(token) do
      {:ok, claims} ->
        conn
        |> assign(:user_id, claims["user_id"])
        |> assign(:username, claims["username"])
        |> assign(:group_id, claims["group_id"])

      {:error, _reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid or missing token"})
        |> halt()
    end
  end
end

# Update router
pipeline :api do
  plug(:accepts, ["json"])
  plug(BarabaUmbrellaWeb.Plugs.Authenticate)
end
```

---

### 2. AUTH CONTEXT MISSING PERMISSIONS DATA

**Location:** `frontend/src/contexts/AuthContext.tsx`

**Issue:**
The `/api/auth/me` endpoint returns:
```json
{
  "id": 1,
  "username": "superadmin",
  "groupId": 1,
  "permissions": {
    "canCreateCompanies": true,
    "canEditCompanies": true,
    "canDeleteCompanies": true,
    "canManageUsers": true,
    "canViewReports": true,
    "canPostEntries": true
  },
  "isSuperAdmin": true,
  "companies": [...]
}
```

But AuthContext only stores:
```typescript
interface User {
  id: number
  username: string
  email: string
  firstName?: string
  lastName?: string
}
```

**Impact:**
- Frontend cannot check user permissions for UI controls
- Cannot hide/show features based on user roles
- Cannot restrict access to admin-only pages
- Superadmin flag not available

**Recommendation:**
```typescript
interface User {
  id: number
  username: string
  email: string
  firstName?: string
  lastName?: string
  groupId: number
  isSuperAdmin: boolean
  permissions: {
    canCreateCompanies: boolean
    canEditCompanies: boolean
    canDeleteCompanies: boolean
    canManageUsers: boolean
    canViewReports: boolean
    canPostEntries: boolean
  }
  companies: Company[]
}
```

---

### 3. COMPANY ISOLATION MISSING

**Issue:**
Even if JWT auth is added, there's NO company isolation in controllers. Any authenticated user can access ANY company's data.

**Example:**
```elixir
# CompanyController - NO company ownership check
def index(conn, _params) do
  companies = Accounting.list_companies()  # Returns ALL companies
  render(conn, :index, companies: companies)
end
```

**Impact:**
- User A can see User B's companies
- User A can modify User B's accounting entries
- User A can delete User B's data
- Complete privacy breach between users/companies

**Recommendation:**
```elixir
# Each controller must check if user has access to the requested company
def index(conn, _params) do
  user_id = conn.assigns[:user_id]
  is_superadmin = conn.assigns[:is_superadmin]

  companies = if is_superadmin do
    Accounting.list_all_companies()
  else
    Accounting.list_user_companies(user_id)
  end

  render(conn, :index, companies: companies)
end
```

---

### 4. NO PERMISSION CHECKING IN CONTROLLERS

**Issue:**
Even with company isolation, there are NO permission checks for operations:
- `can_create_companies` - Not checked when creating companies
- `can_edit_companies` - Not checked when updating companies
- `can_delete_companies` - Not checked when deleting companies
- `can_post_entries` - Not checked when posting journal entries
- `can_view_reports` - Not checked when generating reports
- `can_manage_users` - Not implemented

**Impact:**
- Users with limited permissions can perform unauthorized operations
- Accountants could manage users or delete companies
- Viewers could post accounting entries
- No granular access control

---

## 🟡 HIGH PRIORITY ISSUES

### 5. JWT SHARED SECRET NOT CONFIGURED

The Phoenix app doesn't have access to the JWT secret used by identity_service. Token verification will fail until:
- JWT secret is added to Phoenix config
- Shared secret mechanism is implemented between services

---

### 6. HTTPoison Dependency Missing

**Location:** `baraba_ub/apps/baraba_umbrella_web/lib/baraba_umbrella_web/controllers/scanned_invoice_controller.ex:122`

**Issue:**
```elixir
case HTTPoison.get(url, [], recv_timeout: 30_000) do
  {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
```

HTTPoison is used but not in dependencies (recently added but not compiled).

---

## 🟢 MEDIUM PRIORITY ISSUES

### 7. CORS Configuration

**Location:** `baraba_ub/apps/baraba_umbrella_web/lib/baraba_umbrella_web/endpoint.ex:51-54`

```elixir
plug Corsica,
  origins: ["http://localhost:5173", "http://127.0.0.1:5173"],
  allow_headers: ["content-type", "authorization"],
  allow_methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
```

CORS is configured correctly but needs to be updated for production domains.

---

## RECOMMENDATIONS PRIORITY ORDER

### IMMEDIATE (Fix Today):
1. Add JWT authentication plug to Phoenix API pipeline
2. Add company ownership checks in all controllers
3. Update AuthContext to store permissions and isSuperAdmin

### HIGH PRIORITY (This Week):
4. Add permission checks for all operations
5. Configure JWT secret sharing between services
6. Add user-company association checks

### MEDIUM PRIORITY (Next Sprint):
7. Add audit logging for all sensitive operations
8. Implement IP whitelisting for production
9. Add rate limiting to prevent abuse
10. Implement two-factor authentication for superadmin

---

## TESTING RECOMMENDATIONS

1. Test that unauthenticated requests are rejected
2. Test that users cannot access other users' companies
3. Test that limited users cannot perform admin operations
4. Test JWT token expiration handling
5. Test permission-based UI hiding/showing

---

## COMPROMISE ASSESSMENT

**Current State:** The system is **FULLY COMPROMISED** for production use. Anyone with API access can:
- View, modify, delete any accounting data
- Access any company's financial information
- Post fraudulent journal entries
- Generate reports for any company
- Create/delete unlimited entities

**Risk:** CRITICAL - Complete data breach vulnerability

**Action Required:** DO NOT DEPLOY TO PRODUCTION until authentication and authorization are implemented.

---

## CONCLUSION

The Baraba accounting system has a **critical security vulnerability** where the entire Phoenix API is unprotected. While a sophisticated identity_service exists with JWT authentication and role-based permissions, none of this is enforced in the main API.

The system appears to be in a development state where authentication was planned but never implemented. This represents a fundamental security failure that must be addressed before any production deployment.

---

**Report Generated By:** OpenCode AI Assistant
**Date:** 2025-12-25
**Severity:** CRITICAL
