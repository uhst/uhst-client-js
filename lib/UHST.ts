import { UhstApiClient } from "./contracts/UhstApiClient";
import { ApiClient } from "./ApiClient";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";
import { UhstHost } from "./UhstHost";
import { RelaySocketProvider } from "./RelaySocketProvider";

export interface UhstOptions {

    socketProvider?: UhstSocketProvider,
    /**
     * An API client for communication with the server,
     * normally used for testing or if implementing 
     * [[UhstApiClient | custom  protocol]].
     * If both [[apiClient]] and [[apiUrl]] are
     * defined, then [[apiClient]] will be used.
     */
    apiClient?: UhstApiClient,
    /**
     * Url to a server implementing the UHST  protocol.
     * If not defined and [[apiClient]] is also not defined, then
     * this library will fallback to [[UHST_API_URL | a default server URL]].
     */
    apiUrl?: string,
    /**
     * Set to true and subscribe to "diagnostic" to receive events
     * from [[UhstSocket]].
     */
    debug?: boolean
}

export class UHST {
    /**
    * Fallback URL to a UHST API (server). If no
    * configuration is provided or [[apiUrl]] is not defined in
    * the configuration then this URL will be used.
    */
    private static UHST_API_URL = "https://demo.uhst.io/";
    private apiClient: UhstApiClient;
    private debug: boolean;
    private socketProvider: UhstSocketProvider;

    constructor(options: UhstOptions = {}) {
        this.debug = options.debug ?? false;
        if (options.apiClient) {
            this.apiClient = options.apiClient;
        } else if (options.apiUrl) {
            this.apiClient = new ApiClient(options.apiUrl);
        } else {
            this.apiClient = new ApiClient(UHST.UHST_API_URL);
        }
        this.socketProvider = options.socketProvider ?? new RelaySocketProvider();
    }

    join(hostId: string): UhstSocket {
        return this.socketProvider.createUhstSocket(this.apiClient, {type: "client", hostId}, this.debug);
    }

    host(hostId: string): UhstHost {
        return new UhstHost(this.apiClient, this.socketProvider, hostId, this.debug);
    }

}