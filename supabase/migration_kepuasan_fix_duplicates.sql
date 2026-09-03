-- ============================================================================
-- Fix: kepuasan_period_results — duplikat baris ringkasan gabungan
-- ============================================================================
-- SEBAB: kolom unit_id nullable dipakai sebagai penanda "ringkasan gabungan
-- semua unit" (unit_id IS NULL), dengan constraint unique(survey_id, unit_id)
-- yang DIMAKSUDKAN untuk membuat upsert selalu menimpa baris yang sama.
-- Tapi di Postgres, NULL tidak pernah dianggap "sama" dengan NULL lain pada
-- constraint UNIQUE — jadi tiap kali Dashboard dibuka/di-refresh, upsert
-- (onConflict: survey_id,unit_id) tidak pernah menemukan baris yang sudah
-- ada untuk unit_id NULL, dan malah selalu INSERT baris baru. Setelah
-- beberapa kali buka/refresh, jadi banyak baris duplikat untuk
-- (survey_id, unit_id=NULL) yang sama — lalu getKepuasanPeriodResult()
-- (pakai .maybeSingle()) gagal dengan PGRST116 "Results contain N rows",
-- sehingga Dashboard/Monev Survey Kepuasan menampilkan 0/kosong walau
-- response sudah ada.
--
-- PERBAIKAN: ganti sentinel "ringkasan gabungan" dari NULL menjadi string
-- 'all' (bukan NULL — supaya constraint unique benar-benar men-dedupe),
-- konsisten dengan pola 'all' yang sudah dipakai di UNIT_MAP/unit switcher
-- di seluruh aplikasi. Idempotent & aman dijalankan berulang — tidak
-- menghapus response mentah (kepuasan_responses) sama sekali, hanya
-- membersihkan tabel ringkasan/cache (kepuasan_period_results) yang memang
-- dihitung ulang otomatis setiap Dashboard dibuka.
-- ============================================================================

-- 1. Hapus baris duplikat: untuk tiap (survey_id, unit_id IS NULL), simpan
--    hanya yang paling baru dihitung (computed_at terbesar), buang sisanya.
--    (Duplikat pada unit_id yang sudah terisi non-null semestinya belum
--    pernah terjadi — constraint unique bekerja normal untuk nilai non-null
--    — tapi query ini generik, aman dijalankan untuk semua kasus.)
delete from public.kepuasan_period_results t
where t.id not in (
  select distinct on (survey_id, unit_id) id
  from public.kepuasan_period_results
  order by survey_id, unit_id, computed_at desc
);

-- 2. Ganti sentinel: unit_id NULL -> 'all'.
update public.kepuasan_period_results
set unit_id = 'all'
where unit_id is null;

-- 3. Kunci kolom supaya NULL tidak bisa masuk lagi (mencegah bug ini
--    terulang dari jalur manapun).
alter table public.kepuasan_period_results
  alter column unit_id set default 'all',
  alter column unit_id set not null;

-- 4. Constraint unique(survey_id, unit_id) yang sudah ada di
--    migration_kepuasan.sql sekarang otomatis benar-benar menutup celah
--    duplikat, karena unit_id tidak akan pernah NULL lagi. Tidak perlu
--    diubah/ditambah.
