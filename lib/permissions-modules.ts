/**
 * Canonical list of all modules and their available permission actions.
 * Used in the Create Permission and Edit Permission pages.
 * Format: "{resource}:{action}"
 */
export const MODULE_ACTIONS = [
  {
    module: "Jobs",
    actions: [
      { id: "job:read",        label: "Full Read",   desc: "Access to all job info including financial data." },
      { id: "job:read_basics", label: "Read Basics", desc: "Limited access to public/basic fields only." },
      { id: "job:create",      label: "Create",      desc: "Create new job records." },
      { id: "job:update",      label: "Update",      desc: "Edit existing job information." },
      { id: "job:delete",      label: "Delete",      desc: "Delete job records." },
      { id: "job:force_delete", label: "Force Delete", desc: "Delete a job even when it has linked financial documents." },
    ],
  },
  {
    module: "Members",
    actions: [
      { id: "member:read",        label: "Read",        desc: "View the team member list and details." },
      { id: "member:read_basics", label: "Read Basics", desc: "View only member names and company roles (no email or phone); enough to assign members to jobs and tasks." },
      { id: "member:create", label: "Create", desc: "Register new team members." },
      { id: "member:update", label: "Update", desc: "Edit member profiles." },
      { id: "member:delete", label: "Delete", desc: "Remove members from the system." },
    ],
  },
  {
    module: "Subcontractors",
    actions: [
      { id: "subcontractor:read",   label: "Read",   desc: "View subcontractor lists and details." },
      { id: "subcontractor:create", label: "Create", desc: "Register new subcontractors." },
      { id: "subcontractor:update", label: "Update", desc: "Edit subcontractor profiles." },
      { id: "subcontractor:delete", label: "Delete", desc: "Delete subcontractor records." },
    ],
  },
  {
    module: "Technicians",
    actions: [
      { id: "technician:read",   label: "Read",   desc: "View technician lists and details." },
      { id: "technician:create", label: "Create", desc: "Register new technicians." },
      { id: "technician:update", label: "Update", desc: "Edit technician profiles." },
      { id: "technician:delete", label: "Delete", desc: "Delete technician records." },
    ],
  },
  {
    module: "Clients / Communities",
    actions: [
      { id: "client:read",   label: "Read",   desc: "View clients and communities." },
      { id: "client:create", label: "Create", desc: "Create new client/community records." },
      { id: "client:update", label: "Update", desc: "Update client information." },
      { id: "client:delete", label: "Delete", desc: "Delete clients from the system." },
    ],
  },
  {
    module: "PMC (Parent Companies)",
    actions: [
      { id: "parent_mgmt_co:read",   label: "Read",   desc: "Consult PMCs." },
      { id: "parent_mgmt_co:create", label: "Create", desc: "Create new PMC records." },
      { id: "parent_mgmt_co:update", label: "Update", desc: "Edit PMC information." },
      { id: "parent_mgmt_co:delete", label: "Delete", desc: "Delete PMC records." },
    ],
  },
  {
    module: "Purchases",
    actions: [
      { id: "purchase:read",         label: "Read",         desc: "View purchase orders and financial spending." },
      { id: "purchase:create",       label: "Create",       desc: "Create new purchase records." },
      { id: "purchase:update",       label: "Update",       desc: "Edit existing purchases (all fields and all statuses)." },
      { id: "purchase:delete",       label: "Delete",       desc: "Remove purchase records." },
      { id: "purchase:request_only", label: "Request Only", desc: "Can create and submit purchases, but limited to Pending / In Review statuses only, and cannot fill in actual purchasing data (shop, value, link)." },
    ],
  },
  {
    module: "Commissions",
    actions: [
      { id: "commission:read",     label: "Read",     desc: "View all member commissions and breakdown." },
      { id: "commission:read_own", label: "Read Own", desc: "View only the commissions of the logged-in member. Overrides full read when commission:read is not granted." },
      { id: "commission:update",   label: "Update",   desc: "Edit commission types or rates." },
    ],
  },
  {
    module: "Documents (Attachments)",
    actions: [
      // ── General (any folder) ─────────────────────────────────────────────
      { id: "attachment:read",   label: "Read (all folders)",   desc: "View attachments from any folder (Members & Technicians)." },
      { id: "attachment:create", label: "Upload (all folders)", desc: "Upload files to any folder." },
      { id: "attachment:update", label: "Edit (all folders)",   desc: "Edit file metadata in any folder." },
      { id: "attachment:delete", label: "Delete (all folders)", desc: "Delete files from any folder." },
      // ── Members folder ───────────────────────────────────────────────────
      { id: "attachment:read_members",   label: "Read – Members folder",   desc: "View attachments in the Members folder only." },
      { id: "attachment:create_members", label: "Upload – Members folder", desc: "Upload files to the Members folder only." },
      { id: "attachment:update_members", label: "Edit – Members folder",   desc: "Edit file metadata in the Members folder only." },
      { id: "attachment:delete_members", label: "Delete – Members folder", desc: "Delete files from the Members folder only." },
      // ── Technicians folder ───────────────────────────────────────────────
      { id: "attachment:read_technicians",   label: "Read – Technicians folder",   desc: "View attachments in the Technicians folder only." },
      { id: "attachment:create_technicians", label: "Upload – Technicians folder", desc: "Upload files to the Technicians folder only." },
      { id: "attachment:update_technicians", label: "Edit – Technicians folder",   desc: "Edit file metadata in the Technicians folder only." },
      { id: "attachment:delete_technicians", label: "Delete – Technicians folder", desc: "Delete files from the Technicians folder only." },
    ],
  },
  {
    module: "Tasks",
    actions: [
      { id: "tasks:read",   label: "Read",   desc: "View tasks and task lists." },
      { id: "tasks:create", label: "Create", desc: "Create new tasks." },
      { id: "tasks:update", label: "Update", desc: "Edit and change status of tasks." },
      { id: "tasks:delete", label: "Delete", desc: "Remove tasks from the system." },
    ],
  },
  {
    module: "Certificates",
    actions: [
      { id: "certificate:read",   label: "Read",   desc: "View certificates and documentation." },
      { id: "certificate:create", label: "Create", desc: "Upload and register new certificates." },
      { id: "certificate:update", label: "Update", desc: "Edit certificate details and renewals." },
      { id: "certificate:delete", label: "Delete", desc: "Remove certificates from the system." },
    ],
  },
  {
    module: "Multipliers",
    actions: [
      { id: "multiplier:read",   label: "Read",   desc: "View pricing multipliers." },
      { id: "multiplier:create", label: "Create", desc: "Create pricing multipliers and add them to jobs." },
      { id: "multiplier:update", label: "Update", desc: "Edit pricing multipliers." },
      { id: "multiplier:delete", label: "Delete", desc: "Remove pricing multipliers from jobs and from the system." },
    ],
  },
  {
    module: "Building Departments",
    actions: [
      { id: "bldg_dept:read",   label: "Read",   desc: "View building departments." },
      { id: "bldg_dept:create", label: "Create", desc: "Register new building departments." },
      { id: "bldg_dept:update", label: "Update", desc: "Edit building department information." },
      { id: "bldg_dept:delete", label: "Delete", desc: "Delete building department records." },
    ],
  },
]
