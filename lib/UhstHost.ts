import JwtDecode from "jwt-decode";
import { EventEmitter } from "inf-ee";
import { UhstApiClient } from "./contracts/UhstApiClient";
import { UhstSocket } from "./UhstSocket";
import { HostConfiguration, HostMessage } from "./models";

type HostEventSet = {
    ready: () => void,
    connection: (socket: UhstSocket) => void,
    error: (error: any) => void
}

export class UhstHost {
    private _ee = new EventEmitter<HostEventSet>();
    private config: HostConfiguration;
    private clients = new Map<string, UhstSocket>();

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, requestedHostId: string) {
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
            const socket = new UhstSocket(this.apiClient, this.configuration, {type: "host", token: message.responseToken, sendUrl: this.config.sendUrl});
            socket.on("open", () => {
                this._ee.emit("connection", socket);
            });
            this.clients.set(clientId, socket);
            hostSocket = socket;
        }
        hostSocket.handleMessage(message);
    }

    private async init(requestedHostId: string) {
        this.config = await this.apiClient.initHost(requestedHostId);
        try {
            this.apiClient.subscribeToMessages(this.config.hostToken, this.handleMessage, this.config.receiveUrl);
            this._ee.emit("ready");
        } catch (error) {
            this._ee.emit("error", error);
        }
    }
}