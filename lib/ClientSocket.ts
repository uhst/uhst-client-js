import {EventEmitter} from "events";
import { UhstApiClient } from "./UhstApiClient";
import { UhstSocket } from "./UhstSocket";
import { ClientConfiguration, Message } from "./models";

const RTC_SDP_TYPES = ["answer", "offer", "pranswer", "rollback"];

export class ClientSocket extends EventEmitter implements UhstSocket {
    private config: ClientConfiguration;
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, private hostId: string) {
        super();
        this.init();
    }

    private handleConnectionStateChange(ev: Event) {
        switch (this.connection.connectionState) {
            case "connected":
                // The connection has become fully connected
                break;
            case "disconnected":
            case "failed":
                // One or more transports has terminated unexpectedly or in an error
                break;
            case "closed":
                // The connection has been closed
                break;
        }
    }

    private handleIceCandidate(ev: RTCPeerConnectionIceEvent) {
        if (ev.candidate) {
            this.apiClient.sendMessage(this.config.clientToken, ev.candidate, this.config.sendUrl);
            return;
        }
    }

    private handleMessage(message: Message) {
        if (RTC_SDP_TYPES.includes(message.body.type)) {
            this.connection.setRemoteDescription(message.body);
        } else {
            this.connection.addIceCandidate(message.body);
        }
    }

    private async init() {
        this.config = await this.apiClient.initClient(this.hostId);
        this.connection = new RTCPeerConnection(this.configuration);
        this.connection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
        this.connection.onicecandidate = this.handleIceCandidate.bind(this);
        this.dataChannel = this.connection.createDataChannel("uhst");
        this.dataChannel.onopen = (event) => {
            this.emit("open");
        };
        this.dataChannel.onmessage = (event) => {
            this.emit("message", event.data);
        };
        const offer = await this.connection.createOffer();
        this.apiClient.subscribeToMessages(this.config.clientToken, this.handleMessage.bind(this), this.config.receiveUrl);
        this.connection.setLocalDescription(offer);
        this.apiClient.sendMessage(this.config.clientToken, offer, this.config.sendUrl);
    }

    send(message: string): void {
        this.dataChannel.send(message);
    }

}