import { RelayClient } from "./RelayClient";

export class RelayClientProvider {
    createRelayClient(relayUrl: string): RelayClient {
        return new RelayClient(relayUrl);
    }
}