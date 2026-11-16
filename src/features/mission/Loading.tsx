import { Icon } from '../../ui/Icon';
import { t } from '../../i18n';
export function Loading({ s, retry }: { s: { status: string; error?: string }; retry: () => void }) {
  return <main className="loading2">{s.status === 'error'
    ? <div className="banner banner--crit" role="alert"><Icon name="alert" /><div><strong>{t(s.error)}</strong></div><button className="btn2 btn2--ghost btn2--sm" onClick={retry}>{t("Réessayer")}</button></div>
    : <p role="status" className="mono">{t("Synchronisation de la mission…")}</p>}</main>;
}
