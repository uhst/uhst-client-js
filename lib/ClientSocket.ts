import { EventEmitter } from "inf-ee";
import { UhstApiClient, MessageStream } from "./contracts/UhstApiClient";
import { SocketEventSet, UhstSocket } from "./contracts/UhstSocket";
import { ClientConfiguration, Message } from "./models";

export class ClientSocket implements UhstSocket {
    private _ee = new EventEmitter<SocketEventSet>();
    private config: ClientConfiguration;
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;
    private apiMessageStream: MessageStream;

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, private hostId: string) {
        this.init();
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
            this.apiClient.sendMessage(this.config.clientToken, ev.candidate, this.config.sendUrl);
            return;
        }
    }

    private handleMessage(message: Message) {
        if (message.body.type === "answer") {
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
        this.dataChannel.onopen = () => {
            this.apiMessageStream.close();
            this._ee.emit("open");
        };
        this.dataChannel.onmessage = (event) => {
            this._ee.emit("message", event.data);
        };
        const offer = await this.connection.createOffer();
        this.apiMessageStream = this.apiClient.subscribeToMessages(this.config.clientToken, this.handleMessage.bind(this), this.config.receiveUrl);
        this.connection.setLocalDescription(offer);
        this.apiClient.sendMessage(this.config.clientToken, offer, this.config.sendUrl);
    }
}