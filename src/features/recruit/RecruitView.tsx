import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { EMBLEMS, roleInfo, ROLES } from '../../domain/recruit';
import { Emblem } from '../../ui/Emblem';
import { Icon } from '../../ui/Icon';
import { ActionButton } from '../../ui/kit';
import { RecruitViewModel } from './RecruitViewModel';
import { t } from '../../i18n';

const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2);

export function RecruitView({ vm }: { vm: RecruitViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready') return <main className="page"><p className="mono" role="status">{s.error ?? t('Chargement…')}</p></main>;
  const role = roleInfo(s.role ?? undefined); const av = vm.availability(); const issue = vm.nameIssue;
  return <main className="page recruit">
    <header className="page-top"><a href="#/" className="word">{t("THE LAST LIGHT")}<span>{s.editing ? t('Votre recrue') : t('Nouvelle recrue')}</span></a>
      <button className="btn2 btn2--ghost btn2--sm" onClick={vm.cancel}><Icon name="x" size={13} /> {s.editing ? t('Annuler') : 'Menu'}</button></header>
    <div className="page-body">
      <div className="page-head"><h1>{s.editing ? t('Modifier votre recrue') : t('Rejoindre l’équipe')}</h1>
        <p className="muted">{t("Vous êtes la nouvelle recrue de l'équipe de remplacement de LUNAR-01. Maya, Daniel, Noah et Amara seront vos conseillers ; c'est vous qui décidez.")}</p></div>
      <div className="rec-grid">
        <div className="stack2">
          <section className="glass"><header className="glass-h"><h2><span className="rec-n">1</span>{t("Indicatif")}</h2></header>
            <label className="rec-label" htmlFor="rec-name">{t("Comment l'équipe vous appelle-t-elle ?")}</label>
            <input id="rec-name" className="field rec-name" value={s.name} maxLength={32} autoComplete="nickname" placeholder={t("Ex. : Léa Martin, Kestrel, R. Diallo")} onChange={(e) => vm.setName(e.target.value)} aria-invalid={!!issue} aria-describedby="rec-name-hint" />
            <p id="rec-name-hint" className={issue ? 'rec-err' : 'muted'}>{issue ?? t('Nom ou indicatif, 2 à 24 caractères. Il apparaîtra dans les dialogues et le rapport.')}</p></section>
          <section className="glass"><header className="glass-h"><h2><span className="rec-n">2</span>{t("Rôle dans l'équipe")}</h2></header>
            {s.roleLocked && <p className="page-msg page-msg--warn"><Icon name="alert" size={13} /> {t("L'orbiteur est lancé : le rôle ne change plus, il a déjà orienté vos décisions.")}</p>}
            <div className="rec-roles" role="radiogroup" aria-label={t("Rôle")}>{ROLES.map((r) => <label key={r.id} className={`rec-role${s.role === r.id ? ' is-on' : ''}${s.roleLocked && s.role !== r.id ? ' is-off' : ''}`}>
              <input type="radio" name="role" className="sr" checked={s.role === r.id} disabled={s.roleLocked} onChange={() => vm.setRole(r.id)} />
              <span className="rec-role-h"><span className="rail-ic"><Icon name={r.icon} /></span><strong>{t(r.label)}</strong>{s.role === r.id && <span className="tag2"><Icon name="check" size={11} /> {t("Choisi")}</span>}</span>
              <span className="rec-pitch">{t(r.pitch)}</span>
              <ul>{r.duties.map((d) => <li key={d}>{t(d)}</li>)}</ul>
              <span className="rec-meta"><span><small>{t("Ressources détenues")}</small>{r.owns.map((o) => t(o)).join(' · ')}</span><span><small>{t("Conseiller")}</small><i className="avatar-mini" aria-hidden="true">{initials(r.advisor)}</i>{r.advisor}</span></span>
            </label>)}</div>
            <p className="muted">{t("En solo, vous voyez et modifiez tout. Le rôle oriente les conseils reçus à chaque acte et la lecture de votre rapport final ; en équipe, il fixera ce que chacun peut modifier.")}</p></section>
          <section className="glass"><header className="glass-h"><h2><span className="rec-n">3</span>{t("Écusson de mission")}</h2></header>
            <div className="rec-emblems" role="radiogroup" aria-label={t("Écusson")}>{EMBLEMS.map((e) => <label key={e.id} className={`rec-emblem${s.emblem === e.id ? ' is-on' : ''}`}>
              <input type="radio" name="emblem" className="sr" checked={s.emblem === e.id} onChange={() => vm.setEmblem(e.id)} /><Emblem id={e.id} size={58} /><span>{t(e.label)}</span></label>)}</div></section>
        </div>
        <aside className="glass rec-badge" aria-label={t("Aperçu du badge d'équipage")}>
          <p className="mono rec-badge-k">{t("Badge d'équipage · mission de remplacement LUNAR-01")}</p>
          <Emblem id={s.emblem} size={132} label={`${t('Écusson')} ${t(EMBLEMS.find((e) => e.id === s.emblem)?.label ?? '')}`} />
          <p className="rec-badge-name">{s.name.trim() || t('Votre indicatif')}</p>
          <p className="rec-badge-role">{role?.label ?? t('Rôle à choisir')}</p>
          {role && <p className="muted">{t("Conseiller :")} {role.advisor}, {role.advisorRole.toLowerCase()}</p>}
          <div className="rec-badge-a"><ActionButton id="rec-ok" onClick={vm.confirm} disabled={!av.ok} reason={t(av.reason)}>{s.editing ? t('Enregistrer') : t('Rejoindre l’équipe')}</ActionButton></div>
        </aside>
      </div>
    </div>
  </main>;
}
