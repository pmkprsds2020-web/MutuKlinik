import { supabase } from '@/lib/supabase/client';

// Manajemen role pengguna (role dasar 'user'/'admin' + seluruh peran
// tambahan per modul: ikp_roles, kepuasan_roles, risk_roles, budaya_roles,
// custom_indicator_roles, uimu_roles).
// Tidak membuat tabel/skema baru — hanya membaca & memperbarui tabel
// `profiles` yang sudah ada. Keamanan sepenuhnya ditegakkan oleh RLS
// existing di supabase/migration.sql ("profiles_update_own_or_admin"):
// hanya pemilik baris atau user dengan role='admin' yang bisa UPDATE,
// jadi non-admin yang memanggil fungsi di sini akan ditolak oleh Postgres,
// bukan hanya disembunyikan di UI.

export type BaseRole = 'user' | 'admin';
export type IkpRoleValue = 'verifikator' | 'tim_mutu' | 'pimpinan';
export type KepuasanRoleValue = 'admin_mutu' | 'unit';
export type RiskRoleValue = 'manajemen' | 'pj_mutu' | 'risk_owner' | 'staff_unit' | 'direktur';
export type BudayaRoleValue = 'komite_mutu' | 'manajemen' | 'kepala_unit' | 'staff';
export type CustomIndicatorRoleValue = 'komite_mutu' | 'manajemen';
export type UimuRoleValue = 'kepala_unit' | 'komite_mutu' | 'manajemen';

/** Nama kolom text[] di tabel profiles, per modul. */
export const MODULE_ROLE_COLUMN = {
  ikp: 'ikp_roles',
  kepuasan: 'kepuasan_roles',
  risk: 'risk_roles',
  budaya: 'budaya_roles',
  customIndicator: 'custom_indicator_roles',
  uimu: 'uimu_roles',
} as const;

export type ModuleKey = keyof typeof MODULE_ROLE_COLUMN;

export interface ProfileRow {
  id: string;
  email: string | null;
  displayName: string | null;
  unitId: string | null;
  role: BaseRole;
  ikpRoles: IkpRoleValue[];
  kepuasanRoles: KepuasanRoleValue[];
  riskRoles: RiskRoleValue[];
  budayaRoles: BudayaRoleValue[];
  customIndicatorRoles: CustomIndicatorRoleValue[];
  uimuRoles: UimuRoleValue[];
  createdAt: string;
}

function rowToProfile(row: Record<string, any>): ProfileRow {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    unitId: row.unit_id,
    role: (row.role as BaseRole) ?? 'user',
    ikpRoles: (row.ikp_roles as IkpRoleValue[]) ?? [],
    kepuasanRoles: (row.kepuasan_roles as KepuasanRoleValue[]) ?? [],
    riskRoles: (row.risk_roles as RiskRoleValue[]) ?? [],
    budayaRoles: (row.budaya_roles as BudayaRoleValue[]) ?? [],
    customIndicatorRoles: (row.custom_indicator_roles as CustomIndicatorRoleValue[]) ?? [],
    uimuRoles: (row.uimu_roles as UimuRoleValue[]) ?? [],
    createdAt: row.created_at,
  };
}

export async function getAllProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, unit_id, role, ikp_roles, kepuasan_roles, risk_roles, budaya_roles, custom_indicator_roles, uimu_roles, created_at'
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as any[]).map(rowToProfile);
}

export async function updateProfileRole(id: string, role: BaseRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function updateProfileIkpRoles(id: string, ikpRoles: IkpRoleValue[]): Promise<void> {
  const { error } = await supabase.from('profiles').update({ ikp_roles: ikpRoles }).eq('id', id);
  if (error) throw error;
}

/** Updater generik untuk kelima peran modul lainnya (selain ikp_roles, yang
 *  dipertahankan lewat updateProfileIkpRoles di atas supaya
 *  IkpUserManagementPanel yang sudah ada tidak perlu diubah). */
export async function updateProfileModuleRoles(
  id: string,
  moduleKey: ModuleKey,
  roles: string[]
): Promise<void> {
  const column = MODULE_ROLE_COLUMN[moduleKey];
  const { error } = await supabase.from('profiles').update({ [column]: roles }).eq('id', id);
  if (error) throw error;
}

