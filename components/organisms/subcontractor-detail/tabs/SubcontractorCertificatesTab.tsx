"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Award, Plus, Upload, Trash2, FileText, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, ExternalLink,
  Star, Edit3, X, Save, ArrowRight, Bell, BellOff, User,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { usePermissions } from "@/hooks/usePermissions"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Certificate, CertificateAttachment } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberOption {
  ID_Member: string
  name: string
  email: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CERT_STATUSES = ["Active", "Inactive", "Pending", "Expired"] as const

function daysUntilExpiration(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0]
}

function dayBeforeIso(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}

// ─── UI sub-components ───────────────────────────────────────────────────────

function ExpirationBadge({ dateStr, t }: { dateStr: string | null; t: (k: any) => string }) {
  const days = daysUntilExpiration(dateStr)
  if (days === null) return <span className="text-xs italic text-slate-400">—</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-500">{formatDate(dateStr)}</span>
      {days < 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          <AlertTriangle className="h-2.5 w-2.5" /> {t("certExpired")}
        </span>
      )}
      {days >= 0 && days <= 30 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Clock className="h-2.5 w-2.5" /> {days}d left
        </span>
      )}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    Active:   "border-emerald-200 bg-emerald-50 text-emerald-700",
    Inactive: "border-slate-200   bg-slate-50   text-slate-600",
    Expired:  "border-red-200     bg-red-50     text-red-700",
    Pending:  "border-amber-200   bg-amber-50   text-amber-700",
  }
  const cls = map[status ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-600"
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cls)}>
      {status ?? "—"}
    </span>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

interface CertFormData {
  Name: string
  Status: string
  Expiration_date: string
  Notes: string
}
const EMPTY_FORM: CertFormData = { Name: "", Status: "Active", Expiration_date: "", Notes: "" }

function EditCertDialog({
  open, onClose, onSubmit, initial, submitting, t,
}: {
  open: boolean; onClose: () => void; onSubmit: (d: CertFormData) => void
  initial: Partial<CertFormData>; submitting: boolean; t: (k: any) => string
}) {
  const [form, setForm] = useState<CertFormData>({ ...EMPTY_FORM, ...initial })
  useEffect(() => { if (open) setForm({ ...EMPTY_FORM, ...initial }) }, [open])
  const set = (k: keyof CertFormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-emerald-600" /> {t("certEditTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certName")} *</Label>
            <Input value={form.Name} onChange={e => set("Name", e.target.value)}
              placeholder={t("certNamePlaceholder")} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certStatus")}</Label>
              <Select value={form.Status} onValueChange={v => set("Status", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certExpiration")}</Label>
              <Input type="date" value={form.Expiration_date} onChange={e => set("Expiration_date", e.target.value)}
                className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certNotes")}</Label>
            <Textarea value={form.Notes} onChange={e => set("Notes", e.target.value)}
              placeholder={t("certNotesPlaceholder")} rows={3} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} className="text-sm">{t("cancel")}</Button>
          <Button onClick={() => onSubmit(form)} disabled={submitting || !form.Name.trim()}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-sm">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {submitting ? t("certSaving") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create dialog (2 pasos) ──────────────────────────────────────────────────

function CreateCertDialog({
  open, onClose, onCreated, subcId, t,
}: {
  open: boolean; onClose: () => void; onCreated: (c: Certificate) => void
  subcId: string; t: (k: any) => string
}) {
  const [step, setStep]               = useState<1 | 2>(1)
  const [form, setForm]               = useState<CertFormData>(EMPTY_FORM)
  const [creating, setCreating]       = useState(false)
  const [pendingCert, setPendingCert] = useState<Certificate | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setStep(1); setForm(EMPTY_FORM); setPendingCert(null); setSelectedFile(null) }
  }, [open])

  const setField = (k: keyof CertFormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await apiFetch(`/api/certificates/subcontractor/${encodeURIComponent(subcId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name:            form.Name || null,
          Status:          form.Status || null,
          Expiration_date: form.Expiration_date || null,
          Notes:           form.Notes || null,
        }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const cert: Certificate = await res.json()
      setPendingCert({ ...cert, attachments: [] })
      setStep(2)
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setCreating(false) }
  }

  async function handleUploadAndFinish() {
    if (!selectedFile || !pendingCert) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("entity_id", pendingCert.ID_Certificate)
      formData.append("description", `Document for certificate: ${pendingCert.Name ?? pendingCert.ID_Certificate}`)
      formData.append("tag", "certificate")
      const uploadRes = await apiFetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error(`Upload error ${uploadRes.status}`)
      const uploadData = await uploadRes.json()

      const newAtt: CertificateAttachment = {
        ID_Attachment:    uploadData.attachment?.ID_Attachment,
        Document_name:    uploadData.attachment?.Document_name ?? selectedFile.name,
        Attachment_descr: uploadData.attachment?.Attachment_descr ?? null,
        Link:             uploadData.attachment?.Link ?? uploadData.cloudinary_url ?? null,
        Document_type:    uploadData.attachment?.Document_type ?? null,
        ID_Certificate:   pendingCert.ID_Certificate,
      }

      const patchRes = await apiFetch(`/api/certificates/${pendingCert.ID_Certificate}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Current_doc_id: newAtt.ID_Attachment }),
      })
      if (!patchRes.ok) throw new Error(`Patch error ${patchRes.status}`)

      onCreated({ ...pendingCert, Current_doc_id: newAtt.ID_Attachment, attachments: [newAtt] })
      toast({ title: t("certCreated") })
      onClose()
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setUploading(false) }
  }

  const lockClose = step === 2

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !lockClose) onClose() }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={e => { if (lockClose) e.preventDefault() }}
        onEscapeKeyDown={e => { if (lockClose) e.preventDefault() }}
      >
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" /> {t("addCertificate")}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">{t("certStep1Desc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certName")} *</Label>
                <Input value={form.Name} onChange={e => setField("Name", e.target.value)}
                  placeholder={t("certNamePlaceholder")} className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certStatus")}</Label>
                  <Select value={form.Status} onValueChange={v => setField("Status", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CERT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certExpiration")}</Label>
                  <Input type="date" value={form.Expiration_date} onChange={e => setField("Expiration_date", e.target.value)}
                    className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certNotes")}</Label>
                <Textarea value={form.Notes} onChange={e => setField("Notes", e.target.value)}
                  placeholder={t("certNotesPlaceholder")} rows={3} className="resize-none text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={creating} className="text-sm">{t("cancel")}</Button>
              <Button onClick={handleCreate} disabled={creating || !form.Name.trim()}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-sm">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {creating ? t("certCreating") : t("certNextStep")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && pendingCert && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" /> {t("certUploadFirstDoc")}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">{t("certUploadFirstDocDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <Award className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <p className="truncate text-sm font-medium text-emerald-800">{pendingCert.Name}</p>
                <span className="ml-auto flex-shrink-0 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  {t("certCreatedLabel")}
                </span>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-colors",
                  selectedFile
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/50"
                )}>
                {selectedFile ? (
                  <>
                    <FileText className="h-8 w-8 text-emerald-500" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-700">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(0)} KB · {t("certClickToChange")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                      <Upload className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-600">{t("certClickToUpload")}</p>
                      <p className="text-[11px] text-slate-400">{t("certUploadHint")}</p>
                    </div>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter>
              <Button onClick={handleUploadAndFinish} disabled={!selectedFile || uploading}
                className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-sm">
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("certUploading")}</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> {t("certUploadAndFinish")}</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Set-current dialog ───────────────────────────────────────────────────────

function SetCurrentDialog({
  open, onClose, onConfirm, attName, submitting, t,
}: {
  open: boolean; onClose: () => void; onConfirm: (exp: string) => void
  attName: string; submitting: boolean; t: (k: any) => string
}) {
  const [expDate, setExpDate] = useState("")
  useEffect(() => { if (open) setExpDate("") }, [open])
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> {t("certSelectCurrentTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{t("certSelectCurrentDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 truncate">{attName}</p>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("certNewExpiration")} *</Label>
            <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} className="text-sm">{t("cancel")}</Button>
          <Button onClick={() => onConfirm(expDate)} disabled={submitting || !expDate}
            className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-sm">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
            {submitting ? t("certSaving") : t("certConfirmCurrent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteCertDialog({
  open, onClose, onConfirm, certName, submitting, t,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  certName: string; submitting: boolean; t: (k: any) => string
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> {t("certDeleteTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{t("certDeleteDesc")}</DialogDescription>
        </DialogHeader>
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 truncate">{certName}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} className="text-sm">{t("cancel")}</Button>
          <Button onClick={onConfirm} disabled={submitting} className="gap-1.5 bg-red-600 hover:bg-red-700 text-sm">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {submitting ? t("certDeleting") : t("certDeleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Certificate card ─────────────────────────────────────────────────────────

function CertCard({
  cert, onUpdated, onDeleted, canEdit, t,
}: {
  cert: Certificate; onUpdated: (u: Certificate) => void
  onDeleted: (id: string) => void; canEdit: boolean; t: (k: any) => string
}) {
  const [expanded, setExpanded]     = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null)
  const [setCurrentState, setSetCurrentState] = useState<CertificateAttachment | null>(null)
  const [settingCurrent, setSettingCurrent]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const days           = daysUntilExpiration(cert.Expiration_date)
  const isExpired      = days !== null && days < 0
  const isExpiringSoon = days !== null && days >= 0 && days <= 30
  const attachments    = cert.attachments ?? []

  async function handleEdit(data: CertFormData) {
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/certificates/${cert.ID_Certificate}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: data.Name || null, Status: data.Status || null,
          Expiration_date: data.Expiration_date || null, Notes: data.Notes || null,
        }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await res.json()
      onUpdated({ ...cert, ...updated, attachments: cert.attachments })
      setEditOpen(false)
      toast({ title: t("certUpdated") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setSubmitting(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/certificates/${cert.ID_Certificate}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      onDeleted(cert.ID_Certificate)
      toast({ title: t("certDeleted") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("entity_id", cert.ID_Certificate)
      form.append("description", `Document for certificate: ${cert.Name ?? cert.ID_Certificate}`)
      form.append("tag", "certificate")
      const res = await apiFetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const result = await res.json()
      const newAtt: CertificateAttachment = {
        ID_Attachment:    result.attachment?.ID_Attachment,
        Document_name:    result.attachment?.Document_name ?? file.name,
        Attachment_descr: result.attachment?.Attachment_descr ?? null,
        Link:             result.attachment?.Link ?? result.cloudinary_url ?? null,
        Document_type:    result.attachment?.Document_type ?? null,
        ID_Certificate:   cert.ID_Certificate,
      }
      onUpdated({ ...cert, attachments: [...attachments, newAtt] })
      toast({ title: t("certDocUploaded") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSetCurrent(att: CertificateAttachment, newExpDate: string) {
    setSettingCurrent(true)
    try {
      const res = await apiFetch(`/api/certificates/${cert.ID_Certificate}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Current_doc_id: att.ID_Attachment, Expiration_date: newExpDate }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await res.json()
      onUpdated({ ...cert, ...updated, attachments: cert.attachments })
      setSetCurrentState(null)
      toast({ title: t("certCurrentSet") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setSettingCurrent(false) }
  }

  async function handleDeleteAttachment(attId: string) {
    setDeletingAttId(attId)
    try {
      const res = await apiFetch(`/api/attachments/${attId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updatedAtts    = attachments.filter(a => a.ID_Attachment !== attId)
      const updatedCurrent = cert.Current_doc_id === attId ? null : cert.Current_doc_id
      onUpdated({ ...cert, attachments: updatedAtts, Current_doc_id: updatedCurrent })
      toast({ title: t("certDocDeleted") })
    } catch (e: any) {
      toast({ title: t("toastError"), description: e?.message, variant: "destructive" })
    } finally { setDeletingAttId(null) }
  }

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
        isExpired ? "border-red-200" : isExpiringSoon ? "border-amber-200" : "border-slate-200"
      )}>
        {(isExpired || isExpiringSoon) && (
          <div className={cn(
            "flex items-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium",
            isExpired
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-amber-100 bg-amber-50 text-amber-700"
          )}>
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            {isExpired
              ? t("certExpired")
              : `${t("certExpiringSoon")} — ${days} ${days === 1 ? "day" : "days"} remaining`}
          </div>
        )}

        <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
          {/* Icon */}
          <div className={cn(
            "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
            isExpired ? "bg-red-50" : isExpiringSoon ? "bg-amber-50" : "bg-emerald-50"
          )}>
            <Award className={cn("h-4 w-4",
              isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-emerald-600"
            )} />
          </div>

          {/* Name + badges + actions */}
          <div className="min-w-0 flex-1">
            {/* Name row with action buttons inline */}
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-800 pt-0.5">
                {cert.Name ?? t("unnamed")}
              </p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {canEdit && (
                  <>
                    <button onClick={() => setEditOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => setExpanded(v => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50">
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Badges row — wraps naturally on narrow screens */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={cert.Status} />
              <ExpirationBadge dateStr={cert.Expiration_date} t={t} />
              {attachments.length > 0 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {attachments.length} {attachments.length === 1 ? "doc" : "docs"}
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-5">
            {cert.Notes && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("certNotes")}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{cert.Notes}</p>
              </div>
            )}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("certDocuments")}</p>
                {canEdit && (
                  <>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? t("certUploading") : t("certUploadDoc")}
                    </button>
                    <input ref={fileRef} type="file" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                  </>
                )}
              </div>
              {attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-8">
                  <FileText className="h-6 w-6 text-slate-300" />
                  <p className="text-xs text-slate-400">{t("certNoDocuments")}</p>
                  {canEdit && (
                    <button onClick={() => fileRef.current?.click()}
                      className="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      <Upload className="h-3 w-3" /> {t("certUploadDoc")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map(att => {
                    const isCurrent  = att.ID_Attachment === cert.Current_doc_id
                    const isDeleting = deletingAttId === att.ID_Attachment
                    return (
                      <div key={att.ID_Attachment}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                          isCurrent ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                        )}>
                        <FileText className={cn("h-4 w-4 flex-shrink-0", isCurrent ? "text-emerald-600" : "text-slate-400")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{att.Document_name ?? t("unnamed")}</p>
                          {att.Attachment_descr && <p className="truncate text-[11px] text-slate-400">{att.Attachment_descr}</p>}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Star className="h-2.5 w-2.5" /> {t("certCurrentDoc")}
                            </span>
                          )}
                          {att.Link && (
                            <a href={att.Link} target="_blank" rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {canEdit && !isCurrent && (
                            <button onClick={() => setSetCurrentState(att)} title={t("certSetAsCurrent")}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500">
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => handleDeleteAttachment(att.ID_Attachment)} disabled={isDeleting}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EditCertDialog
        open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit}
        initial={{ Name: cert.Name ?? "", Status: cert.Status ?? "Active", Expiration_date: cert.Expiration_date ?? "", Notes: cert.Notes ?? "" }}
        submitting={submitting} t={t} />
      <DeleteCertDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        certName={cert.Name ?? cert.ID_Certificate} submitting={deleting} t={t} />
      <SetCurrentDialog
        open={!!setCurrentState} onClose={() => setSetCurrentState(null)}
        onConfirm={exp => setCurrentState && handleSetCurrent(setCurrentState, exp)}
        attName={setCurrentState?.Document_name ?? ""} submitting={settingCurrent} t={t} />
    </>
  )
}

// ─── Member notification panel ────────────────────────────────────────────────

function NotificationPanel({
  subcId, notifyMemberId, onMemberChange, members, membersLoading, t,
}: {
  subcId: string
  notifyMemberId: string
  onMemberChange: (id: string) => void
  members: MemberOption[]
  membersLoading: boolean
  t: (k: any) => string
}) {
  const selected = members.find(m => m.ID_Member === notifyMemberId)
  const isActive = !!notifyMemberId

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border px-4 py-4 sm:px-5",
      isActive ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl",
          isActive ? "bg-blue-100" : "bg-slate-100"
        )}>
          {isActive ? <Bell className="h-4 w-4 text-blue-600" /> : <BellOff className="h-4 w-4 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700">{t("certNotifyTitle")}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{t("certNotifyDesc")}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Select
                value={notifyMemberId || "__none__"}
                onValueChange={v => onMemberChange(v === "__none__" ? "" : v)}
                disabled={membersLoading}
              >
                <SelectTrigger className="h-8 w-full border-slate-200 bg-white text-xs">
                  {membersLoading
                    ? <span className="flex items-center gap-1.5 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</span>
                    : <SelectValue placeholder={t("certNotifySelectMember")} />}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="italic text-slate-400">{t("certNotifyNoMember")}</span>
                  </SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.ID_Member} value={m.ID_Member}>
                      <span className="flex items-center gap-1.5">
                        <User className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="font-medium">{m.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {notifyMemberId && (
              <button onClick={() => onMemberChange("")}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isActive && selected && (
            <div className="mt-2 space-y-0.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                {t("certNotifyActive").replace("{name}", selected.name)}
              </p>
              {selected.email && (
                <p className="truncate pl-[18px] text-[11px] text-blue-500">{selected.email}</p>
              )}
            </div>
          )}
          {!isActive && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <BellOff className="h-3 w-3 flex-shrink-0" />
              {t("certNotifyInactive")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function SubcontractorCertificatesTab({
  subcId,
  subcName,
}: {
  subcId: string
  subcName: string
}) {
  const t             = useTranslations("subcontractors")
  const { hasPermission } = usePermissions()
  const canEdit       = hasPermission("subcontractor:update")

  const [certs, setCerts]           = useState<Certificate[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Member notification state
  const MEMBER_KEY  = `cert_notify_member_${subcId}`
  const [notifyMemberId, setNotifyMemberId] = useState<string>("")
  const [members, setMembers]               = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Load saved member from localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(MEMBER_KEY) : null
    if (saved) setNotifyMemberId(saved)
  }, [subcId])

  // Fetch member list once
  useEffect(() => {
    async function loadMembers() {
      setMembersLoading(true)
      try {
        const res = await apiFetch("/api/members?page=1&limit=200")
        if (!res.ok) return
        const data = await res.json()
        const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        setMembers(raw.map(m => ({
          ID_Member: m.ID_Member,
          name:  m.Member_Name || m.Acc_Rep || m.Email_Address || m.ID_Member,
          email: m.Email_Address ?? "",
        })))
      } finally { setMembersLoading(false) }
    }
    loadMembers()
  }, [])

  function handleMemberChange(memberId: string) {
    setNotifyMemberId(memberId)
    if (typeof window !== "undefined") {
      if (memberId) localStorage.setItem(MEMBER_KEY, memberId)
      else          localStorage.removeItem(MEMBER_KEY)
    }
  }

  // Auto-expire: PATCH status to Expired when date has passed
  async function autoExpire(list: Certificate[]): Promise<Certificate[]> {
    const toExpire = list.filter(c =>
      daysUntilExpiration(c.Expiration_date) !== null &&
      daysUntilExpiration(c.Expiration_date)! < 0 &&
      c.Status !== "Expired"
    )
    if (toExpire.length === 0) return list
    await Promise.all(toExpire.map(c =>
      apiFetch(`/api/certificates/${c.ID_Certificate}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Status: "Expired" }),
      }).catch(() => null)
    ))
    return list.map(c =>
      toExpire.some(e => e.ID_Certificate === c.ID_Certificate) ? { ...c, Status: "Expired" } : c
    )
  }

  // Auto-create tasks for certs expiring within 30 days
  const autoCreateTasks = useCallback(async (list: Certificate[], memberId: string) => {
    if (!memberId) return

    const expiring = list.filter(c => {
      const d = daysUntilExpiration(c.Expiration_date)
      return d !== null && d >= 0 && d <= 30
    })
    if (expiring.length === 0) return

    let created = 0
    for (const cert of expiring) {
      const dedupKey = `cert_task_${cert.ID_Certificate}_${cert.Expiration_date}`
      if (typeof window !== "undefined" && localStorage.getItem(dedupKey)) continue

      const today        = todayIso()
      const deliveryDate = cert.Expiration_date ? dayBeforeIso(cert.Expiration_date) : today
      const taskName     = `Update Certificate ${cert.Name ?? cert.ID_Certificate} - Expire in 30 days`
      const taskDesc     = `Certificate "${cert.Name ?? cert.ID_Certificate}" belongs to subcontractor "${subcName}" and will expire on ${formatDate(cert.Expiration_date)}. Please ensure the certificate is renewed before the expiration date.`

      const base = {
        Name:             taskName,
        Task_description: taskDesc,
        Task_status:      "Not started",
        Priority:         "High",
        Designation_date: today,
        Delivery_date:    deliveryDate,
      }

      const subcRes = await apiFetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, ID_Subcontractor: cert.ID_Subcontractor }),
      }).catch(() => null)

      const memberRes = await apiFetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, ID_Member: memberId }),
      }).catch(() => null)

      if (subcRes?.ok && memberRes?.ok) {
        if (typeof window !== "undefined") localStorage.setItem(dedupKey, todayIso())
        created++
      }
    }

    if (created > 0) {
      toast({
        title: t("certTasksCreated"),
        description: t("certTasksCreatedDesc").replace("{n}", String(created)),
      })
    }
  }, [subcName, t])

  async function fetchCerts() {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`/api/certificates/subcontractor/${encodeURIComponent(subcId)}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const raw: Certificate[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      const list = await autoExpire(raw)
      setCerts(list)
      // Read current memberId from localStorage (may differ from state if just mounted)
      const savedMember = typeof window !== "undefined" ? localStorage.getItem(MEMBER_KEY) : null
      await autoCreateTasks(list, savedMember ?? notifyMemberId)
    } catch (e: any) {
      setError(e?.message ?? "Failed to load certificates")
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCerts() }, [subcId])

  // Re-run task creation when member is selected
  useEffect(() => {
    if (notifyMemberId && certs.length > 0) {
      autoCreateTasks(certs, notifyMemberId)
    }
  }, [notifyMemberId])

  function handleCreated(cert: Certificate) { setCerts(prev => [cert, ...prev]) }
  function handleUpdated(updated: Certificate) {
    setCerts(prev => prev.map(c => c.ID_Certificate === updated.ID_Certificate ? updated : c))
  }
  function handleDeleted(id: string) { setCerts(prev => prev.filter(c => c.ID_Certificate !== id)) }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{t("tabCertificates")}</p>
            <p className="text-[11px] text-slate-400">
              {loading ? "Loading…" : `${certs.length} certificate${certs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCerts} disabled={loading} title={t("refresh")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          {canEdit && (
            <Button size="sm" onClick={() => setCreateOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
              <Plus className="h-3.5 w-3.5" /> {t("addCertificate")}
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-3">
          <span className="text-red-500">⚠</span>
          <p className="flex-1 text-xs text-red-700">{error}</p>
          <button onClick={fetchCerts} className="text-[11px] font-semibold text-blue-600">{t("retry")}</button>
        </div>
      )}

      {/* Body */}
      <div className="space-y-4 p-6">

        {/* Notification panel — always visible */}
        <NotificationPanel
          subcId={subcId}
          notifyMemberId={notifyMemberId}
          onMemberChange={handleMemberChange}
          members={members}
          membersLoading={membersLoading}
          t={t}
        />

        {/* Certificate list */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && !error && certs.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Award className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{t("noCertificates")}</p>
            <p className="max-w-xs text-xs text-slate-400">{t("noCertificatesDesc")}</p>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)}
                className="mt-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs">
                <Plus className="h-3.5 w-3.5" /> {t("addCertificate")}
              </Button>
            )}
          </div>
        )}

        {!loading && certs.length > 0 && (
          <div className="space-y-3">
            {certs.map(cert => (
              <CertCard key={cert.ID_Certificate} cert={cert}
                onUpdated={handleUpdated} onDeleted={handleDeleted} canEdit={canEdit} t={t} />
            ))}
          </div>
        )}
      </div>

      <CreateCertDialog
        open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={handleCreated} subcId={subcId} t={t} />
    </div>
  )
}
