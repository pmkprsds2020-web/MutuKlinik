'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, UserCog } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getAllProfiles, updateProfileRole, updateProfileModuleRoles,
  type ProfileRow, type BaseRole, type ModuleKey,
} from '@/lib/userAdmin';
import { IKP_ROLE_LABEL } from '@/types/ikp';
import { KEPUASAN_ROLE_LABEL } from '@/types/kepuasan';
import { RISK_ROLE_LABEL } from '@/types/risk';
import { BUDAYA_ROLE_LABEL } from '@/types/budaya';
import { toastSuccess, toastError } from '@/lib/toast-helpers';

/* uimu & custom-indicator belum punya label map di /types — didefinisikan
 * lokal di sini, sama isinya dengan check constraint di migration SQL. */
const UIMU_ROLE_LABEL: Record<string, string> = {
  kepala_unit: 'Kepala Unit',
  komite_mutu: 'Komite Mutu',
  manajemen: 'Manajemen',
};
const CUSTOM_IND_ROLE_LABEL: Record<string, string> = {
  komite_mutu: 'Komite Mutu',
  manajemen: 'Manajemen',
};

interface ModuleDef {
  key: ModuleKey;
  label: string;
  options: string[];
  labels: Record<string, string>;
  field: (p: ProfileRow) => string[];
}

const MODULES: ModuleDef[] = [
  { key: 'ikp', label: 'IKP', options: ['verifikator', 'tim_mutu', 'pimpinan'], labels: IKP_ROLE_LABEL, field: (p) => p.ikpRoles },
  { key: 'kepuasan', label: 'Survey Kepuasan', options: ['admin_mutu', 'unit'], labels: KEPUASAN_ROLE_LABEL, field: (p) => p.kepuasanRoles },
  { key: 'risk', label: 'Manajemen Risiko', options: ['manajemen', 'pj_mutu', 'risk_owner', 'staff_unit', 'direktur'], labels: RISK_ROLE_LABEL, field: (p) => p.riskRoles },
  { key: 'budaya', label: 'Survey Budaya', options: ['komite_mutu', 'manajemen', 'kepala_unit', 'staff'], labels: BUDAYA_ROLE_LABEL, field: (p) => p.budayaRoles },
  { key: 'uimu', label: 'Usulan Indikator Unit', options: ['kepala_unit', 'komite_mutu', 'manajemen'], labels: UIMU_ROLE_LABEL, field: (p) => p.uimuRoles },
  { key: 'customIndicator', label: 'Master Indikator Custom', options: ['komite_mutu', 'manajemen'], labels: CUSTOM_IND_ROLE_LABEL, field: (p) => p.customIndicatorRoles },
];

export function UserManagementPanel({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    try {
      setProfiles(await getAllProfiles());
    } catch (err) {
      toastError('Gagal memuat daftar pengguna', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const changeRole = async (id: string, role: BaseRole) => {
    if (id === currentUserId && role !== 'admin') {
      toastError('Tidak bisa mencabut role admin dari akun sendiri', { description: 'Minta admin lain untuk melakukan ini.' });
      return;
    }
    setBusyId(id);
    try {
      await updateProfileRole(id, role);
      toastSuccess('Role diperbarui');
      reload();
    } catch (err) {
      toastError('Gagal memperbarui role', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const toggleModuleRole = async (profile: ProfileRow, mod: ModuleDef, role: string) => {
    const current = mod.field(profile);
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setBusyId(profile.id);
    try {
      await updateProfileModuleRoles(profile.id, mod.key, next);
      toastSuccess(`Peran ${mod.label} diperbarui`);
      reload();
    } catch (err) {
      toastError(`Gagal memperbarui peran ${mod.label}`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserCog className="size-4 text-primary" />
        <p className="text-sm font-semibold">Manajemen Pengguna & Role</p>
        <Badge variant="outline" className="text-[10px] ml-auto">Khusus Administrator</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Role <b>admin</b> memberi akses penuh ke seluruh modul. Peran tambahan per modul di bawah
        memberi akses reviewer/pengelola pada modul itu saja tanpa menjadikan pengguna admin penuh
        (least privilege) — dipakai saat role dasar masih <b>user</b>.
      </p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-lg border p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[160px]">
                  <p className="text-sm font-medium">{p.displayName || p.email || p.id}</p>
                  <p className="text-xs text-muted-foreground">{p.email} {p.unitId ? `· ${p.unitId}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={p.role} onValueChange={(v) => changeRole(p.id, v as BaseRole)} disabled={busyId === p.id}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {p.role === 'admin' && <ShieldCheck className="size-4 text-emerald-500" />}
                </div>
              </div>

              {p.role !== 'admin' && (
                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  {MODULES.map((mod) => (
                    <div key={mod.key} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground w-[130px] shrink-0">{mod.label}</span>
                      {mod.options.map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => toggleModuleRole(p, mod, r)}
                          className={`text-[10px] rounded-full border px-2.5 py-1 transition-colors disabled:opacity-40 ${
                            mod.field(p).includes(r)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {mod.labels[r] ?? r}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {p.role === 'admin' && (
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  Admin sudah otomatis punya semua akses reviewer/pengelola di seluruh modul.
                </p>
              )}
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengguna terdaftar.</p>}
        </div>
      )}
    </div>
  );
}
