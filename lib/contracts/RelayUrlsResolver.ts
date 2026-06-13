/**
 * Resolves the URLs of UHST relay (signaling) servers. Implementations discover
 * relays either from the static public relays directory
 * ([[RelayUrlsProvider]]) or from the hosted UHST API
 * ([[ApiRelayUrlsProvider]]).
 */
export interface RelayUrlsResolver {
  /**
   * All relay URLs that can serve the given hostId (or every known relay when
   * no hostId is supplied).
   */
  getRelayUrls(hostId?: string): Promise<string[]>;
  /**
   * The relay URL with the lowest latency among those returned by
   * [[getRelayUrls]].
   */
  getBestRelayUrl(hostId?: string): Promise<string>;
}
