import { UhstRelayClient } from "./contracts/UhstRelayClient";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";
import { ClientSocketParams, HostSocketParams } from "./models";
import { WebRTCSocket } from "./WebRTCSocket";

export class WebRTCSocketProvider implements UhstSocketProvider {
    /**
     * Used when instantiating the WebRTC connection.
     * Most importantly allows specifying iceServers for NAT
     * traversal.
     * */
    rtcConfiguration: RTCConfiguration;
    constructor(configuration?: RTCConfiguration) {
        this.rtcConfiguration = configuration ?? { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }] };
    }

    createUhstSocket(relayClient: UhstRelayClient, params: ClientSocketParams | HostSocketParams, debug: boolean): UhstSocket {
        return new WebRTCSocket(relayClient, this.rtcConfiguration, params, debug);
    }
}