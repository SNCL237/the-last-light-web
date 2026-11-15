import type { AssetEntry } from '../domain/assets';
import { RepositoryError, type AssetManifestRepository } from '../domain/ports';

/** Lit /assets-manifest.json (public/). Remplaçable par un adaptateur HTTP sans toucher au ViewModel. */
export class StaticAssetManifestRepository implements AssetManifestRepository {
  async getAll(): Promise<AssetEntry[]> {
    const res = await fetch(`${import.meta.env.BASE_URL}assets-manifest.json`);
    if (!res.ok) throw new RepositoryError(`Manifeste indisponible (HTTP ${res.status})`);
    return ((await res.json()) as { assets: AssetEntry[] }).assets;
  }
}
