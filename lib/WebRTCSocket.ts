import { EventEmitter } from "inf-ee";
import { UhstRelayClient, MessageStream } from "./contracts/UhstRelayClient";
import { SocketEventSet, UhstSocket } from "./contracts/UhstSocket";
import { Message, HostSocketParams, ClientSocketParams } from "./models";

export class WebRTCSocket implements UhstSocket {
    private _ee = new EventEmitter<SocketEventSet>();
    private _pendingCandidates: (RTCIceCandidate | RTCIceCandidateInit)[] = [];
    private _offerAccepted = false;
    private token: string;
    private connection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;
    private relayMessageStream: MessageStream;
    private sendUrl?: string;

    constructor(private relayClient: UhstRelayClient, private configuration: RTCConfiguration, params: HostSocketParams | ClientSocketParams, private debug: boolean) {
        this.send = this.send.bind(this);
        this.processIceCandidates = this.processIceCandidates.bind(this);
        this.initClient = this.initClient.bind(this);
        this.initHost = this.initHost.bind(this);
        this.handleIceCandidate = this.handleIceCandidate.bind(this);
        this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);
        this.configureDataChannel = this.configureDataChannel.bind(this);
        this.createConnection = this.createConnection.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.close = this.close.bind(this);

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

    send(message: string): void;
    send(message: Blob): void;
    send(message: ArrayBuffer): void;
    send(message: ArrayBufferView): void;

    send(message: any) {
        if (this.debug) { this._ee.emit("diagnostic", "Sent message on data channel: " + message); }
        this.dataChannel.send(message);
    }

    close() {
        this.connection.close();
    }

    handleMessage(message: Message) {
        if (message.body.type === "offer") {
            if (this.debug) { this._ee.emit("diagnostic", "Received offer: " + JSON.stringify(message.body)); }
            this.initHost(message.body);
        } else if (message.body.type === "answer") {
            if (this.debug) { this._ee.emit("diagnostic", "Received answer: " + JSON.stringify(message.body)); }
            this.connection.setRemoteDescription(message.body);
            this._offerAccepted = true;
            this.processIceCandidates();
        } else {
            if (this.debug) { this._ee.emit("diagnostic", "Received ICE Candidates: " + JSON.stringify(message.body)); }
            this._pendingCandidates.push(message.body);
            this.processIceCandidates();
        }
    }

    private createConnection(): RTCPeerConnection {
        const connection = new RTCPeerConnection(this.configuration);
        connection.onconnectionstatechange = this.handleConnectionStateChange;
        connection.onicecandidate = this.handleIceCandidate;
        return connection;
    }

    private configureDataChannel() {
        this.dataChannel.onopen = () => {
            if (this.debug) { this._ee.emit("diagnostic", "Data channel opened."); }
            if (this.relayMessageStream) {
                if (this.debug) { this._ee.emit("diagnostic", "Closing RELAY message stream."); }
                this.relayMessageStream.close();
            }
            this._ee.emit("open");
        };
        this.dataChannel.onclose = () => {
            if (this.debug) { this._ee.emit("diagnostic", "Data channel closed."); }
            this._ee.emit("close");
        }
        this.dataChannel.onmessage = (event) => {
            if (this.debug) { this._ee.emit("diagnostic", "Message received on data channel: " + event.data); }
            this._ee.emit("message", event.data);
        };
    }

    private handleConnectionStateChange(ev: Event) {
        switch (this.connection.connectionState) {
            case "connected":
                // The connection has become fully connected
                if (this.debug) { this._ee.emit("diagnostic", "WebRTC connection established."); }
                break;
            case "disconnected":
                if (this.debug) { this._ee.emit("diagnostic", "WebRTC connection disconnected."); }
                break;
            case "failed":
                if (this.debug) { this._ee.emit("diagnostic", "WebRTC connection failed."); }
                // One or more transports has terminated unexpectedly or in an error
                break;
            case "closed":
                if (this.debug) { this._ee.emit("diagnostic", "WebRTC connection closed."); }
                // The connection has been closed
                break;
        }
    }

    private handleIceCandidate(ev: RTCPeerConnectionIceEvent) {
        if (ev.candidate) {
            if (this.debug) { this._ee.emit("diagnostic", "Sending ICE candidate: " + JSON.stringify(ev.candidate)); }
            this.relayClient.sendMessage(this.token, ev.candidate, this.sendUrl).catch((error) => {
                if (this.debug) { this._ee.emit("diagnostic", "Failed sending ICE candidate: " + JSON.stringify(error)); }
                this._ee.emit("error", error);
            });
        } else {
            if (this.debug) { this._ee.emit("diagnostic", "ICE gathering completed."); }
        }
    }

    private async initHost(description: RTCSessionDescriptionInit) {
        this.connection.ondatachannel = (event) => {
            if (this.debug) { this._ee.emit("diagnostic", "Received new data channel: " + JSON.stringify(event.channel)); }
            this.dataChannel = event.channel;
            this.configureDataChannel();
        };
        await this.connection.setRemoteDescription(description);
        if (this.debug) { this._ee.emit("diagnostic", "Set remote description on host: " + JSON.stringify(description)); }
        const answer = await this.connection.createAnswer();
        this.relayClient.sendMessage(this.token, answer, this.sendUrl).then(() => {
            if (this.debug) { this._ee.emit("diagnostic", "Host sent offer answer: " + JSON.stringify(answer)); }
        }).catch((error) => {
            if (this.debug) { this._ee.emit("diagnostic", "Host failed responding to offer:" + JSON.stringify(error)); }
            this._ee.emit("error", error);
        });
        await this.connection.setLocalDescription(answer);
        if (this.debug) { this._ee.emit("diagnostic", "Local description set to offer answer on host."); }
        this._offerAccepted = true;
        this.processIceCandidates();
    }

    private async initClient(hostId: string) {
        try {
            this.dataChannel = this.connection.createDataChannel("uhst");
            if (this.debug) { this._ee.emit("diagnostic", "Data channel created on client."); }
            this.configureDataChannel();
            const config = await this.relayClient.initClient(hostId);
            if (this.debug) { this._ee.emit("diagnostic", "Client configuration received from server."); }
            this.token = config.clientToken;
            this.sendUrl = config.sendUrl;
            this.relayMessageStream = await this.relayClient.subscribeToMessages(config.clientToken, this.handleMessage, config.receiveUrl);
            if (this.debug) { this._ee.emit("diagnostic", "Client subscribed to messages from server."); }
            const offer = await this.connection.createOffer();
            this.relayClient.sendMessage(this.token, offer, this.sendUrl).then(() => {
                if (this.debug) { this._ee.emit("diagnostic", "Client offer sent to host: " + JSON.stringify(offer)); }
            }).catch((error) => {
                if (this.debug) { this._ee.emit("diagnostic", "Client failed: " + JSON.stringify(error)); }
                this._ee.emit("error", error);
            });
            await this.connection.setLocalDescription(offer);
            if (this.debug) { this._ee.emit("diagnostic", "Local description set on client."); }
        } catch (error) {
            if (this.debug) { this._ee.emit("diagnostic", "Client failed: " + JSON.stringify(error)); }
            this._ee.emit("error", error);
        }
    }

    private processIceCandidates() {
        if (this._offerAccepted) {
            if (this.debug) { this._ee.emit("diagnostic", "Offer accepted, processing cached ICE candidates."); }
            while (this._pendingCandidates.length > 0) {
                const candidate = this._pendingCandidates.pop();
                if (candidate) {
                    this.connection.addIceCandidate(candidate);
                    if (this.debug) { this._ee.emit("diagnostic", "Added ICE candidate: " + JSON.stringify(candidate)); }
                }
            }
        }
    }
}