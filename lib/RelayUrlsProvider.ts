import { Relay } from './models';
import { NetworkClient } from './NetworkClient';
import { RelayUnreachable } from './UhstErrors';

const RELAYS_LIST_URL =
  'https://raw.githubusercontent.com/uhst/relays/main/list.json';

export class RelayUrlsProvider {
  networkClient: NetworkClient;
  constructor(networkClient?: NetworkClient) {
    this.networkClient = networkClient ?? new NetworkClient();
  }
  async getRelayUrls(hostId?: string): Promise<string[]> {
    const relays: Relay[] = await this.networkClient.get(RELAYS_LIST_URL);
    if (hostId) {
      // if hostId get all URLs for the hostId
      const prefix = hostId.split('-')[0];
      for (const relay of relays) {
        if (relay.prefix === prefix) {
          return relay.urls;
        }
      }
      // there are no relays serving this prefix
      return [];
    }
    // if no hostId, get all URLs
    const urls: string[] = [];
    relays.forEach((x) => x.urls.forEach((url) => urls.push(url)));
    return urls;
  }

  async getBestRelayUrl(hostId?: string): Promise<string> {
    const relayUrls = await this.getRelayUrls(hostId);
    return new Promise<string>((resolve, reject) => {
      let resolved = false;
      let failed = 0;
      if (relayUrls.length === 0) {
        reject(new RelayUnreachable());
      } else {
        relayUrls
          .sort(() => Math.random() - Math.random())
          .slice(0, Math.min(relayUrls.length, 10))
          .forEach(async (url) => {
            try {
              const response = await this.networkClient.post(url, [
                'action=ping',
                `timestamp=${Date.now()}`,
              ]);
              if (!resolved) {
                resolve(url);
                resolved = true;
              }
            } catch (e) {
              failed++;
              if (!resolved && failed == relayUrls.length) {
                reject(e);
              }
            }
          });
      }
    });
  }
}
