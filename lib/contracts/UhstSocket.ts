import { Message, SocketTransport } from "../models";

export type SocketEventSet = {
    open: () => void,
    message: (data: any) => void,
    error: (error: Error) => void,
    close: () => void,
    /**
     * Fired whenever the underlying transport changes, e.g. when the
     * connection is upgraded from the relay to a direct WebRTC data channel,
     * or falls back to the relay if WebRTC drops. The handler receives the
     * new transport ("relay" or "webrtc").
     */
    transportchange: (transport: SocketTransport) => void,
    diagnostic: (message: string) => void
}

export interface UhstSocket {
    readonly remoteId: string;

    /**
     * How application messages are currently being delivered: "relay" while
     * going through the relay server (default and fallback) or "webrtc" once
     * the connection has been upgraded to a direct peer-to-peer data channel.
     */
    readonly transport: SocketTransport;

    on<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    once<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    off<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    send(message: string): Promise<any>;
    send(message: Blob): Promise<any>;
    send(message: ArrayBuffer): Promise<any>;
    send(message: ArrayBufferView): Promise<any>;

    close();

    handleMessage(message: Message);

}
