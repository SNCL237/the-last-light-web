import { RepositoryError } from '../../domain/ports';

/** Erreur normalisée du backend : `{ code, params, statut }` (aucun texte joueur côté serveur). */
export class ApiError extends RepositoryError {
  constructor(readonly code: string, readonly params: Record<string, unknown>, readonly statut: number) {
    super(messageFor(code, params));
  }
}

const n = (v: unknown, d = 0) => (typeof v === 'number' ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : String(v ?? '?'));
/** Textes joueur des codes C7 (le registre serveur /pedagogie reste générique). */
const MESSAGES: Record<string, (p: Record<string, unknown>) => string> = {
  OBJECTIF_PRINCIPAL_REQUIS: () => 'Choisissez un objectif principal.',
  OBJECTIFS_SECONDAIRES_ABSENTS: () => 'Aucun objectif secondaire : choix possible, mais la mission sera moins riche.',
  OBJECTIFS_TROP_NOMBREUX: () => 'Trop d’objectifs pour ce niveau.',
  NIVEAU_OBJECTIFS_INVALIDE: (p) => `Ce niveau autorise ${n(p.maximum)} objectif(s) secondaire(s).`,
  OBJECTIFS_INSTRUMENT_REQUIS: () => 'Un objectif n’a aucun instrument capable de le mesurer.',
  OBJECTIF_INSTRUMENT_INVALIDE: () => 'Cet instrument ne sert pas l’objectif indiqué.',
  OPTION_INDISPONIBLE: () => 'Option indisponible à ce niveau ou incompatible.',
  LANCEUR_REQUIS: () => 'Choisissez un lanceur.',
  ORBITE_REQUISE: () => 'Choisissez une orbite.',
  ORBITE_INACCESSIBLE: () => 'Ce lanceur ne dessert pas cette orbite.',
  MASSE_DEPASSE: (p) => `Masse au-delà de la capacité du lanceur${p.ecartKg !== undefined ? ` (écart ${n(p.ecartKg, 1)} kg)` : ''}.`,
  MARGE_FAIBLE: () => 'Marge de masse faible.',
  PUISSANCE_ALERTE: (p) => `Puissance à ${n(p.pourcentage)} % de la production moyenne d’orbite (ombre comprise).`,
  PUISSANCE_DEPASSEE: (p) => `Consommation (${n(p.consommeeW, 1)} W) supérieure à la production moyenne d’orbite (${n(p.produiteMoyenneW ?? p.produiteW, 1)} W).`,
  BATTERIE_INSUFFISANTE: () => 'Batterie trop petite pour traverser l’ombre lunaire.',
  BUDGET_ALERTE: (p) => `Budget utilisé à ${n(p.pourcentage)} %.`,
  BUDGET_DEPASSE: (p) => `Budget dépassé${p.coutMUSD !== undefined ? ` : ${n(p.coutMUSD)} M$ pour ${n(p.budgetMUSD)} M$` : ''}.`,
  BUDGET_MARGE_FAIBLE: () => 'Marge budgétaire faible.',
  DV_INSUFFISANT: () => 'Δv insuffisant pour l’insertion et le maintien d’orbite.',
  PROPULSION_CONFIGURATION_INVALIDE: () => 'Configuration de propulsion invalide.',
  PISTE_REDUIS_MASSE: () => 'Piste : réduire la masse.', PISTE_AUTRE_ORBITE: () => 'Piste : choisir une autre orbite.', PISTE_AUTRE_LANCEUR: () => 'Piste : choisir un autre lanceur.',
  CONFIGURATION_NON_VALIDEE: (p) => `Configuration non validée par le serveur (${n(p.erreurs)} erreur(s)).`,
  DECISION_ATTENDUE: () => 'Une décision de crise est attendue avant de continuer.',
  DECISION_CRISE_ABSENTE: () => 'Aucune crise n’attend de décision.',
  SIMULATION_TERMINEE: () => 'La simulation est terminée.',
  ANOMALIE_ENERGETIQUE: () => 'Anomalie énergétique détectée.',
  SCIENCE_INCOMPLETE: (p) => `Science incomplète (${n(Number(p.progression) * 100)} %).`,
  MARGES_TECHNIQUES_FAIBLES: () => 'Marges techniques faibles pendant la mission.',
  DONNEES_PERDUES: () => 'Des données ont été perdues.',
  FIABILITE_FAIBLE: () => 'Fiabilité de l’orbiteur faible.',
  RISQUE_ACCRU: () => 'La mission a poursuivi avec un risque accru.',
  OBJECTIFS_NON_ATTEINTS: () => 'Certains objectifs ne sont pas atteints.',
  MISSION_ECOURTEE: () => 'La mission a été écourtée.',
  MISSION_PERDUE: () => 'La mission est perdue.',
  RECOMMANDATION_SCIENCE: () => 'Associer chaque objectif à un instrument adapté et observer plus longtemps.',
  RECOMMANDATION_ENERGIE: () => 'Prévoir une marge de production pour l’ombre et les dégradations.',
  RECOMMANDATION_DONNEES: () => 'Équilibrer données produites et capacité de transmission.',
  RECOMMANDATION_FIABILITE: () => 'Choisir des composants plus fiables ou redondants.',
  RECOMMANDATION_BUDGET: () => 'Garder une réserve budgétaire.',
  RECOMMANDATION_OBJECTIFS: () => 'Réduire le nombre d’objectifs ou mieux les équiper.',
  ACTE_INVALIDE: (p) => `Étape non disponible (acte actuel ${n(p.acteActuel)}).`,
  MISSION_INCONNUE: () => 'Mission introuvable sur le serveur.',
  MISSION_DEJA_TERMINEE: () => 'Cette mission est déjà terminée.',
  MISSION_NON_PRETE: () => 'La mission n’est pas encore lancée.',
  MISSION_NON_TERMINEE: () => 'La mission n’est pas terminée.',
  SCENARIO_VERROUILLE: () => 'Scénario verrouillé.',
  VERSION_EPINGLEE_INDISPONIBLE: () => 'Version du catalogue ou du scénario indisponible sur le serveur.',
  CATALOGUE_VERSION_INCONNUE: (p) => `Catalogue ${n(p.version)} absent du serveur (import administrateur requis).`,
  AUTH_REQUISE: () => 'Session expirée.', JETON_INVALIDE: () => 'Session invalide.', ROLE_INTERDIT: () => 'Accès refusé.',
  ENTREE_INVALIDE: (p) => `Requête refusée par le serveur (${String(p.champs ?? p.champ ?? 'entrée')}).`,
  ERREUR_INTERNE: () => 'Erreur interne du serveur.',
  RESEAU: () => 'Connexion au serveur impossible.', DELAI: () => 'Le serveur ne répond pas.',
};
export function messageFor(code: string, params: Record<string, unknown> = {}): string {
  return MESSAGES[code]?.(params) ?? `Erreur serveur (${code}).`;
}

const TOKEN_KEY = 'tll.api.token';
/** F-06 : client typé. Jeton invité créé automatiquement (30 jours), renouvelé une fois sur 401. */
export class ApiClient {
  constructor(private baseUrl: string, private fetchFn: typeof fetch = (...a) => fetch(...a), private timeoutMs = 15000) {}
  private get token(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
  private set token(t: string | null) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* */ } }
  async ensureSession(): Promise<void> {
    if (this.token) return;
    const r = await this.raw<{ jeton: string }>('POST', '/identite/invites', { langue: 'fr' }, false);
    this.token = r.jeton;
  }
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.ensureSession();
    try { return await this.raw<T>(method, path, body, true); }
    catch (e) {
      if (e instanceof ApiError && (e.statut === 401 || e.code === 'JETON_INVALIDE')) { this.token = null; await this.ensureSession(); return this.raw<T>(method, path, body, true); }
      throw e;
    }
  }
  private async raw<T>(method: string, path: string, body: unknown, auth: boolean): Promise<T> {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, { method, signal: ctrl.signal,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) { throw new ApiError((e as Error)?.name === 'AbortError' ? 'DELAI' : 'RESEAU', {}, 0); }
    finally { clearTimeout(timer); }
    const text = await res.text(); let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) { const d = (data ?? {}) as { code?: string; params?: Record<string, unknown> }; throw new ApiError(d.code ?? `HTTP_${res.status}`, d.params ?? {}, res.status); }
    return data as T;
  }
}
