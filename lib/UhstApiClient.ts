import { ClientConfiguration, HostConfiguration, Message } from "./models";

export interface MessageHandler {
    (message: Message): void;
}
export interface UhstApiClient {
    initHost(hostId: string): Promise<HostConfiguration>;
    initClient(hostId: string): Promise<ClientConfiguration>;
    sendMessage(token: string, message: any, sendUrl?:string): Promise<any>;
    subscribeToMessages(token: string, handler: MessageHandler, receiveUrl?: string): void;
}