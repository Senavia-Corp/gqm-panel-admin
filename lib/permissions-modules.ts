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
    ],
  },
  {
    module: "Members",
    actions: [
      { id: "member:read",   label: "Read",   desc: "View the team member list and details." },
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
      { id: "purchase:read",   label: "Read",   desc: "View purchase orders and financial spending." },
      { id: "purchase:create", label: "Create", desc: "Create new purchase records." },
      { id: "purchase:update", label: "Update", desc: "Edit existing purchases." },
      { id: "purchase:delete", label: "Delete", desc: "Remove purchase records." },
    ],
  },
  {
    module: "Commissions",
    actions: [
      { id: "commission:read",   label: "Read",   desc: "View job commissions and breakdown." },
      { id: "commission:update", label: "Update", desc: "Edit commission types or rates." },
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
]
