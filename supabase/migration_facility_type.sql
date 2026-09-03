-- ============================================================================
-- INMrsds → Refocusing ke Klinik — facility_type
-- Migration tambahan, dijalankan PALING TERAKHIR (setelah semua migration_*.sql
-- lain sudah pernah dijalankan). Aman dijalankan berulang (IF NOT EXISTS / DO
-- blocks), dan TIDAK mengubah/menghapus data existing — hanya menambah kolom
-- opsional + default, sesuai instruksi "jangan destructive migration".
--
-- Tujuan: memberi konteks fasilitas (facility_type = 'clinic') pada indikator
-- custom (Master Indikator Mutu) dan usulan indikator unit (UIMU), tanpa
-- mengubah struktur/relasi/status lifecycle yang sudah ada (custom_indicators
-- sudah punya status draft/active/inactive/archived + deactivated_at/
-- deactivation_reason — itu DIPERTAHANKAN apa adanya, bukan diganti).
-- ============================================================================

-- 1. custom_indicators (Master Indikator Mutu) ------------------------------
alter table public.custom_indicators
  add column if not exists facility_type text not null default 'clinic'
  check (facility_type in ('clinic', 'hospital'));

comment on column public.custom_indicators.facility_type is
  'Konteks fasilitas indikator ini dibuat/berlaku. Default ''clinic'' untuk semua baris (baru maupun lama) sejak aplikasi difokuskan ulang ke Klinik. Baris lama TIDAK diubah nilainya secara paksa selain default ini — histori & status aktif/nonaktif tetap seperti sebelumnya.';

-- 2. uimu_proposals (Usulan Indikator Mutu Unit) -----------------------------
alter table public.uimu_proposals
  add column if not exists facility_type text not null default 'clinic'
  check (facility_type in ('clinic', 'hospital'));

comment on column public.uimu_proposals.facility_type is
  'Konteks fasilitas usulan indikator ini. Default ''clinic''.';

-- Catatan: kolom ini BERSIFAT INFORMATIF/FILTER OPSIONAL, bukan constraint
-- yang menyembunyikan data. Tidak ada baris yang di-DELETE atau di-UPDATE
-- status-nya oleh migration ini. Penyaringan tampilan (mis. hanya menampilkan
-- facility_type = 'clinic' di daftar aktif) dilakukan di level query/UI,
-- bukan di level skema, supaya bisa diubah lagi tanpa migration baru.
