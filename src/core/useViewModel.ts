import { useSyncExternalStore } from 'react';
import type { Store } from './Store';
/** Seul pont entre React (View) et un ViewModel. */
export function useViewModel<S>(vm: Store<S>): S {
  return useSyncExternalStore(vm.subscribe, vm.getState);
}
