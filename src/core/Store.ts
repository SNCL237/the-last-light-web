/** Base d'un ViewModel : état immuable observable, sans dépendance à React. */
export abstract class Store<S> {
  private listeners = new Set<() => void>();
  protected constructor(private state: S) {}
  getState = (): S => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  protected setState(patch: Partial<S>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
}
