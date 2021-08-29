import {
  ClientConfiguration,
  HostConfiguration,
  Message,
  RelayEvent,
} from '../models';

export interface MessageHandler {
  (message: Message): void;
}

export interface RelayEventHandler {
  (event: RelayEvent): void;
}

export interface MessageStream {
  close(): void;
}
export interface UhstRelayClient {
  initHost(hostId?: string): Promise<HostConfiguration>;
  initClient(hostId: string): Promise<ClientConfiguration>;
  sendMessage(token: string, message: any, sendUrl?: string): Promise<any>;
  subscribeToMessages(
    token: string,
    messageHandler: MessageHandler,
    relayErrorHandler?: Function,
    relayEventHandler?: RelayEventHandler,
    receiveUrl?: string
  ): Promise<MessageStream>;
}
