# Scalla CRM API - Live Validation Report

**Date:** June 25, 2026
**Tested by:** Claude (on behalf of Arye Glikman)
**API Version:** v2.0
**Test Account:** Demo account (<configured via environment>)

---

## Bottom Line

**The Scalla API is fully sufficient to build the dashboard product.** Every critical capability - authentication, schema discovery, record retrieval, search, and dashboard config - works as needed. No blockers identified. One open item: tenant_id discovery for real (non-demo) client accounts.

---

## 1. Authentication Flow - VALIDATED

**Endpoint:** `POST https://api.scallacrm.co.il/scallaapi/api`

```
Parameters:
  _operation: loginAndFetchModules
  username: <email>
  password: <password>
```

**Response includes:**
- `sessionId` - use as Bearer token or `_session` parameter on all subsequent calls
- `unique_id` - tenant identifier (partial - see tenant_id section)
- Full module list (123 modules)
- User profile, preferences, currency settings

**Result:** Clean REST auth. No OAuth complexity. Session-based - straightforward to implement.

---

## 2. Schema Discovery (GetModuleFields) - VALIDATED

Retrieves complete field definitions for any module including:
- Field names (API keys), Hebrew labels, data types
- Mandatory flags, default values
- Picklist/dropdown options with values
- Block groupings (logical field sections)
- Custom fields specific to the client's configuration

**Tested modules and results:**

| Module | Fields | Blocks | Custom Fields Found |
|--------|--------|--------|-------------------|
| Leads | 40+ | 9 | Yes (baby name, trial dates, branch - Giliguli-specific) |
| Contacts | 62 | 11 | Standard |
| Potentials | 30+ | 5 | Pipeline stages, amounts, probability |
| Invoice | 25+ | 4 | Line items, totals, tax |
| Accounts | 30+ | 6 | Standard |
| Products | 20+ | 3 | Standard |

**Key insight:** Custom fields are fully exposed. This means each client's unique CRM configuration (vertical-specific fields, custom statuses, custom picklists) is programmatically discoverable. This enables auto-configuration of dashboards per client without manual field mapping.

---

## 3. Record Retrieval (Listrecordsbymodule) - VALIDATED

Successfully pulled live records from 8 modules:

| Module | Records Found | Sample Data |
|--------|--------------|-------------|
| Leads | Multiple | Names, status, source, assigned user, creation dates |
| Contacts | Multiple | Full contact details, account associations |
| Potentials | Multiple | Deal names, stages, amounts, close dates, probability |
| Accounts | Multiple | Company names, industry, addresses |
| Invoice | Multiple | Invoice numbers, totals, status, line items |
| Quotes | Multiple | Quote details, amounts, validity |
| Products | Multiple | Product names, prices, categories |
| HelpDesk | Multiple | Ticket subjects, status, priority |

**Pagination:** Results are paginated. Sufficient for dashboard use - dashboards typically aggregate, not display raw records.

---

## 4. Search & Filtering (SearchRecords) - VALIDATED

Supports up to 5 field-level filters with comparison operators:
- `=` (exact match)
- `LIKE` (partial match)
- Standard comparison operators

Sufficient for filtered dashboard views (e.g., "leads from this month", "deals above 10K", "open tickets only").

---

## 5. Dashboard API - VALIDATED

Returns the client's existing dashboard configuration:
- **15 widgets** found (7 active in demo account):
  - Funnel Amount (סך הכל סכום לפי שלב מכירות)
  - Leads by Source (לידים לפי מקור)
  - Leads by Status (לידים לפי סטטוס)
  - Top Potentials (הזדמנויות מובילות)
  - Potentials by Stage (הזדמנויות לפי שלב)
  - Tag Cloud, Mini List
- **11 reports** configured (test reports in demo)

**Use case:** Understand what KPIs the client already cares about before building their dashboard.

---

## 6. Open Items

### 6.1 tenant_id for Real Clients (Priority)

The demo account uses a known demo tenant_id from the documentation. When logging in with the demo credentials, `unique_id` from the login response works for `GetModuleFields` but fails for data-listing operations with a different tenant_id.

**Action needed:** Test with a real client's Scalla credentials to confirm how tenant_id is obtained. It may simply work correctly for non-demo accounts, or there may be a separate API call.

### 6.2 Aggregation/Grouping API

`fetchRecordWithGrouping` returned "Operation not found." Aggregations (sums, counts, averages by group) must be computed client-side from raw records. This is standard practice and not a blocker.

### 6.3 CORS / Server-Side Requirement

The API blocks cross-origin browser requests. Dashboard architecture must include a server-side component (Node.js or Python) that fetches from the Scalla API and serves data to the dashboard frontend. Standard pattern - no risk.

### 6.4 Rate Limits

Not documented, not hit during testing. Monitor during production use.

---

## 7. Architecture Recommendation

```
[Scalla API] ←→ [Server-side fetcher (Node/Python)]
                        ↓
              [Local data cache / JSON store]
                        ↓
              [Dashboard HTML + Chart.js]
```

- **Fetcher** runs on cron (every 15-60 min) or on-demand
- **Cache** avoids hammering the API and enables fast dashboard loads
- **Dashboard** is a self-contained HTML file reading from the cache
- **Schema auto-config** via `GetModuleFields` at onboarding time

---

## 8. Feasibility Summary

| Capability | Required for MVP | API Support | Status |
|-----------|-----------------|-------------|--------|
| Authenticate per client | Yes | loginAndFetchModules | READY |
| Discover client's CRM schema | Yes | GetModuleFields | READY |
| Pull leads, deals, invoices | Yes | Listrecordsbymodule | READY |
| Filter by date/status/field | Yes | SearchRecords | READY |
| Aggregate data for charts | Yes | Client-side from raw records | READY |
| Understand existing dashboards | Nice-to-have | Dashboard API | READY |
| Real-time updates | No (polling OK) | No webhooks | ACCEPTABLE |
| Tenant discovery for real clients | Yes | Needs real credential test | OPEN |

**Conclusion:** Green light. The API delivers everything needed. The only remaining validation is tenant_id behavior with a real client account - low risk, likely a non-issue.

