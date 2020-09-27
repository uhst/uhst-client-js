import JwtDecode from "jwt-decode";
import { EventEmitter } from "inf-ee";
import { UhstApiClient } from "./contracts/UhstApiClient";
import { UhstSocket } from "./UhstSocket";
import { HostConfiguration, HostMessage } from "./models";

type HostEventSet = {
    ready: () => void,
    connection: (socket: UhstSocket) => void,
    error: (error: Error) => void,
    diagnostic: (message: string) => void
}

export class UhstHost {
    private _ee = new EventEmitter<HostEventSet>();
    private config: HostConfiguration;
    private clients = new Map<string, UhstSocket>();

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, requestedHostId: string, private debug: boolean) {
        this.init(requestedHostId);
    }

    get hostId(): string {
        return this.config.hostId;
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

    private handleMessage = (message: HostMessage) => {
        const clientId: string = (JwtDecode(message.responseToken) as any).clientId;
        let hostSocket = this.clients.get(clientId);
        if (!hostSocket) {
            const socket = new UhstSocket(this.apiClient, this.configuration, {type: "host", token: message.responseToken, sendUrl: this.config.sendUrl}, this.debug);
            if (this.debug) { this._ee.emit("diagnostic", "Host received client connection from clientId: "+clientId); }
            this._ee.emit("connection", socket);
            this.clients.set(clientId, socket);
            hostSocket = socket;
        }
        hostSocket.handleMessage(message);
    }

    private async init(requestedHostId: string) {
        try {
            this.config = await this.apiClient.initHost(requestedHostId);
            if (this.debug) { this._ee.emit("diagnostic", "Host configuration received from signalling server."); }
            this.apiClient.subscribeToMessages(this.config.hostToken, this.handleMessage, this.config.receiveUrl);
            if (this.debug) { this._ee.emit("diagnostic", "Host subscribed to messages from signalling server."); }
            this._ee.emit("ready");
        } catch (error) {
            if (this.debug) { this._ee.emit("diagnostic", "Host failed subscribing to messages: "+JSON.stringify(error)); }
            this._ee.emit("error", error);
        }
    }
}