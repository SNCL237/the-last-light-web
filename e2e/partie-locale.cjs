const { chromium } = require('playwright');
(async () => {
  const S = process.argv[2]; const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); });
  const base = 'http://localhost:4173/#';
  await p.goto(base + '/'); await p.evaluate(() => { localStorage.clear();
    localStorage.setItem('tll.campaign.latest', JSON.stringify({ id: 'e2e', currentAct: 1, mode: 'guided', updatedAt: new Date().toISOString() }));
    localStorage.setItem('tll.profile.e2e', JSON.stringify({ primary_objective: 'ice', secondary_objectives: ['mapping'], elias_instrument: 'keep' })); });
  const shot = async (n) => { await p.waitForTimeout(3500); await p.screenshot({ path: `${S}/e2e-${n}.png` }); console.log('shot', n, await p.evaluate(() => location.hash)); };
  // garde
  await p.goto(base + '/campagne/acte-5/alerte'); await p.waitForTimeout(800); console.log('guard ->', await p.evaluate(() => location.hash));
  await p.goto(base + '/campagne/acte-2/atelier'); await p.waitForSelector('.rail2'); if (await p.getByLabel('Ne plus afficher ces aides').count()) { await p.getByLabel('Ne plus afficher ces aides').check(); await p.getByRole('button', { name: 'Compris' }).click(); }
  await p.getByRole('button', { name: /Preset recommandé/ }).click(); await p.waitForTimeout(300);
  if (await p.getByRole('button', { name: 'Classer dans les archives' }).count()) { await shot('01-archive'); await p.getByRole('button', { name: 'Classer dans les archives' }).click(); }
  await p.getByRole('button', { name: /Énergie/ }).first().click(); await p.getByRole('button', { name: /Fiche : Batterie Li-ion 1 200/ }).click();
  await p.getByRole('button', { name: /Fiche : Panneaux GaAs 700/ }).click();
  await shot('02-atelier');
  await p.locator('#prevalidate').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'prevalidation', { timeout: 20000 });
  for (const c of await p.getByLabel(/J'accepte ce risque/).all()) await c.check();
  await shot('03-prevalidation');
  await p.locator('#validate').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'acte-3/revue', { timeout: 20000 });
  await shot('04-revue');
  await p.locator('#launch').click(); await p.getByLabel(/Je comprends/).check(); await shot('05-confirm');
  await p.getByRole('button', { name: 'Lancer la mission' }).click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'lancement', { timeout: 20000 }); await p.waitForTimeout(2500); await shot('06-sequence');
  await p.getByRole('button', { name: /Passer la séquence|Continuer/ }).click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'controle', { timeout: 20000 }); await shot('07-controle');
  for (let i = 0; i < 24; i++) {
    const h = await p.evaluate(() => location.hash); console.log('loop', i, h, await p.locator('.action-why').allTextContents());
    if (h.includes('acte-5')) break;
    if (h.includes('controle')) { await p.locator('#plan').click(); await p.waitForTimeout(300); continue; }
    if (h.includes('planificateur')) { if (i === 1) await shot('08-planificateur'); await p.locator('#exec').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'bilan', { timeout: 20000 }); continue; }
    if (h.includes('bilan')) { if (i >= 5) await shot('09-bilan'); await p.locator('#next').click(); await p.waitForTimeout(400); }
  }
  for (let i = 0; i < 12 && !(await p.evaluate(() => location.hash)).includes('acte-5'); i++) {
    const h = await p.evaluate(() => location.hash);
    if (h.includes('controle')) await p.locator('#plan').click(); else if (h.includes('planificateur')) await p.locator('#exec').click(); else if (h.includes('bilan')) await p.locator('#next').click();
    await p.waitForTimeout(500);
  }
  await p.waitForFunction(r => new RegExp(r).test(location.hash), 'acte-5/alerte', { timeout: 20000 }); await shot('10-alerte');
  await p.locator('#diag').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'diagnostic', { timeout: 20000 }); await shot('11-diagnostic');
  await p.locator('#arb').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'arbitrage', { timeout: 20000 });
  await p.getByLabel('Désactiver le radar').check(); await p.getByLabel('Réduire les transmissions').check(); await shot('12-arbitrage');
  await p.locator('#decide').click(); await p.getByLabel(/Je comprends/).check(); await p.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await p.waitForFunction(r => new RegExp(r).test(location.hash), 'resolution', { timeout: 20000 }); await shot('13-resolution');
  await p.locator('#report').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'rapport', { timeout: 20000 }); await shot('14-rapport');
  await p.locator('#end').click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'acte-6/fin', { timeout: 20000 }); await p.getByRole('button', { name: 'Avancer' }).click(); await shot('15-fin');
  await p.getByRole('button', { name: /Passer|Continuer/ }).click(); await p.waitForFunction(r => new RegExp(r).test(location.hash), 'final', { timeout: 20000 }); await shot('16-final');
  await p.goto(base + '/'); await shot('17-menu'); await p.getByRole('button', { name: 'Continuer' }).click(); await p.waitForTimeout(1500); console.log('continue ->', await p.evaluate(() => location.hash));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
