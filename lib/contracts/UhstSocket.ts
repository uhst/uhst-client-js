import { Message } from "../models";

export type SocketEventSet = {
    open: () => void,
    message: (data: any) => void,
    error: (error: Error) => void,
    close: () => void,
    diagnostic: (message: string) => void
}

export interface UhstSocket {
    on<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    once<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    off<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]);

    send(message: string): void;
    send(message: Blob): void;
    send(message: ArrayBuffer): void;
    send(message: ArrayBufferView): void;

    close();

    handleMessage(message: Message);
}