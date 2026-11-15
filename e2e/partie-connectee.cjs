const { chromium } = require('playwright');
(async () => {
  const S = process.argv[2]; const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; const net = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text().slice(0, 160)); });
  p.on('response', r => { if (r.url().includes(':3000/api') && r.status() >= 400) net.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:3000/api', '')}`); });
  const base = 'http://localhost:4173/#'; const H = () => p.evaluate(() => location.hash);
  const waitH = (re, t = 40000) => p.waitForFunction((r) => new RegExp(r).test(location.hash), re, { timeout: t });
  const shot = async (n) => { await p.waitForTimeout(2500); await p.screenshot({ path: `${S}/s-${n}.png` }); console.log('shot', n, await H()); };
  const idle = () => p.waitForFunction(() => !document.body.innerText.includes('Synchronisation serveur') && !document.body.innerText.includes('Vérification serveur'), null, { timeout: 40000 });
  await p.goto(base + '/'); await p.evaluate(() => localStorage.clear()); await p.goto(base + '/mode'); await p.waitForTimeout(800);
  await p.locator('label.mode').first().click(); await p.getByRole('button', { name: /Confirmer/ }).click();
  await waitH('prologue'); console.log('mode -> ', await H(), 'pointer', await p.evaluate(() => !!localStorage.getItem('tll.server.current')));
  await p.goto(base + '/campagne/acte-1/profil'); await p.getByRole('button', { name: 'Suivant' }).click(); await p.getByRole('button', { name: 'Suivant' }).click();
  const cards = p.locator('.ocard'); await cards.nth(1).getByRole('button', { name: 'Principal' }).click(); await cards.nth(0).getByRole('button', { name: 'Secondaire' }).click();
  await p.getByRole('button', { name: 'Suivant' }).click(); await p.getByLabel(/Écarter l/).check(); await p.getByRole('button', { name: 'Suivant' }).click();
  await p.getByRole('button', { name: 'Confirmer le profil' }).click(); await waitH('acte-2/atelier');
  await p.waitForSelector('.rail2', { timeout: 40000 }); if (await p.getByLabel('Ne plus afficher ces aides').count()) { await p.getByLabel('Ne plus afficher ces aides').check(); await p.getByRole('button', { name: 'Compris' }).click(); } await p.getByRole('button', { name: /Preset recommandé/ }).click(); await p.waitForTimeout(500); await idle();
  if (await p.getByRole('button', { name: 'Classer dans les archives' }).count()) await p.getByRole('button', { name: 'Classer dans les archives' }).click();
  await idle(); await shot('01-atelier');
  await p.locator('#prevalidate').click(); await waitH('prevalidation'); await p.waitForTimeout(1500);
  for (const c of await p.getByLabel(/J'accepte ce risque/).all()) await c.check();
  await shot('02-prevalidation'); console.log('erreurs prevalid:', await p.locator('.iss--err strong').allTextContents(), 'why:', await p.locator('.action-why').allTextContents());
  await p.locator('#validate').click(); await waitH('acte-3/revue'); await p.waitForTimeout(1000); await idle(); await shot('03-revue');
  console.log('revue why:', await p.locator('.action-why').allTextContents(), 'risques:', await p.locator('.iss strong').allTextContents());
  await p.locator('#launch').click(); await p.getByLabel(/Je comprends/).check(); await p.getByRole('button', { name: 'Lancer la mission' }).click();
  await waitH('lancement'); await p.getByRole('button', { name: /Passer la séquence|Continuer/ }).click(); await waitH('acte-4/controle'); await shot('04-controle');
  for (let i = 0; i < 40 && !(await H()).includes('acte-5'); i++) {
    const h = await H(); console.log('loop', i, h, (await p.locator('.action-why').allTextContents()).join(' / ').slice(0, 160));
    if (h.includes('controle')) { await p.locator('#plan').click(); await p.waitForTimeout(400); }
    else if (h.includes('planificateur')) { if (i < 3) { await p.waitForSelector('#exec', { timeout: 20000 }); await shot('05-planif'); } await p.locator('#exec').click(); await p.waitForFunction(() => /bilan|acte-5/.test(location.hash) || document.querySelector('.action-why[role=alert]'), null, { timeout: 40000 }); }
    else if (h.includes('bilan')) { await p.locator('#next').click(); await p.waitForTimeout(400); }
    const al = await p.locator('.action-why[role=alert]').allTextContents(); if (al.length) { console.log('ALERT', al); break; }
  }
  await waitH('acte-5/alerte'); await shot('06-alerte');
  await p.locator('#diag').click(); await waitH('diagnostic'); await p.locator('#arb').click(); await waitH('arbitrage');
  await p.getByLabel('Mode basse consommation').check(); await shot('07-arbitrage');
  await p.locator('#decide').click(); await p.getByLabel(/Je comprends/).check(); await p.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await waitH('resolution', 60000); await shot('08-resolution');
  await p.locator('#report').click(); await waitH('rapport'); await p.waitForSelector('.report, .banner--crit', { timeout: 60000 }); if (await p.locator('.banner--crit').count()) { console.log('RAPPORT ERREUR', await p.locator('.banner--crit').innerText()); } await shot('09-rapport');
  console.log('score:', await p.locator('.big-num').first().innerText());
  await p.locator('#end').click(); await waitH('acte-6/fin'); await p.getByRole('button', { name: /Passer/ }).click(); await waitH('final'); await shot('10-final');
  console.log('NET4xx5xx', JSON.stringify(net)); console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})().catch(async (e) => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
