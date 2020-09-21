import { EventEmitter } from "inf-ee";
import { UhstApiClient, MessageStream } from "./contracts/UhstApiClient";
import { Message, HostSocketParams, ClientSocketParams } from "./models";

type SocketEventSet = {
    open: () => void,
    message: (data: any) => void,
    diagnostic: (message: string) => void
}

export class UhstSocket {
    private _ee = new EventEmitter<SocketEventSet>();
    private _pendingCandidates: (RTCIceCandidate | RTCIceCandidateInit)[] = [];
    private _offerAccepted = false;
    private token: string;
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;
    private apiMessageStream: MessageStream;
    private sendUrl?: string;

    constructor(private apiClient: UhstApiClient, private configuration: RTCConfiguration, params: HostSocketParams | ClientSocketParams) {
        this.connection = this.createConnection();
        switch (params.type) {
            case "client":
                // will connect to host
                this.initClient(params.hostId);
                break;
            case "host":
                // will connect to client
                this.token = params.token;
                this.sendUrl = params.sendUrl;
                break;
            default:
                throw Error("Unsupported Socket Parameters Type");
        }
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

    send = (message: string) => {
        this.dataChannel.send(message);
    }

    handleMessage = (message: Message) => {
        if (message.body.type === "offer") {
            this.initHost(message.body);
        } else if (message.body.type === "answer") {
            this.connection.setRemoteDescription(message.body);
            this._offerAccepted = true;
            this.processIceCandidates();
        } else {
            this._pendingCandidates.push(message.body);
            this.processIceCandidates();
        }
    }

    private createConnection = (): RTCPeerConnection => {
        const connection = new RTCPeerConnection(this.configuration);
        connection.onconnectionstatechange = this.handleConnectionStateChange;
        connection.onicecandidate = this.handleIceCandidate;
        return connection;
    }

    private configureDataChannel = () => {
        this.dataChannel.onopen = () => {
            if (this.apiMessageStream) {
                this.apiMessageStream.close();
            }
            this._ee.emit("open");
        };
        this.dataChannel.onmessage = (event) => {
            this._ee.emit("message", event.data);
        };
    }

    private handleConnectionStateChange = (ev: Event) => {
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

    private handleIceCandidate = (ev: RTCPeerConnectionIceEvent) => {
        if (ev.candidate) {
            this.apiClient.sendMessage(this.token, ev.candidate, this.sendUrl);
            return;
        }
    }

    private initHost = async (description: RTCSessionDescriptionInit) => {
        this.connection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.configureDataChannel();
        };
        await this.connection.setRemoteDescription(description);
        const answer = await this.connection.createAnswer();
        this.apiClient.sendMessage(this.token, answer, this.sendUrl);
        await this.connection.setLocalDescription(answer);
        this._offerAccepted = true;
        this.processIceCandidates();
    }

    private initClient = async (hostId: string) => {
        this.dataChannel = this.connection.createDataChannel("uhst");
        this.configureDataChannel();
        const config = await this.apiClient.initClient(hostId);
        this.token = config.clientToken;
        this.sendUrl = config.sendUrl;
        this.apiMessageStream = this.apiClient.subscribeToMessages(config.clientToken, this.handleMessage, config.receiveUrl);
        const offer = await this.connection.createOffer();
        this.apiClient.sendMessage(this.token, offer, this.sendUrl);
        await this.connection.setLocalDescription(offer);
    }

    private processIceCandidates = () => {
        if (this._offerAccepted) {
            while (this._pendingCandidates.length > 0) {
                const candidate = this._pendingCandidates.pop();
                if (candidate) {
                    this.connection.addIceCandidate(candidate);
                }
            }
        }
    }
}