# GQM Admin Panel

Administrative dashboard for property restoration and maintenance management. Built with **Next.js 16 App Router**, **TypeScript**, and **Tailwind CSS**, it communicates exclusively with a **Python REST backend** through a Next.js API proxy layer.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [Application Routes & Pages](#application-routes--pages)
6. [API Proxy Architecture](#api-proxy-architecture)
7. [All API Endpoints](#all-api-endpoints)
8. [Authentication & Authorization](#authentication--authorization)
9. [Component Architecture](#component-architecture)
10. [State Management](#state-management)
11. [Internationalization (i18n)](#internationalization-i18n)
12. [Key Modules](#key-modules)
13. [Core Types](#core-types)
14. [Development Workflow](#development-workflow)
15. [Build & Deployment](#build--deployment)

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4.1.9 |
| UI Primitives | Radix UI (via shadcn/ui) | multiple |
| Icons | lucide-react | 0.454.0 |
| Charts | Recharts | 2.15.4 |
| Forms | React Hook Form + Zod | 7.60.0 / 3.25.76 |
| Drag & Drop | dnd-kit | 6/8 |
| i18n | next-intl | 4.9.1 |
| Theme | next-themes | 0.4.6 |
| File Storage | Cloudinary SDK | 2.5.1 |
| Excel Export | xlsx | 0.18.5 |
| Date Utilities | date-fns | 4.1.0 |
| Analytics | @vercel/analytics | 1.3.1 |
| Notifications | sonner | 1.7.4 |
| Package Manager | pnpm (npm also works) | — |

---

## Prerequisites & Setup

**Node.js** >= 18 is required.

```bash
# 1. Install dependencies
npm install
# or
pnpm install

# 2. Copy and configure environment variables
cp .env.example .env
# Set PYTHON_API_BASE_URL to your local or remote Python API URL

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The `dev` script sets `NODE_OPTIONS=--max-old-space-size=4096` to prevent memory issues during development on Windows.

---

## Environment Variables

Create a `.env` file at the project root (use `.env.example` as the template):

```bash
cp .env.example .env
```

```env
# Python backend base URL (required)
PYTHON_API_BASE_URL=http://127.0.0.1:80/
```

| Variable | Description | Required |
|---|---|---|
| `PYTHON_API_BASE_URL` | Base URL of the Python REST backend. Used server-side only within Next.js API routes. Falls back to a DevTunnel URL if unset. | Yes |

> **Note on Cloudinary:** File uploads are handled entirely by the Python backend (`src/cloudinary/service.py`). The frontend upload route (`app/api/upload/route.ts`) is a thin proxy that forwards `FormData` to `/attachments/upload` on the Python API. Cloudinary credentials belong in the **backend's** environment variables, not here.

> All backend communication happens server-side through `/app/api/` proxy routes — **no environment variable is ever exposed to the browser**.

---

## Project Structure

```
gqm-panel-admin/
├── app/                        # Next.js App Router (pages + API routes)
│   ├── layout.tsx              # Root layout: providers, metadata, Vercel Analytics
│   ├── page.tsx                # / → redirects to /login
│   ├── globals.css             # Global CSS reset and Tailwind base
│   │
│   ├── api/                    # Server-side proxy routes to Python backend
│   │   ├── auth/               # login, refresh, permission check
│   │   ├── jobs/               # CRUD + export + special queries
│   │   ├── clients/            # CRUD + paginated table + metrics
│   │   ├── members/            # CRUD + roles + permissions
│   │   ├── technician/         # Technician CRUD + permissions
│   │   ├── subcontractors/     # CRUD + table
│   │   ├── metrics/            # Dashboard metrics (jobs, clients, members, timeline)
│   │   ├── tasks/              # CRUD + job-scoped + weekly view
│   │   ├── estimate/           # Estimate CRUD
│   │   ├── change-order/       # Change order CRUD
│   │   ├── purchase-orders/    # PO CRUD + items + supplier links
│   │   ├── purchases/          # Purchase CRUD + table
│   │   ├── supplier/           # Supplier CRUD
│   │   ├── commission/         # Commission CRUD + Excel export
│   │   ├── multipliers/        # Multiplier CRUD
│   │   ├── job-multipliers/    # Job-specific multiplier associations
│   │   ├── roles/              # Role CRUD
│   │   ├── permissions/        # Permission CRUD
│   │   ├── opportunities/      # Opportunity CRUD + applicants + skills
│   │   ├── skills/             # Skill CRUD + subcontractor associations
│   │   ├── certificates/       # Certificate CRUD + by-subcontractor
│   │   ├── managers/           # Manager CRUD
│   │   ├── parent_mgmt_co/     # Community parent company CRUD
│   │   ├── bldg_dept/          # Building department CRUD
│   │   ├── timeline/           # Timeline events per entity
│   │   ├── chat/               # Job chat messages
│   │   ├── financial/          # Financial summaries, reports, PDF
│   │   ├── attachments/        # File download proxy
│   │   ├── upload/             # Cloudinary upload proxy
│   │   ├── order/              # Order CRUD
│   │   ├── qbo/                # QuickBooks Online sync
│   │   ├── reports/            # Job reports
│   │   ├── job-member/         # Member ↔ Job association
│   │   ├── job-subcontractor/  # Subcontractor ↔ Job association
│   │   ├── client_manager/     # Client ↔ Manager association
│   │   └── client_member/      # Client ↔ Member association
│   │
│   ├── login/                  # Public login page
│   ├── dashboard/              # Main KPI dashboard
│   ├── jobs/                   # Jobs list + detail (11 tabs) + create
│   ├── clients/                # Clients list + detail + create
│   ├── members/                # Members list + detail + create
│   ├── subcontractors/         # Subcontractors + nested technicians + orders
│   ├── technicians/            # Technicians list + detail + create
│   ├── purchases/              # Purchases list + detail + create
│   ├── suppliers/              # Suppliers list + detail + create
│   ├── commissions/            # Commissions list + detail
│   ├── opportunities/          # Opportunities list + detail + create
│   ├── building-departments/   # Building departments list + detail + create
│   ├── communities/            # Communities/PMC list + detail + create
│   ├── roles-permissions/      # Roles & permissions management
│   ├── profile/                # Authenticated user profile
│   └── settings/               # Application settings
│
├── components/                 # Shared React component library
│   ├── atoms/                  # Pure presentational primitives
│   ├── molecules/              # Composite stateless components
│   ├── organisms/              # Feature-level stateful components
│   ├── ui/                     # shadcn/ui Radix-based primitives
│   └── providers/              # React Context providers
│
├── hooks/                      # Custom React hooks
│   ├── usePermissions.ts       # Policy-based permission evaluation
│   ├── useJobFilters.ts        # Job list filter state
│   └── use-toast.ts            # Toast notification hook
│
├── lib/                        # Utilities, services, types
│   ├── types.ts                # All TypeScript interfaces (764 lines)
│   ├── apiFetch.ts             # Authenticated fetch wrapper (auto token refresh)
│   ├── auth-utils.ts           # logout() helper
│   ├── api-config.ts           # API_BASE_URL and endpoint constants
│   ├── api-utils.ts            # getBackendUrl() server utility
│   ├── permissions-modules.ts  # Canonical MODULE_ACTIONS registry
│   ├── utils.ts                # cn() Tailwind class merge helper
│   ├── services/               # Domain-specific API service modules
│   │   ├── jobs-service.ts
│   │   ├── clients-service.ts
│   │   ├── document-service.ts
│   │   └── multiplier-service.ts
│   ├── mappers/                # API response → frontend type transformers
│   │   ├── job.mapper.ts
│   │   ├── client.mapper.ts
│   │   └── estimate.mapper.ts
│   └── utils/
│       └── resolveJobYear.ts
│
├── i18n/
│   └── request.ts              # next-intl server configuration
│
├── messages/                   # i18n translation files
│   ├── en.json                 # English strings
│   └── es.json                 # Spanish strings
│
├── public/                     # Static assets
│   ├── gqm-logo.png
│   └── gqm-favicon.svg
│
├── next.config.mjs             # Next.js config (next-intl plugin, image options)
├── tsconfig.json               # TypeScript config (strict, @/ path alias)
├── postcss.config.mjs          # PostCSS config
├── components.json             # shadcn/ui config
└── .env                        # Environment variables (git-ignored)
```

---

## Application Routes & Pages

### Public

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Redirects to `/login` |
| `/login` | `app/login/page.tsx` | JWT login form |

### Protected (require valid `access_token` in localStorage)

| Route | File | Description |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | KPI overview: job status charts, member pipeline, client metrics |
| `/jobs` | `app/jobs/page.tsx` | Paginated jobs table with advanced filters and Excel export |
| `/jobs/create` | `app/jobs/create/page.tsx` | Create new job form |
| `/jobs/[id]` | `app/jobs/[id]/page.tsx` | Job detail with 11 tabs (see below) |
| `/clients` | `app/clients/page.tsx` | Clients list |
| `/clients/create` | `app/clients/create/page.tsx` | Create client |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Client detail + timeline + metrics |
| `/members` | `app/members/page.tsx` | Team members list |
| `/members/create` | `app/members/create/page.tsx` | Create member |
| `/members/[id]` | `app/members/[id]/page.tsx` | Member detail + permissions + roles |
| `/subcontractors` | `app/subcontractors/page.tsx` | Subcontractors list |
| `/subcontractors/create` | `app/subcontractors/create/page.tsx` | Create subcontractor |
| `/subcontractors/[id]` | `app/subcontractors/[id]/page.tsx` | Subcontractor detail + certificates + skills |
| `/subcontractors/[id]/orders` | `app/subcontractors/[id]/orders/page.tsx` | Orders for this subcontractor |
| `/subcontractors/[id]/orders/create` | `...orders/create/page.tsx` | Create order |
| `/subcontractors/[id]/orders/[orderId]` | `...orders/[orderId]/page.tsx` | Order detail |
| `/subcontractors/[id]/technicians/[technicianId]` | `...technicians/[technicianId]/page.tsx` | Technician detail under subcontractor |
| `/subcontractors/[id]/technicians/[technicianId]/jobs/[jobId]/tasks` | `...tasks/page.tsx` | Tasks for a technician on a specific job |
| `/subcontractors/[id]/technicians/create` | `...technicians/create/page.tsx` | Create technician |
| `/technicians` | `app/technicians/page.tsx` | Global technicians list |
| `/technicians/create` | `app/technicians/create/page.tsx` | Create technician |
| `/technicians/[id]` | `app/technicians/[id]/page.tsx` | Technician detail |
| `/purchases` | `app/purchases/page.tsx` | Purchases / purchase orders list |
| `/purchases/create` | `app/purchases/create/page.tsx` | Create purchase |
| `/purchases/[id]` | `app/purchases/[id]/page.tsx` | Purchase detail |
| `/suppliers` | `app/suppliers/page.tsx` | Suppliers list |
| `/suppliers/create` | `app/suppliers/create/page.tsx` | Create supplier |
| `/suppliers/[id]` | `app/suppliers/[id]/page.tsx` | Supplier detail |
| `/commissions` | `app/commissions/page.tsx` | Commission reports list |
| `/commissions/[id]` | `app/commissions/[id]/page.tsx` | Commission detail breakdown |
| `/opportunities` | `app/opportunities/page.tsx` | Job opportunities (recruitment) |
| `/opportunities/create` | `app/opportunities/create/page.tsx` | Create opportunity |
| `/opportunities/[id]` | `app/opportunities/[id]/page.tsx` | Opportunity detail + applicants + skill requirements |
| `/building-departments` | `app/building-departments/page.tsx` | Building departments list |
| `/building-departments/create` | `...create/page.tsx` | Create building department |
| `/building-departments/[id]` | `...`[id]/page.tsx` | Building department detail |
| `/communities` | `app/communities/page.tsx` | Communities / parent management companies list |
| `/communities/create` | `app/communities/create/page.tsx` | Create community |
| `/communities/[id]` | `app/communities/[id]/page.tsx` | Community detail + timeline |
| `/roles-permissions` | `app/roles-permissions/page.tsx` | Roles and permissions overview |
| `/roles-permissions/create-roles` | `...create-roles/page.tsx` | Create new role |
| `/roles-permissions/create-permissions` | `...create-permissions/page.tsx` | Create new permission |
| `/roles-permissions/roles/[roleId]` | `...roles/[roleId]/page.tsx` | Edit role |
| `/roles-permissions/permissions/[permissionId]` | `...permissions/[permissionId]/page.tsx` | Edit permission |
| `/profile` | `app/profile/page.tsx` | Logged-in user profile settings |
| `/settings` | `app/settings/page.tsx` | Application settings |

### Job Detail Tabs (`/jobs/[id]`)

The job detail page is implemented with 11 tabs, each as an independent organism component:

| Tab | Component | Description |
|---|---|---|
| Details | `JobDetailsTab` | Core job fields: type, status, address, dates |
| Members | `JobMembersTab` | Assign/remove team members from the job |
| Subcontractors | `JobSubcontractorsTab` | Assign/remove subcontractors |
| Documents | `JobDocumentsTab` | Upload and manage attachments |
| Estimate | `JobEstimateTab` | Estimate line items and totals |
| Pricing | `JobPricingTab` | Pricing breakdown, multipliers, cost analysis |
| Purchases | `JobPurchasesTab` | POs and purchases tied to this job |
| Tasks | `JobTasksTab` | Task list with status and assignment |
| Chat | `JobChatTab` | Internal messaging thread for this job |
| Technicians | `JobTechniciansTab` | Field technicians assigned to the job |
| Commissions | `JobCommissionsTab` | Commission entries for sales reps |

---

## API Proxy Architecture

All API calls from the browser go to **Next.js API routes** (`/app/api/`). These routes run server-side, inject credentials (sourced from environment variables), and forward the request to the **Python backend**.

```
Browser (React)
    │
    │  fetch('/api/jobs')
    ▼
Next.js API Route              ← Runs on Node.js (server-side)
app/api/jobs/route.ts
    │
    │  Authorization: Bearer <token>
    │  fetch(`${PYTHON_API_BASE_URL}/jobs`)
    ▼
Python REST Backend
```

**Why this pattern?**
- `PYTHON_API_BASE_URL` is never exposed to the browser.
- Token injection and refresh logic are centralized in `lib/apiFetch.ts`.
- The Python backend URL can point to a local instance, a DevTunnel, or a production server — with no frontend changes.

### `lib/apiFetch.ts` — Authenticated Fetch Wrapper

All client-side code should use `apiFetch` instead of raw `fetch`:

```typescript
import { apiFetch } from '@/lib/apiFetch'

const data = await apiFetch('/api/jobs')
```

`apiFetch` automatically:
1. Reads `access_token` from `localStorage` and adds `Authorization: Bearer <token>`.
2. Adds `X-User-Id: <user_id>` header.
3. On **401 response** → attempts to refresh the token via `POST /api/auth/refresh`.
4. Retries the original request once with the new token.
5. On refresh failure → calls `logout()` and redirects to `/login`.

---

## All API Endpoints

The base URL for the Python backend is configured via `PYTHON_API_BASE_URL`.

### Authentication

| Method | Next.js Route | Python Endpoint | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `/auth/login` | Login with `{ Email_Address, Password }` |
| POST | `/api/auth/refresh` | `/auth/refresh` | Refresh access token |
| GET | `/api/auth/can` | — | Server-side permission check |

### Jobs

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/jobs` | List all jobs (supports filters) |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/[id]` | Get job by ID |
| PUT | `/api/jobs/[id]` | Update job |
| DELETE | `/api/jobs/[id]` | Delete job |
| GET | `/api/jobs/by-client/[clientId]` | Jobs filtered by client |
| GET | `/api/jobs/by-member-role` | Jobs filtered by authenticated user's role |
| POST | `/api/jobs/export` | Export jobs to Excel |
| GET | `/api/jobs/oldest` | Get oldest unresolved job |

### Clients

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/[id]` | Get client by ID |
| PUT | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Delete client |
| GET | `/api/clients/table` | Paginated clients for table view |
| GET | `/api/clients/[id]/metrics` | Performance metrics for a client |

### Members

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/members` | List all members |
| POST | `/api/members` | Create member |
| GET | `/api/members/[id]` | Get member by ID |
| PUT | `/api/members/[id]` | Update member |
| GET | `/api/members/table` | Paginated members for table view |
| GET/PUT/DELETE | `/api/members/[id]/permissions/[permId]` | Member permission management |
| GET/PUT | `/api/members/[id]/role/[roleId]` | Member role assignment |

### Technicians

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/technician` | List all technicians |
| POST | `/api/technician` | Create technician |
| GET | `/api/technician/[id]` | Get technician by ID |
| PUT | `/api/technician/[id]` | Update technician |
| GET/PUT/DELETE | `/api/technician/[id]/permissions/[perm_id]` | Technician permission management |

### Subcontractors

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/subcontractors` | List all subcontractors |
| POST | `/api/subcontractors` | Create subcontractor |
| GET | `/api/subcontractors/[id]` | Get subcontractor by ID |
| PUT | `/api/subcontractors/[id]` | Update subcontractor |
| GET | `/api/subcontractors/subcontractors_table` | Paginated table view |

### Metrics (Dashboard)

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/metrics/jobs/status` | Job count by status |
| GET | `/api/metrics/jobs/summary` | High-level job summary |
| GET | `/api/metrics/jobs/member-pipeline` | Member sales pipeline data |
| GET | `/api/metrics/clients` | Client performance metrics |
| GET | `/api/metrics/members/[id]` | Metrics for a specific member |
| GET | `/api/metrics/members/acc-rep-selling` | Account rep selling metrics |
| GET | `/api/metrics/subcontractors` | Subcontractor summary metrics |
| GET | `/api/metrics/subcontractors/[id]` | Metrics for a specific subcontractor |
| GET | `/api/metrics/subcontractors/by-trade` | Subcontractors grouped by trade/skill |
| GET | `/api/metrics/timeline/summary` | Timeline activity summary |
| GET | `/api/metrics/timeline/reports/pdf` | Generate timeline PDF report |
| GET | `/api/metrics/parent-mgmt-co` | Parent management company metrics |

### Tasks

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET/PUT/DELETE | `/api/tasks/[id]` | Task by ID |
| GET | `/api/tasks/job/[job_id]` | Tasks for a specific job |
| GET | `/api/tasks/weekly` | Weekly task view |

### Estimates & Change Orders

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/estimate` | List estimates |
| POST | `/api/estimate` | Create estimate |
| GET/PUT/DELETE | `/api/estimate/[id]` | Estimate by ID |
| GET | `/api/change-order` | List change orders |
| POST | `/api/change-order` | Create change order |
| GET/PUT/DELETE | `/api/change-order/[id]` | Change order by ID |

### Purchases & Suppliers

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/purchases` | List purchases |
| POST | `/api/purchases` | Create purchase |
| GET/PUT/DELETE | `/api/purchases/[id]` | Purchase by ID |
| GET | `/api/purchases/table` | Paginated table view |
| GET | `/api/purchase-orders` | List purchase orders |
| POST | `/api/purchase-orders` | Create PO |
| GET/PUT/DELETE | `/api/purchase-orders/[id]` | PO by ID |
| GET/POST | `/api/purchase-orders/purchase-order-items` | PO line items |
| POST | `/api/purchase-orders/purchase-supplier/[purchaseId]/[supplierId]` | Link supplier to PO |
| GET | `/api/supplier` | List suppliers |
| POST | `/api/supplier` | Create supplier |
| GET/PUT | `/api/supplier/[id]` | Supplier by ID |

### Commissions

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/commission` | List commissions |
| POST | `/api/commission` | Create commission |
| GET | `/api/commission/excel` | Export commissions to Excel |
| GET | `/api/commission/commission_detail` | Commission detail breakdown |
| GET | `/api/commission/commission_group` | Commission groups |

### Multipliers

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/multipliers` | List multipliers |
| POST | `/api/multipliers` | Create multiplier |
| GET/PUT | `/api/multipliers/[id]` | Multiplier by ID |
| GET | `/api/job-multipliers` | Multipliers assigned to jobs |

### Roles & Permissions

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/roles` | List all roles |
| POST | `/api/roles` | Create role |
| GET/PUT/DELETE | `/api/roles/[id]` | Role by ID |
| GET | `/api/permissions` | List all permissions |
| POST | `/api/permissions` | Create permission |
| GET/PUT/DELETE | `/api/permissions/[id]` | Permission by ID |
| GET | `/api/permissions/roles` | Permissions grouped by role |

### Opportunities & Skills

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/opportunities` | List opportunities |
| POST | `/api/opportunities` | Create opportunity |
| GET/PUT/DELETE | `/api/opportunities/[id]` | Opportunity by ID |
| GET | `/api/opportunities/[id]/applicants` | Applicants for an opportunity |
| GET | `/api/opportunities/[id]/order` | Order linked to an opportunity |
| GET/DELETE | `/api/opportunities/[id]/skills/[skillId]` | Skill requirement for opportunity |
| GET | `/api/skills` | List skills |
| POST | `/api/skills` | Create skill |
| GET/PUT/DELETE | `/api/skills/[id]` | Skill by ID |
| POST | `/api/skills/skills_subcontractors` | Link skill to subcontractor |

### Certificates

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/certificates` | List certificates |
| POST | `/api/certificates` | Create certificate |
| GET/PUT/DELETE | `/api/certificates/[id]` | Certificate by ID |
| GET | `/api/certificates/subcontractor/[subcId]` | Certificates for a subcontractor |

### Communities, Managers & Building Departments

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/parent_mgmt_co` | List parent management companies (communities) |
| POST | `/api/parent_mgmt_co` | Create community |
| GET/PUT/DELETE | `/api/parent_mgmt_co/[id]` | Community by ID |
| GET | `/api/managers` | List managers |
| POST | `/api/managers` | Create manager |
| GET/PUT | `/api/managers/[id]` | Manager by ID |
| GET | `/api/bldg_dept` | List building departments |
| POST | `/api/bldg_dept` | Create building department |
| GET/PUT/DELETE | `/api/bldg_dept/[id]` | Building department by ID |

### Timeline, Chat & Communication

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/timeline/job/[id]` | Timeline events for a job |
| GET | `/api/timeline/client/[id]` | Timeline events for a client |
| GET | `/api/timeline/subcontractor/[id]` | Timeline events for a subcontractor |
| GET | `/api/timeline/parent-mgmt-co/[id]` | Timeline events for a community |
| GET | `/api/chat/job/[jobId]` | Chat messages for a job |

### Financial & Reporting

| Method | Next.js Route | Description |
|---|---|---|
| GET | `/api/financial/summary` | Overall financial summary |
| GET | `/api/financial/reports` | Financial reports list |
| GET | `/api/financial/reports/pdf` | Generate financial PDF report |
| GET | `/api/reports/jobs` | Job-level reports |

### File Management

| Method | Next.js Route | Description |
|---|---|---|
| POST | `/api/upload` | Upload file to Cloudinary (proxied, signed server-side) |
| GET | `/api/attachments/[attachmentId]` | Download/stream attachment from Python backend |

### Associations & Integrations

| Method | Next.js Route | Description |
|---|---|---|
| GET/POST/DELETE | `/api/job-member` | Link/unlink members to jobs |
| GET/POST/DELETE | `/api/job-subcontractor` | Link/unlink subcontractors to jobs |
| GET/POST/DELETE | `/api/client_manager` | Link/unlink managers to clients |
| GET/POST/DELETE | `/api/client_member` | Link/unlink members to clients |
| GET/POST | `/api/order` | Orders |
| GET/PUT/DELETE | `/api/order/[id]` | Order by ID |
| POST | `/api/qbo/sync-full-job/[job_code]` | Sync job to QuickBooks Online |

---

## Authentication & Authorization

### Authentication Flow

```
1. User submits credentials on /login
        ↓
2. POST /api/auth/login  (Next.js route)
        ↓
3. Next.js calls Python: POST /auth/login  { Email_Address, Password }
        ↓
4. Python returns: { access_token, refresh_token, user_type, user_id, ... }
        ↓
5. Tokens + user data saved to localStorage (see keys below)
        ↓
6. Redirect to /dashboard
```

### `localStorage` Keys

| Key | Value | Set by |
|---|---|---|
| `access_token` | JWT bearer token | Login response |
| `refresh_token` | Refresh JWT | Login response |
| `token_type` | `"Bearer"` | Login response |
| `user_id` | User identifier | Login response |
| `user_type` | Role string (e.g., `"member"`) | Login response |
| `user_data` | JSON-stringified user object | Login response |
| `login_time` | Unix timestamp | Client-side at login |
| `user_policies` | JSON array of IAM policy objects | Permission sync |

### Token Refresh

When `apiFetch` receives a `401`:
1. Calls `POST /api/auth/refresh` with `{ refresh_token }`.
2. Stores the new `access_token`.
3. Retries the original request.
4. If refresh also fails → `logout()` → redirect to `/login`.

### Authorization System (Policy-Based)

Authorization follows an **IAM-style policy model**. After login, the user's policies are stored in `localStorage` under `user_policies`:

```json
[
  {
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["job:read", "job:update"],
        "Resource": "*"
      },
      {
        "Effect": "Deny",
        "Action": "job:delete",
        "Resource": "restricted/*"
      }
    ]
  }
]
```

The `usePermissions()` hook evaluates policies client-side:
- **Deny takes precedence** over Allow.
- Supports wildcard matching (`"*"`, `"job:*"`, `"job:r*"`).
- Returns `hasPermission(action, resource?)`.

```typescript
const { hasPermission } = usePermissions()

if (hasPermission('job:delete')) {
  // Show delete button
}
```

### Canonical Permission Actions

Defined in `lib/permissions-modules.ts`:

| Module | Actions |
|---|---|
| Jobs | `job:read`, `job:read_basics`, `job:create`, `job:update`, `job:delete` |
| Members | `member:read`, `member:create`, `member:update`, `member:delete` |
| Subcontractors | `subcontractor:read`, `subcontractor:create`, `subcontractor:update`, `subcontractor:delete` |
| Clients | `client:read`, `client:create`, `client:update`, `client:delete` |
| Communities (PMC) | `parent_mgmt_co:read`, `parent_mgmt_co:create`, `parent_mgmt_co:update`, `parent_mgmt_co:delete` |
| Purchases | `purchase:read`, `purchase:create`, `purchase:update`, `purchase:delete`, `purchase:request_only` |
| Commissions | `commission:read`, `commission:read_own`, `commission:update` |
| Attachments | `attachment:read`, `attachment:create`, `attachment:update`, `attachment:delete`, `attachment:read_members`, `attachment:create_members`, `attachment:update_members`, `attachment:delete_members`, `attachment:read_technicians`, `attachment:create_technicians`, `attachment:update_technicians`, `attachment:delete_technicians` |

---

## Component Architecture

Components follow the [Atomic Design](https://atomicdesign.bradfrost.com/) methodology:

```
components/
├── atoms/          Primitive, stateless presentational elements
├── molecules/      Composed of atoms; may have local UI state (no API calls)
├── organisms/      Feature-level components; may fetch data or accept from parent
├── ui/             shadcn/ui Radix-based primitives (do not modify directly)
└── providers/      React Context providers
```

### atoms/

| Component | Description |
|---|---|
| `LanguageToggle` | Switch between EN/ES locales |
| `Logo` | GQM logo with link to dashboard |
| `StatusBadge` | Color-coded badge for job/task statuses |
| `UserAvatar` | User profile avatar with initials fallback |

### molecules/

| Component | Description |
|---|---|
| `AttachmentCard` | File attachment with name, size, and download action |
| `ChatMessage` | Single chat message with author and timestamp |
| `ClientDistributionChart` | Pie/bar chart of client distribution |
| `DocumentCard` | Document metadata with type icon |
| `JobMultipliersManager` | Display and edit job multiplier values |
| `JobStatusChart` | Bar/pie chart of job status breakdown |
| `MemberCard` | Team member info card with role badge |
| `MetricCard` | KPI card: label, value, optional trend indicator |
| `MonthlyRevenueChart` | Line/bar chart for monthly revenue |
| `MultiplierSelector` | Dropdown to select from available multipliers |
| `RevenueTrendChart` | Revenue over a selected time range |
| `SearchBar` | Debounced text search input |
| `TaskCard` | Task with status, assignee, and completion action |
| `TimelineItem` | Single event in an activity timeline |
| `TopStatusBarChart` | Horizontal bar showing status proportions |
| `UserInfo` | Compact user name + role display |

### organisms/

Feature-level components located in `components/organisms/`. Selected key components:

| Component | Description |
|---|---|
| `Sidebar` | Main navigation sidebar with role-filtered links |
| `TopBar` | Header bar: breadcrumb, user menu, language toggle |
| `JobsTable` | Sortable, filterable data table for jobs |
| `JobFilters` / `AdvancedJobFilters` | Filter controls for the jobs list |
| `ExportJobsDialog` | Dialog to configure and trigger Excel export |
| `ArchiveJobDialog` / `DeleteJobDialog` | Confirmation dialogs for destructive job actions |
| `ClientsTable` / `ClientCard` | Client list and card displays |
| `BDFManager` / `BuildingDeptTable` | Building department form and list |
| `ChatRoom` | Full chat interface for a job thread |
| `ChangeOrdersSection` | Change order list with create/edit/delete |
| `CostBreakdownTable` | Estimate cost breakdown table |
| `CreateTaskDialog` | Form dialog to create a task |
| `AddMemberDialog` | Dialog to add a member to a job/client |
| `JobsPanel` / `ClientsPanel` | Dashboard metric panels |
| `LeadTechnicianDashboard` | Role-specific dashboard for lead technicians |

### ui/

shadcn/ui components built on Radix UI primitives. Used as-is or wrapped by atoms/molecules. Never modify these directly — extend them through wrapper components.

Includes: `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `scroll-area`, `select`, `separator`, `sheet`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

### providers/

| Provider | File | Description |
|---|---|---|
| `LocaleProvider` | `providers/LocaleProvider.tsx` | Wraps `next-intl` IntlProvider with user locale preference |
| `SidebarContext` | `providers/SidebarContext.tsx` | Context for sidebar open/collapsed state |
| `ThemeProvider` | `providers/theme-provider.tsx` | Dark/light theme via `next-themes` |

---

## State Management

The project uses **no global state library** (no Redux, Zustand, etc.). State is handled at the lowest level that needs it:

### Layers

| Layer | Mechanism | Where Used |
|---|---|---|
| Browser persistence | `localStorage` | Auth tokens, user data, policies |
| Global UI state | React Context | Sidebar toggle, locale, theme |
| Page-level state | `useState` / `useReducer` | Filters, pagination, form data |
| Shared logic | Custom hooks | `usePermissions`, `useJobFilters`, `use-toast` |
| API communication | Service modules | `lib/services/*.ts` |
| Response transformation | Mapper modules | `lib/mappers/*.ts` |

### Data Flow

```
localStorage (tokens, policies)
    ↓
lib/apiFetch.ts (injects auth headers, handles refresh)
    ↓
app/api/* (Next.js proxy routes)
    ↓
Python Backend
    ↓
lib/services/*.ts (business-logic wrappers)
    ↓
lib/mappers/*.ts (normalize API response to TypeScript types)
    ↓
Page component (useState → pass as props)
    ↓
Organism → Molecule → Atom
```

---

## Internationalization (i18n)

The app supports **English** and **Spanish** via [next-intl](https://next-intl-docs.vercel.app/).

| File | Purpose |
|---|---|
| `i18n/request.ts` | Server-side locale resolution |
| `messages/en.json` | English translation strings |
| `messages/es.json` | Spanish translation strings |
| `components/atoms/LanguageToggle.tsx` | UI toggle for switching locale |

The locale is applied at the root in `app/layout.tsx` through `LocaleProvider`.

---

## Key Modules

### Jobs Module

**Pages:** `/jobs`, `/jobs/create`, `/jobs/[id]`
**API routes:** `app/api/jobs/`
**Service:** `lib/services/jobs-service.ts`
**Organisms:** `JobsTable`, `AdvancedJobFilters`, `ExportJobsDialog`, `ArchiveJobDialog`, `DeleteJobDialog`, and all 11 `job-detail/tabs/` components.

The job is the central entity of the application. Jobs have 14+ possible statuses (from `"Assigned/P. Quote"` to `"Archived"`), three types (`QID`, `PTL`, `PAR`), and can be associated with clients, members, subcontractors, tasks, estimates, change orders, purchases, and chat messages.

### Clients Module

**Pages:** `/clients`, `/clients/create`, `/clients/[id]`
**API routes:** `app/api/clients/`
**Service:** `lib/services/clients-service.ts`
**Organisms:** `ClientsTable`, `ClientCard`, `ClientFilters`, `ClientSelect`, `CommunityDetailsCard`, `DeleteClientDialog`

Clients are linked to communities (parent management companies), managers, and members. Client detail shows metrics and a timeline of activity.

### Members & Permissions Module

**Pages:** `/members`, `/members/create`, `/members/[id]`, `/roles-permissions/*`
**API routes:** `app/api/members/`, `app/api/roles/`, `app/api/permissions/`

Members have roles and individual policy-based permissions. Roles aggregate permissions. The permission system supports 18 resource modules with granular action-level control (read/read_basics/create/update/delete).

### Subcontractors & Technicians Module

**Pages:** `/subcontractors/*`, `/technicians/*`
**API routes:** `app/api/subcontractors/`, `app/api/technician/`

Subcontractors are external vendors with associated skills, certificates, and technicians. Technicians are field staff belonging to subcontractors and can be assigned to specific jobs.

### Financial Module (Purchases, Commissions)

**Pages:** `/purchases/*`, `/suppliers/*`, `/commissions/*`
**API routes:** `app/api/purchases/`, `app/api/purchase-orders/`, `app/api/commission/`

Tracks all outgoing spend (purchase orders + purchases) and inbound sales commissions. Supports Excel export for both. Suppliers are the vendor registry for purchase orders.

### Dashboard Module

**Page:** `/dashboard`
**API routes:** `app/api/metrics/*`
**Components:** `JobsPanel`, `ClientsPanel`, `LeadTechnicianDashboard`, all chart molecules.

Aggregated KPI view. Renders different content depending on the authenticated user's role (`user_type` from localStorage).

---

## Core Types

All TypeScript interfaces are centralized in `lib/types.ts` (764 lines). Key types:

```typescript
// Job status union — all possible states
type JobStatus =
  | "Assigned/P. Quote"
  | "Waiting for Approval"
  | "Scheduled / Work in Progress"
  | "Cancelled"
  | "Completed P. INV / POs"
  | "Invoiced"
  | "HOLD"
  | "PAID"
  | "Warranty"
  | "Received-Stand By"
  | "Assigned-In progress"
  | "Completed PVI"
  | "Paid"
  | "In Progress"
  | "Completed PVI / POs"
  | "Archived"

type JobType = "QID" | "PTL" | "PAR"

type ClientStatus = "Active" | "Inactive"
type RiskValue = "Low" | "Medium" | "High"
type CommissionType = "Non-Comp" | "Standard" | "Premium"
```

When consuming API responses, use the mapper functions in `lib/mappers/` to normalize field names and types before passing data into components.

---

## Development Workflow

### Import Aliases

TypeScript path alias `@/` maps to the project root:

```typescript
import { apiFetch } from '@/lib/apiFetch'
import { Button } from '@/components/ui/button'
import { JobsTable } from '@/components/organisms/JobsTable'
```

### Adding a New Page

1. Create `app/<route>/page.tsx`.
2. Fetch data inside the component (server component) or via `apiFetch` in a client component.
3. Gate UI elements with `usePermissions()` as needed.
4. Add the route to the `Sidebar` component if it should appear in the navigation.

### Adding a New API Proxy Route

1. Create `app/api/<resource>/route.ts` (or `[id]/route.ts` for ID-based routes).
2. Import `getBackendUrl` from `lib/api-utils.ts` to resolve the Python base URL.
3. Forward the request and return the response. Example:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const url = getBackendUrl(`/my-resource`)
  const token = req.headers.get('Authorization') ?? ''

  const res = await fetch(url, {
    headers: { Authorization: token },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

This adds the component to `components/ui/`.

### Linting

```bash
npm run lint
```

### Versioning

The application displays its current version (from `package.json`) at the bottom of the main Sidebar. To update this version easily, use the standard `npm version` commands. This will automatically bump the number in `package.json` and the UI will reflect it immediately:

- **Patch** (e.g., bug fixes, `v0.1.0` -> `v0.1.1`):
  ```bash
  npm version patch
  ```
- **Minor** (e.g., new features, `v0.1.1` -> `v0.2.0`):
  ```bash
  npm version minor
  ```
- **Major** (e.g., breaking changes, `v0.2.0` -> `v1.0.0`):
  ```bash
  npm version major
  ```

---

## Build & Deployment

### Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Next.js dev server with 4 GB heap (Windows) |
| Build | `npm run build` | Production build (`next build`) |
| Start | `npm start` | Serve the production build |
| Lint | `npm run lint` | ESLint check |

### `next.config.mjs`

```js
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,  // Allows deployment despite type errors
  },
  images: {
    unoptimized: true,        // Disables Next.js image optimization
  },
}

export default withNextIntl(nextConfig)
```

### Production Checklist

- [ ] Set `PYTHON_API_BASE_URL` to the production Python API URL.
- [ ] Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- [ ] Run `npm run build` and confirm no critical errors.
- [ ] Run `npm start` (or deploy to a Node.js-compatible host).
- [ ] Verify the Python backend is reachable from the Next.js server.

> **Note:** `ignoreBuildErrors: true` is set for development flexibility. Before a production release, consider removing it and fixing any reported TypeScript errors.
