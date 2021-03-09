import {
  MessageHandler,
  MessageStream,
  UhstRelayClient,
} from './contracts/UhstRelayClient';
import { HostConfiguration, ClientConfiguration, ApiResponse } from './models';
import { NetworkClient } from './NetworkClient';
import { RelayClient } from './RelayClient';
import { RelayClientProvider } from './RelayClientProvider';

const API_URL = 'https://api.uhst.io/v1/get-relay';

export class ApiClient implements UhstRelayClient {
  networkClient: NetworkClient;
  relayClient: RelayClient;
  constructor(
    private relayClientProvider: RelayClientProvider,
    networkClient?: NetworkClient
  ) {
    this.networkClient = networkClient ?? new NetworkClient();
  }

  async getRelayUrl(hostId?: string): Promise<string> {
    const apiResponse: ApiResponse = await this.networkClient.post(
      API_URL,
      hostId ? [`hostId=${hostId}`] : undefined
    );
    return apiResponse.url;
  }

  async initHost(hostId?: string): Promise<HostConfiguration> {
    this.relayClient = this.relayClientProvider.createRelayClient(
      await this.getRelayUrl(hostId)
    );
    return this.relayClient.initHost(hostId);
  }

  async initClient(hostId: string): Promise<ClientConfiguration> {
    this.relayClient = this.relayClientProvider.createRelayClient(
      await this.getRelayUrl(hostId)
    );
    return this.relayClient.initClient(hostId);
  }

  sendMessage(token: string, message: any, sendUrl?: string): Promise<any> {
    return this.relayClient.sendMessage(token, message, sendUrl);
  }

  subscribeToMessages(
    token: string,
    handler: MessageHandler,
    receiveUrl?: string
  ): Promise<MessageStream> {
    return this.relayClient.subscribeToMessages(token, handler, receiveUrl);
  }
}
