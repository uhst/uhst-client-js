import { UhstApiClient } from "./contracts/UhstApiClient";
import { ApiClient } from "./ApiClient";
import { ClientSocket } from "./ClientSocket";
import { UhstHost } from "./UhstHost";

export interface UhstOptions {
    /**
     * Used when instantiating the underlying WebRTC connection.
     * Most importantly allows specifying iceServers for NAT
     * traversal.
     */
    rtcConfiguration?: RTCConfiguration,
    /**
     * An API client for communication with the signalling server,
     * normally used for testing or if implementing 
     * [[UhstApiClient | custom signalling protocol]].
     * If both [[meetingPointClient]] and [[meetingPointUrl]] are
     * defined, then [[meetingPointClient]] will be used.
     */
    meetingPointClient?: UhstApiClient,
    /**
     * Url to a server implementing the UHST signalling protocol.
     * If not defined and [[meetingPointClient]] is also not defined, then
     * this library will fallback to [[DEFAULT_MEETING_POINT_URL | a default signalling server URL]].
     */
    meetingPointUrl?: string
}

export class UHST {
    /**
    * Fallback URL to a UHST meeting point (signalling server). If no
    * configuration is provided or [[meetingPointUrl]] is not defined in
    * the configuration then this URL will be used.
    */
    private static DEFAULT_MEETING_POINT_URL = "https://demo.uhst.io/";
    private rtcConfiguration: RTCConfiguration;
    private apiClient: UhstApiClient;

    constructor(options: UhstOptions = {}) {
        this.rtcConfiguration = options.rtcConfiguration ?? {};
        if (options.meetingPointClient) {
            this.apiClient = options.meetingPointClient;
        } else if (options.meetingPointUrl) {
            this.apiClient = new ApiClient(options.meetingPointUrl);
        } else {
            this.apiClient = new ApiClient(UHST.DEFAULT_MEETING_POINT_URL);
        }
    }

    join(hostId: string): ClientSocket {
        return new ClientSocket(this.apiClient, this.rtcConfiguration, hostId);
    }

    host(hostId: string): UhstHost {
        return new UhstHost(this.apiClient, this.rtcConfiguration, hostId);
    }

}