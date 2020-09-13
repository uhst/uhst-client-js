import { EventEmitter } from "events";
import { UhstApiClient } from "./UhstApiClient";
import { UhstSocket } from "./UhstSocket";
import { Message } from "./models";

export class HostSocket extends EventEmitter implements UhstSocket {
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, private responseToken: string, private sendUrl?: string) {
        super();
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
            this.apiClient.sendMessage(this.responseToken, ev.candidate, this.sendUrl);
            return;
        }
    }

    handleMessage(message: Message) {
        if (message.body.type === "offer") {
            this.init(message.body);
        } else {
            this.connection.addIceCandidate(message.body);
        }
    }

    private async init(description: RTCSessionDescriptionInit) {
        this.connection = new RTCPeerConnection(this.configuration);
        this.connection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
        this.connection.onicecandidate = this.handleIceCandidate.bind(this);
        this.connection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.dataChannel.onopen = () => {
                this.emit("open");
            };
            this.dataChannel.onmessage = (event) => {
                this.emit("message", event.data);
            };
        };
        await this.connection.setRemoteDescription(description);
        const answer = await this.connection.createAnswer();
        await this.connection.setLocalDescription(answer);
        this.apiClient.sendMessage(this.responseToken, answer, this.sendUrl);
    }

    send(message: string): void {
        this.dataChannel.send(message);
    }

}