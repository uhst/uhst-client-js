import JwtDecode from "jwt-decode";
import {EventEmitter} from "events";
import { UhstApiClient } from "./UhstApiClient";
import { HostSocket } from "./HostSocket";
import { HostConfiguration, HostMessage } from "./models";

export class UhstHost extends EventEmitter {
    private config: HostConfiguration;
    private clients = new Map<string, HostSocket>();

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, requestedHostId: string) {
        super();
        this.init(requestedHostId);
    }

    get hostId(): string {
        return this.config.hostId;
    }

    private handleMessage(message: HostMessage) {
        const clientId: string = (JwtDecode(message.responseToken) as any).clientId;
        let hostSocket = this.clients.get(clientId);
        if (!hostSocket) {
            hostSocket = new HostSocket(this.apiClient, this.configuration, message.responseToken, this.config.sendUrl);
            hostSocket.on("open", () => {
                this.emit("connection", hostSocket);
            });
            this.clients.set(clientId, hostSocket);
        }
        hostSocket.handleMessage(message);
    }

    private async init(requestedHostId: string) {
        this.config = await this.apiClient.initHost(requestedHostId);
        this.apiClient.subscribeToMessages(this.config.hostToken, this.handleMessage.bind(this), this.config.receiveUrl);
        this.emit("ready");
    }
}