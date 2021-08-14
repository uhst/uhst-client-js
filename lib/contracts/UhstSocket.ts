import { Message } from "../models";

export type SocketEventSet = {
    open: () => void,
    message: (data: any) => void,
    error: (error: Error) => void,
    close: () => void,
    diagnostic: (message: string) => void
}

export interface UhstSocket {
    readonly remoteId: string; 

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