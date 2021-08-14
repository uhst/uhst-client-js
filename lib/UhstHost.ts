import JwtDecode from "jwt-decode";
import { EventEmitter } from "inf-ee";
import { MessageStream, UhstRelayClient } from "./contracts/UhstRelayClient";
import { HostConfiguration, HostMessage } from "./models";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";

type HostEventSet = {
    ready: () => void,
    connection: (socket: UhstSocket) => void,
    error: (error: Error) => void,
    diagnostic: (message: string) => void
}

export class UhstHost {
    private _ee = new EventEmitter<HostEventSet>();
    private clients = new Map<string, UhstSocket>();
    private config: HostConfiguration;
    private relayMessageStream: MessageStream;

    constructor(private relayClient: UhstRelayClient, private socketProvider: UhstSocketProvider, requestedHostId: string | undefined, private debug: boolean) {
        this.handleMessage = this.handleMessage.bind(this);
        
        this.init(requestedHostId);
    }

    get hostId(): string {
        return this.config.hostId;
    }

    broadcast(message: string): void;
    broadcast(message: Blob): void;
    broadcast(message: ArrayBuffer): void;
    broadcast(message: ArrayBufferView): void;
    broadcast(message: any) {
        const envelope = {
            "type": "string",
            "payload": message
        }
        this.relayClient.sendMessage(this.config.hostToken, envelope, this.config.sendUrl).catch((error) => {
            if (this.debug) { this._ee.emit("diagnostic", "Failed sending message: " + JSON.stringify(error)); }
            this._ee.emit("error", error);
        });
        if (this.debug) { this._ee.emit("diagnostic", "Sent message " + message); }
    }

    on<EventName extends keyof HostEventSet>(eventName: EventName, handler: HostEventSet[EventName]) {
        this._ee.on(eventName, handler);
    }

    once<EventName extends keyof HostEventSet>(eventName: EventName, handler: HostEventSet[EventName]) {
        this._ee.once(eventName, handler);
    }

    off<EventName extends keyof HostEventSet>(eventName: EventName, handler: HostEventSet[EventName]) {
        this._ee.off(eventName, handler);
    }

    disconnect() {
        this.relayMessageStream?.close();
    }

    private handleMessage(message: HostMessage) {
        const clientId: string = (JwtDecode(message.responseToken) as any).clientId;
        let hostSocket = this.clients.get(clientId);
        if (!hostSocket) {
            const socket = this.socketProvider.createUhstSocket(this.relayClient, {type: "host", token: message.responseToken, sendUrl: this.config.sendUrl, clientId}, this.debug);
            if (this.debug) { this._ee.emit("diagnostic", "Host received client connection from clientId: "+clientId); }
            this._ee.emit("connection", socket);
            this.clients.set(clientId, socket);
            hostSocket = socket;
        }
        hostSocket.handleMessage(message);
    }

    private async init(requestedHostId?: string) {
        try {
            this.config = await this.relayClient.initHost(requestedHostId);
            if (this.debug) { this._ee.emit("diagnostic", "Host configuration received from server."); }
            this.relayMessageStream = await this.relayClient.subscribeToMessages(this.config.hostToken, this.handleMessage, this.config.receiveUrl);
            if (this.debug) { this._ee.emit("diagnostic", "Host subscribed to messages from server."); }
            this._ee.emit("ready");
        } catch (error) {
            if (this.debug) { this._ee.emit("diagnostic", "Host failed subscribing to messages: "+JSON.stringify(error)); }
            this._ee.emit("error", error);
        }
    }
}