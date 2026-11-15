import type { Navigator } from '../domain/ports';
/** Navigation minimale par hash ; remplaçable par un routeur sans toucher aux ViewModels. */
export class HashNavigator implements Navigator {
  go(route: string): void { window.location.hash = route; }
}
