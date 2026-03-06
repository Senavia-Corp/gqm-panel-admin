# GQM Admin Panel

A comprehensive administrative panel for property restoration and maintenance management.

## Features

- **Authentication**: Login page with demo credentials
- **Dashboard**: View jobs and clients metrics with charts
- **Jobs Management**: Complete CRUD operations for jobs
- **Job Details**: Detailed view with tabs for different sections
- **Responsive Design**: Works on desktop and mobile
- **Atomic Design**: Components organized as atoms, molecules, and organisms

## Demo Credentials

- Email: `admin@gqm.com`
- Password: `demo123`

## Project Structure

```
├── app/
│   ├── login/          # Login page
│   ├── dashboard/      # Main dashboard
│   ├── jobs/           # Jobs list and details
│   │   ├── [id]/       # Job detail page
│   │   └── new/        # Create new job
│   └── ...             # Other sections
├── components/
│   ├── atoms/          # Basic UI components (Logo, StatusBadge, UserAvatar)
│   ├── molecules/      # Composite components (SearchBar, UserInfo, MetricCard)
│   └── organisms/      # Complex components (Sidebar, TopBar, JobsTable)
├── lib/
│   ├── types.ts        # TypeScript type definitions
│   ├── mock-data.ts    # Sample data for development
│   └── api-config.ts   # API configuration and helpers
```

## API Integration Guide

### Configuration

All API endpoints are defined in `lib/api-config.ts`. Update the `API_BASE_URL` environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com
```

### Endpoints Structure

The app expects the following endpoints from your Python API:

#### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

#### Jobs
- `GET /api/jobs` - Get all jobs (supports filtering)
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `PUT /api/jobs/:id/archive` - Archive job

#### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client details

#### GQM Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member details

#### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard metrics
- `GET /api/dashboard/jobs` - Get jobs data for charts
- `GET /api/dashboard/clients` - Get clients data for charts

### Making API Calls

Use the `apiCall` helper function from `lib/api-config.ts`:

```typescript
import { apiCall, API_ENDPOINTS } from '@/lib/api-config';

// Example: Get all jobs
const jobs = await apiCall<Job[]>(API_ENDPOINTS.jobs.list);

// Example: Create new job
const newJob = await apiCall<Job>(
  API_ENDPOINTS.jobs.create,
  {
    method: 'POST',
    body: JSON.stringify(jobData)
  }
);

// Example: Update job
const updated = await apiCall<Job>(
  API_ENDPOINTS.jobs.update(jobId),
  {
    method: 'PUT',
    body: JSON.stringify(updates)
  }
);
```

### Authentication Token

The app stores the auth token in localStorage:
- Token key: `auth_token`
- User data key: `user_data`

All API calls automatically include the token in the Authorization header.

## Data Models

See `lib/types.ts` for complete TypeScript definitions. Key models:

- **Job**: Complete job information including type, status, client, representative
- **Client**: Client details with contact information
- **GQMMember**: Company member/representative details
- **JobStatus**: Union type of possible job statuses
- **JobType**: QID, PTL, or PAR

## Next Steps

1. Replace mock data with real API calls in each page
2. Implement the remaining sections (Subcontractors, Clients, Members, Profile, Settings)
3. Add charts to the dashboard using Recharts
4. Implement the other job detail tabs (Subcontractors, Documents, Chat, Pricing)
5. Add form validation and error handling
6. Implement real-time notifications
7. Add file upload for documents

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
