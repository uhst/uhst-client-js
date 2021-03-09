import { UhstRelayClient } from "./contracts/UhstRelayClient";
import { RelayClient } from "./RelayClient";
import { ApiClient } from "./ApiClient";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";
import { UhstHost } from "./UhstHost";
import { RelaySocketProvider } from "./RelaySocketProvider";
import { RelayClientProvider } from "./RelayClientProvider";

export interface UhstOptions {

    socketProvider?: UhstSocketProvider,
    /**
     * Relay client for communication with the relay,
     * normally used for testing or if implementing 
     * [[UhstRelayClient | custom  protocol]].
     * If both [[relayClient]] and [[relayUrl]] are
     * defined, then [[relayClient]] will be used.
     */
    relayClient?: UhstRelayClient,
    /**
     * Url to a server implementing the UHST relay protocol. All
     * clients connecting to the same hostId must use the same
     * relayUrl as the host.
     * If not defined and [[relayClient]] is also not defined, then
     * this library will connect to a random public relay.
     * If no relayUrl is specified on the host then the library will
     * automatically use the same random public relay for all clients
     * connecting to the same hostId.
     */
    relayUrl?: string,
    /**
     * Set to true and subscribe to "diagnostic" to receive events
     * from [[UhstSocket]].
     */
    debug?: boolean
}

export class UHST {
    private relayClient: UhstRelayClient;
    private debug: boolean;
    private socketProvider: UhstSocketProvider;

    constructor(options: UhstOptions = {}) {
        this.debug = options.debug ?? false;
        if (options.relayClient) {
            this.relayClient = options.relayClient;
        } else if (options.relayUrl) {
            this.relayClient = new RelayClient(options.relayUrl);
        } else {
            this.relayClient = new ApiClient(new RelayClientProvider());
        }
        this.socketProvider = options.socketProvider ?? new RelaySocketProvider();
    }

    join(hostId: string): UhstSocket {
        return this.socketProvider.createUhstSocket(this.relayClient, {type: "client", hostId}, this.debug);
    }

    host(hostId?: string): UhstHost {
        return new UhstHost(this.relayClient, this.socketProvider, hostId, this.debug);
    }

}