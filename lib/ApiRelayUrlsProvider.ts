import { NetworkClient } from './NetworkClient';
import { RelayUrlsResolver } from './contracts/RelayUrlsResolver';
import { RelayUnreachable } from './UhstErrors';

const DEFAULT_API_URL = 'https://api.uhst.io';

/**
 * Discovers signaling servers through the hosted UHST API
 * (https://api.uhst.io). Authenticates with an API key (`uhst_dev_...`) sent in
 * the `X-Api-Key` header. The API returns bare hostnames; this provider turns
 * them into HTTPS relay URLs.
 *
 * Using the API is entirely optional — a relay can still be reached directly by
 * passing its URL as `relayUrl`, without involving the API at all.
 */
export class ApiRelayUrlsProvider implements RelayUrlsResolver {
  networkClient: NetworkClient;
  private apiUrl: string;

  constructor(
    private apiKey: string,
    apiUrl?: string,
    networkClient?: NetworkClient
  ) {
    this.apiUrl = (apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, '');
    this.networkClient = networkClient ?? new NetworkClient();
  }

  private relayUrlFromHostname(hostname: string): string {
    return `https://${hostname}/`;
  }

  private headers(): Record<string, string> {
    return { 'X-Api-Key': this.apiKey };
  }

  async getRelayUrls(hostId?: string): Promise<string[]> {
    if (hostId) {
      // Resolve the single server that owns this host's prefix.
      const prefix = hostId.split('-')[0];
      try {
        const res = await this.networkClient.get(
          `${this.apiUrl}/v1/client/server`,
          [`prefix=${encodeURIComponent(prefix)}`],
          undefined,
          this.headers()
        );
        return res && res.hostname
          ? [this.relayUrlFromHostname(res.hostname)]
          : [];
      } catch {
        // No server for this prefix (or the API is unreachable).
        return [];
      }
    }
    // No hostId: every available server, so the caller can pick the fastest.
    try {
      const res = await this.networkClient.get(
        `${this.apiUrl}/v1/client/server`,
        undefined,
        undefined,
        this.headers()
      );
      const servers: Array<{ hostname: string }> = res?.servers ?? [];
      return servers
        .filter((s) => s && s.hostname)
        .map((s) => this.relayUrlFromHostname(s.hostname));
    } catch {
      return [];
    }
  }

  async getBestRelayUrl(hostId?: string): Promise<string> {
    const relayUrls = await this.getRelayUrls(hostId);
    return new Promise<string>((resolve, reject) => {
      let resolved = false;
      let failed = 0;
      if (relayUrls.length === 0) {
        reject(new RelayUnreachable());
      } else {
        const candidates = relayUrls
          .sort(() => Math.random() - Math.random())
          .slice(0, Math.min(relayUrls.length, 10));
        candidates.forEach(async (url) => {
          try {
            await this.networkClient.post(url, [
              'action=ping',
              `timestamp=${Date.now()}`,
            ]);
            if (!resolved) {
              resolve(url);
              resolved = true;
            }
          } catch (e) {
            failed++;
            if (!resolved && failed === candidates.length) {
              reject(e);
            }
          }
        });
      }
    });
  }
}
