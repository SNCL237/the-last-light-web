export type AssetStatus = 'a-trouver' | 'a-produire' | 'valide' | 'integre';
export interface AssetEntry {
  id: string; title: string; usage: string[]; kind: string; file: string;
  source: { name: string; url?: string }; credit: string; license: string; status: AssetStatus; notes?: string;
}
/** Seuls ces statuts apparaissent dans la page Crédits. */
export const CREDITED_STATUSES: AssetStatus[] = ['valide', 'integre'];
export const isInternal = (e: AssetEntry): boolean => e.source.name === 'Interne';

/** Contrôle de conformité du manifeste (utilisable en CI) : un visuel crédité doit être traçable. */
export function manifestIssues(entries: AssetEntry[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    if (!CREDITED_STATUSES.includes(e.status)) continue;
    if (!e.credit) out.push(`${e.id} : crédit manquant`);
    if (!e.license || /vérifier/i.test(e.license)) out.push(`${e.id} : licence non confirmée`);
    if (!isInternal(e) && !e.source.url) out.push(`${e.id} : URL de source manquante`);
    if (e.status === 'integre' && !e.file) out.push(`${e.id} : fichier manquant`);
  }
  return out;
}
