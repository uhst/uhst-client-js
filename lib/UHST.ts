import { UhstApiClient } from "./UhstApiClient";
import { ApiClient } from "./ApiClient";
import {ClientSocket} from "./ClientSocket";
import { UhstHost } from "./UhstHost";

const DEFAULT_MEETING_POINT_URL = "https://demo.uhst.io/";

export class UHST {
    private configuration: RTCConfiguration;
    private apiClient: UhstApiClient;

    constructor()
    constructor(configuration: RTCConfiguration)
    constructor(configuration: RTCConfiguration, meetingPoint: UhstApiClient)
    constructor(configuration: RTCConfiguration, meetingPoint: string)
    constructor(configuration?: RTCConfiguration, meetingPoint?: string | UhstApiClient) {
        this.configuration = configuration ?? {};
        if (typeof meetingPoint === "undefined" || meetingPoint === null) {
            this.apiClient = new ApiClient(DEFAULT_MEETING_POINT_URL);
        } else if (typeof meetingPoint === "string") {
            this.apiClient = new ApiClient(meetingPoint);
        } else {
            this.apiClient = meetingPoint;
        }
    }

    join(hostId: string): ClientSocket {
        return new ClientSocket(this.apiClient, this.configuration, hostId);
    }

    host(hostId: string): UhstHost {
        return new UhstHost(this.apiClient, this.configuration, hostId);
     }

}