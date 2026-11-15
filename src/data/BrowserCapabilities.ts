import type { RenderMode } from '../domain/campaign';
import type { CapabilitiesProvider } from '../domain/ports';

export class BrowserCapabilities implements CapabilitiesProvider {
  detect(): RenderMode {
    try {
      const c = document.createElement('canvas');
      return c.getContext('webgl2') || c.getContext('webgl') ? '3d' : '2d';
    } catch { return '2d'; }
  }
}
