export type SocketEventSet = {
    open: () => void,
    message: (data: any) => void
}

export interface UhstSocket {
    on<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]): void;
    once<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]): void;
    off<EventName extends keyof SocketEventSet>(eventName: EventName, handler: SocketEventSet[EventName]): void;
    send(message: string): void;
}