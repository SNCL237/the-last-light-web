import { describe, expect, it, vi } from 'vitest';
import { StaticProfileCatalogRepository } from '../../data/StaticProfileCatalogRepository';
import { RepositoryError } from '../../domain/ports';
import { estimateOf, nextAvailability, ProfileViewModel } from './ProfileViewModel';

function setup(save = vi.fn().mockResolvedValue(undefined)) {
  const nav = { go: vi.fn() };
  const events = { record: vi.fn().mockResolvedValue(undefined) };
  const campaigns = { getLatest: vi.fn().mockResolvedValue({ id: 'c1', currentAct: 1, mode: 'guided', updatedAt: new Date() }), create: vi.fn() };
  const vm = new ProfileViewModel(new StaticProfileCatalogRepository(), { save, load: vi.fn().mockResolvedValue(null) }, campaigns, events, nav, () => new Date('2026-11-15T10:00:00Z'));
  return { vm, nav, events, save };
}
const toSelection = (vm: ProfileViewModel) => { vm.next(); vm.next(); };

describe('ProfileViewModel', () => {
  it('TC-004 : objectif principal obligatoire', async () => {
    const { vm } = setup(); await vm.init(); toSelection(vm);
    expect(vm.getState().step).toBe('selection');
    expect(nextAvailability(vm.getState()).reason).toMatch(/objectif principal/);
    vm.next(); expect(vm.getState().step).toBe('selection');
  });
  it('exige 1–2 secondaires ou un refus explicite, plafonne à 2', async () => {
    const { vm } = setup(); await vm.init(); toSelection(vm);
    vm.setPrimary('ice'); expect(nextAvailability(vm.getState()).enabled).toBe(false);
    vm.toggleSecondary('ice'); expect(vm.getState().secondaries).toEqual([]);
    vm.toggleSecondary('mapping'); vm.toggleSecondary('thermal'); vm.toggleSecondary('composition');
    expect(vm.getState().secondaries).toEqual(['mapping', 'thermal']);
    vm.setNoSecondary(true); expect(vm.getState().secondaries).toEqual([]);
    expect(nextAvailability(vm.getState()).enabled).toBe(true);
  });
  it('le radar n’entre dans l’estimation que s’il est conservé', async () => {
    const { vm } = setup(); await vm.init(); toSelection(vm);
    vm.setPrimary('ice'); vm.setNoSecondary(true); vm.next();
    vm.decideElias('drop'); const a = estimateOf(vm.getState())!;
    vm.decideElias('keep'); const b = estimateOf(vm.getState())!;
    expect(b.massKg - a.massKg).toBeCloseTo(13.8); expect(b.count).toBe(a.count + 1);
  });
  it('confirme : sauvegarde horodatée, événements, sortie vers P09', async () => {
    const { vm, nav, events, save } = setup(); await vm.init(); toSelection(vm);
    vm.setPrimary('mapping'); vm.toggleSecondary('ice'); vm.next(); vm.decideElias('defer'); vm.next();
    vm.next(); vm.next(); // double clic : une seule sauvegarde
    await vi.waitFor(() => expect(nav.go).toHaveBeenCalledWith('/campagne/acte-2/atelier'));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toMatchObject({ primary: 'mapping', secondaries: ['ice'], elias: 'defer', instruments: ['camera', 'neutron'] });
    await vi.waitFor(() => expect(events.record.mock.calls.map((c) => c[1].code)).toEqual(['EVT-A1-002', 'EVT-A1-001']));
  });
  it('erreur de sauvegarde : message affiché, pas de navigation', async () => {
    const { vm, nav } = setup(vi.fn().mockRejectedValue(new RepositoryError('Profil non enregistré (HTTP 500)')));
    await vm.init(); toSelection(vm); vm.setPrimary('thermal'); vm.setNoSecondary(true); vm.next(); vm.decideElias('keep'); vm.next(); vm.next();
    await vi.waitFor(() => expect(vm.getState().error).toMatch(/HTTP 500/));
    expect(nav.go).not.toHaveBeenCalled(); expect(vm.getState().submitting).toBe(false);
  });
  it('pas de saut d’étape vers l’avant', async () => {
    const { vm } = setup(); await vm.init();
    vm.goTo('confirm'); expect(vm.getState().step).toBe('briefing');
    expect(vm.canGoTo('selection')).toBe(true); expect(vm.canGoTo('elias')).toBe(false);
  });
});
