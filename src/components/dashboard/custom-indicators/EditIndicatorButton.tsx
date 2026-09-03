'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Pencil, Save, X, Trash2 } from 'lucide-react';
import { DEFAULT_CATEGORIES, type CustomIndicator } from '@/types/customIndicators';
import { updateCustomIndicatorIdentity, getCustomIndicatorCategories, createCustomIndicatorCategory, deleteCustomIndicator } from '@/lib/customIndicatorData';
import { toastSuccess, toastError } from '@/lib/toast-helpers';

/** Field identitas indikator yang aman diedit langsung (tidak memengaruhi
 *  data pengukuran historis). Target/formula/numerator-denominator TETAP
 *  hanya lewat "Buat Versi Baru" — itu sengaja versioned supaya histori
 *  capaian lama tidak berubah retroaktif. */
export function EditIndicatorButton({
  indicator, userId, onDone,
}: {
  indicator: CustomIndicator; userId: string; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(indicator.name);
  const [code, setCode] = useState(indicator.code);
  const [description, setDescription] = useState(indicator.description ?? '');
  const [purpose, setPurpose] = useState(indicator.purpose ?? '');
  const [category, setCategory] = useState(indicator.category);
  const [customCategory, setCustomCategory] = useState('');
  const [picName, setPicName] = useState(indicator.picName ?? '');
  const [reviewerName, setReviewerName] = useState(indicator.reviewerName ?? '');
  const [approverName, setApproverName] = useState(indicator.approverName ?? '');
  const [isPermanent, setIsPermanent] = useState(indicator.isPermanent);
  const [startDate, setStartDate] = useState(indicator.startDate ?? '');
  const [endDate, setEndDate] = useState(indicator.endDate ?? '');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES as unknown as string[]);

  const openEdit = async () => {
    setOpen(true);
    try {
      const cats = await getCustomIndicatorCategories();
      const names = cats.map((c) => c.name);
      if (names.length > 0) setCategories(Array.from(new Set([...(DEFAULT_CATEGORIES as unknown as string[]), ...names])));
    } catch { /* pakai DEFAULT_CATEGORIES saja bila gagal memuat */ }
  };

  const save = async () => {
    if (!name.trim()) { toastError('Nama indikator wajib diisi'); return; }
    setSaving(true);
    try {
      let finalCategory = category;
      if (category === '__custom__') {
        finalCategory = customCategory.trim();
        if (!finalCategory) { toastError('Nama kategori baru wajib diisi'); setSaving(false); return; }
        try { await createCustomIndicatorCategory(finalCategory, userId); } catch { /* mungkin sudah ada, abaikan */ }
      }
      await updateCustomIndicatorIdentity(indicator.id, {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        purpose: purpose.trim() || null,
        category: finalCategory,
        picName: picName.trim() || null,
        reviewerName: reviewerName.trim() || null,
        approverName: approverName.trim() || null,
        isPermanent,
        startDate: isPermanent ? null : (startDate || null),
        endDate: isPermanent ? null : (endDate || null),
      }, userId);
      toastSuccess('Identitas indikator diperbarui');
      setOpen(false);
      onDone();
    } catch (err) {
      toastError('Gagal memperbarui indikator', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
        <Pencil className="size-3.5" /> Edit
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Edit Identitas Indikator</p>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Ini mengubah data indikator saat ini juga (bukan versi baru). Untuk mengubah target/formula/definisi
        numerator-denominator, gunakan &quot;Buat Versi Baru&quot; supaya histori capaian lama tidak berubah.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nama Indikator <span className="text-rose-500">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Kode Indikator</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="__custom__">+ Kategori baru…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {category === '__custom__' && (
          <div className="space-y-1.5">
            <Label>Nama Kategori Baru</Label>
            <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Deskripsi</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Tujuan</Label>
          <Textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>PIC</Label>
          <Input value={picName} onChange={(e) => setPicName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Reviewer</Label>
          <Input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Approver</Label>
          <Input value={approverName} onChange={(e) => setApproverName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between gap-2 sm:col-span-2 border rounded-lg p-3">
          <div>
            <p className="text-sm font-medium">Indikator permanen</p>
            <p className="text-xs text-muted-foreground">Bila dimatikan, tentukan tanggal mulai/selesai.</p>
          </div>
          <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
        </div>
        {!isPermanent && (
          <>
            <div className="space-y-1.5"><Label>Tanggal Mulai</Label><Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Tanggal Selesai</Label><Input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} /></div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
        <Button size="sm" disabled={saving} onClick={save} className="gap-1.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-3.5" />} Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}

/** Hapus permanen. Database menolak (lewat FK on-delete-restrict di
 *  custom_indicator_measurements) bila indikator ini sudah punya data
 *  pengukuran — jadi risiko kehilangan histori tanpa sengaja tetap dijaga
 *  di level database, bukan cuma di UI. */
export function DeleteIndicatorButton({
  indicator, userId, onDeleted,
}: {
  indicator: CustomIndicator; userId: string; onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Hapus
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-destructive/40 p-4 space-y-2 bg-card">
      <p className="text-sm font-medium">Hapus indikator &quot;{indicator.name}&quot; secara permanen?</p>
      <p className="text-xs text-muted-foreground">
        Tindakan ini tidak bisa dibatalkan. Kalau indikator ini sudah pernah diisi data pengukuran,
        penghapusan akan ditolak sistem — pakai &quot;Nonaktifkan&quot; sebagai gantinya untuk kasus itu.
        Hapus permanen cocok untuk indikator draft/salah buat yang belum ada datanya.
      </p>
      <p className="text-xs">Ketik <span className="font-mono font-semibold">{indicator.code}</span> untuk konfirmasi:</p>
      <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={indicator.code} className="h-9" />
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => { setOpen(false); setConfirmText(''); }}>Batal</Button>
        <Button
          size="sm" variant="destructive" disabled={confirmText !== indicator.code || deleting}
          onClick={async () => {
            setDeleting(true);
            try {
              await deleteCustomIndicator(indicator.id, indicator.code, userId);
              toastSuccess('Indikator dihapus permanen');
              onDeleted();
            } catch (err) {
              toastError('Gagal menghapus', { description: err instanceof Error ? err.message : undefined });
              setDeleting(false);
            }
          }}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-3.5" />} Hapus Permanen
        </Button>
      </div>
    </div>
  );
}
