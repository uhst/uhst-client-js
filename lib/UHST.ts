import { UhstRelayClient } from "./contracts/UhstRelayClient";
import { RelayClient } from "./RelayClient";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";
import { UhstHost } from "./UhstHost";
import { RelaySocketProvider } from "./RelaySocketProvider";

export interface UhstOptions {

    socketProvider?: UhstSocketProvider,
    /**
     * Relay client for communication with the server,
     * normally used for testing or if implementing 
     * [[UhstRelayClient | custom  protocol]].
     * If both [[relayClient]] and [[relayUrl]] are
     * defined, then [[relayClient]] will be used.
     */
    relayClient?: UhstRelayClient,
    /**
     * Url to a server implementing the UHST protocol.
     * If not defined and [[relayClient]] is also not defined, then
     * this library will fallback to [[UHST_RELAY_URL | a default server URL]].
     */
    relayUrl?: string,
    /**
     * Set to true and subscribe to "diagnostic" to receive events
     * from [[UhstSocket]].
     */
    debug?: boolean
}

export class UHST {
    /**
    * Fallback URL to a UHST RELAY (server). If no
    * configuration is provided or [[relayUrl]] is not defined in
    * the configuration then this URL will be used.
    */
    private static UHST_RELAY_URL = "https://demo.uhst.io/";
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
            this.relayClient = new RelayClient(UHST.UHST_RELAY_URL);
        }
        this.socketProvider = options.socketProvider ?? new RelaySocketProvider();
    }

    join(hostId: string): UhstSocket {
        return this.socketProvider.createUhstSocket(this.relayClient, {type: "client", hostId}, this.debug);
    }

    host(hostId: string): UhstHost {
        return new UhstHost(this.relayClient, this.socketProvider, hostId, this.debug);
    }

}