# Repository Guidelines

## Agent Rules

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.
9. Follow the code patterns of the project.

---

## Project Overview

**GQM Admin Panel** is a Next.js administrative dashboard for a property restoration and maintenance company. It manages jobs, clients, members, subcontractors, purchases, commissions, and documents. The backend is a separate Python API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI primitives | Radix UI (via shadcn/ui) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| File storage | Cloudinary |
| Excel export | xlsx |
| Package manager | pnpm |

---

## Project Structure

```
app/
  api/                  # Next.js API route handlers (proxy to Python backend)
    auth/               # login, logout, refresh, me
    jobs/               # CRUD + filters, export, by-member-role
    attachments/        # File upload/download
    upload/             # Cloudinary upload helper
    job-member/         # Link/unlink members to jobs
    ... (one folder per resource)
  login/                # Public login page
  dashboard/            # Metrics and charts
  jobs/                 # Jobs list + [id] detail page
  clients/              # Clients list
  members/              # Members list
  subcontractors/       # Subcontractors list
  commissions/          # Commissions list
  purchases/            # Purchases list
  roles-permissions/    # Roles and permissions management
  settings/             # App settings
  profile/              # User profile
  communities/          # Communities/PMC management

components/
  atoms/                # Smallest units: Logo, StatusBadge, UserAvatar
  molecules/            # Composite: SearchBar, MetricCard, AttachmentCard, charts
  organisms/            # Feature-level: Sidebar, TopBar, JobsTable, all dialogs
    job-detail/
      tabs/             # One file per job detail tab (Details, Members, Docs, etc.)

lib/
  types.ts              # All shared TypeScript interfaces and union types
  api-config.ts         # API_BASE_URL constant and API_ENDPOINTS map
  apiFetch.ts           # Authenticated fetch wrapper with JWT auto-refresh
  auth-utils.ts         # logout() and isAuthenticated() helpers
  permissions-modules.ts # MODULE_ACTIONS — canonical permission definitions
  services/             # One file per resource (jobs, clients, members, etc.)
  mappers/              # Transform raw API responses to frontend types
  utils/                # Shared utility functions
  utils.ts              # cn() and other general helpers

hooks/                  # Custom React hooks (shared across pages)
styles/                 # Global CSS
public/                 # Static assets
```

---

## Architecture Patterns

### Authentication

- Tokens are stored in `localStorage`: `access_token`, `refresh_token`, `user_id`, `user_data`, `user_type`.
- **Always use `apiFetch`** (from `lib/apiFetch.ts`) instead of raw `fetch` for any call to the backend. It automatically injects `Authorization: Bearer <token>` and `X-User-Id` headers, and handles 401 responses by transparently refreshing the token via `POST /api/auth/refresh`. If the refresh fails, it calls `logout()`.
- `logout()` (from `lib/auth-utils.ts`) clears all localStorage keys and redirects to `/login`.

### API Layer

- All API calls go through Next.js route handlers in `app/api/`. The frontend never calls the Python backend directly.
- The Python backend base URL is configured via `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000`).
- Use the `API_ENDPOINTS` map from `lib/api-config.ts` for endpoint strings.
- Services in `lib/services/` encapsulate the fetch logic for each resource. Prefer adding logic there rather than inline in components.
- Mappers in `lib/mappers/` convert raw API shapes to typed frontend models. Always map before passing data to components.

### Component Design (Atomic Design)

- **atoms**: Pure presentational, no data fetching, minimal props.
- **molecules**: Compose atoms, may have local UI state, no API calls.
- **organisms**: Feature components. May call services or accept data as props. Dialogs, tables, tabs, and sidebars live here.
- **shadcn/ui components** live in `components/ui/`. Do not modify them directly — extend via wrapper components.

### Forms

- All forms use `react-hook-form` with a `zod` schema for validation.
- Resolve schemas with `@hookform/resolvers/zod`.

### Permissions System

- Permissions follow the format `resource:action` (e.g., `job:read`, `attachment:delete_members`).
- The canonical list of all permission IDs is in `lib/permissions-modules.ts` (`MODULE_ACTIONS`).
- Check this file before adding new permission strings anywhere in the codebase.

### Job Detail Page

The job detail page (`app/jobs/[id]/`) is tab-based. Each tab is a separate component under `components/organisms/job-detail/tabs/`:

| Tab | Component |
|---|---|
| Details | `JobDetailsTab.tsx` |
| Members | `JobMembersTab.tsx` |
| Subcontractors | `JobSubcontractorsTab.tsx` |
| Documents | `JobDocumentsTab.tsx` |
| Estimate | `JobEstimateTab.tsx` |
| Pricing | `JobPricingTab.tsx` |
| Purchases | `JobPurchasesTab.tsx` |
| Tasks | `JobTasksTab.tsx` |
| Chat | `JobChatTab.tsx` |
| Technicians | `JobTechniciansTab.tsx` |
| Commissions | `JobCommissionsTab.tsx` |

### State Management

No global state library is used. State is managed via:
- React `useState` / `useReducer` per component
- Custom hooks in `app/jobs/[id]/` (`useJobDetail.ts`, `useJobChat.ts`) and in `hooks/`
- Props drilling for parent-to-child data flow

---

## Key Types (`lib/types.ts`)

- `JobStatus` — union of all possible job status strings (e.g., `"Invoiced"`, `"PAID"`, `"Archived"`)
- `JobType` — `"QID" | "PTL" | "PAR"`
- `CommissionType` — `"Non-Comp" | "Standard" | "Premium"`
- `MemberDetails`, `GQMMember` — team member shapes
- All interfaces follow PascalCase. Backend field names use `PascalCase` (e.g., `ID_Jobs`, `Member_Name`). Frontend display models use camelCase.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Python backend API |

---

## Development

```bash
pnpm install
pnpm dev        # starts at http://localhost:3000
pnpm build
pnpm lint
```
