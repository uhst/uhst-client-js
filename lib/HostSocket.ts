import { EventEmitter } from "inf-ee";
import { UhstApiClient } from "./contracts/UhstApiClient";
import { SocketEventSet, UhstSocket } from "./contracts/UhstSocket";
import { Message } from "./models";


export class HostSocket implements UhstSocket {
    private _ee = new EventEmitter<SocketEventSet>();
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, private responseToken: string, private sendUrl?: string) {
    }

    on<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]) {
        this._ee.on(eventName, handler);
    }

    once<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]) {
        this._ee.once(eventName, handler);
    }

    off<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]) {
        this._ee.off(eventName, handler);
    }

    send(message: string): void {
        this.dataChannel.send(message);
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
                this._ee.emit("open");
            };
            this.dataChannel.onmessage = (event) => {
                this._ee.emit("message", event.data);
            };
        };
        await this.connection.setRemoteDescription(description);
        const answer = await this.connection.createAnswer();
        await this.connection.setLocalDescription(answer);
        this.apiClient.sendMessage(this.responseToken, answer, this.sendUrl);
    }
}