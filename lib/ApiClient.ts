import {
  MessageHandler,
  MessageStream,
  RelayEventHandler,
  UhstRelayClient,
} from './contracts/UhstRelayClient';
import { HostConfiguration, ClientConfiguration } from './models';
import { RelayUrlsProvider } from './RelayUrlsProvider';
import { ApiRelayUrlsProvider } from './ApiRelayUrlsProvider';
import { RelayUrlsResolver } from './contracts/RelayUrlsResolver';
import { RelayClient } from './RelayClient';
import { RelayClientProvider } from './RelayClientProvider';
import { InvalidHostId, RelayUnreachable } from './UhstErrors';

export interface ApiClientOptions {
  /** API key (`uhst_dev_...`) for the hosted UHST API. */
  apiKey?: string;
  /** Override the API base URL (defaults to https://api.uhst.io). */
  apiUrl?: string;
}

export class ApiClient implements UhstRelayClient {
  relayUrlsProvider: RelayUrlsResolver;
  relayClient: RelayClient;
  constructor(
    private relayClientProvider: RelayClientProvider,
    relayUrlsProvider?: RelayUrlsResolver,
    options?: ApiClientOptions
  ) {
    if (relayUrlsProvider) {
      this.relayUrlsProvider = relayUrlsProvider;
    } else if (options?.apiKey) {
      // Discover relays through the hosted UHST API.
      this.relayUrlsProvider = new ApiRelayUrlsProvider(
        options.apiKey,
        options.apiUrl
      );
    } else {
      // Fall back to the public relays directory.
      this.relayUrlsProvider = new RelayUrlsProvider();
    }
  }

  async initHost(hostId?: string): Promise<HostConfiguration> {
    const relayUrl = await this.relayUrlsProvider.getBestRelayUrl(hostId);
    let hostConfiguration: HostConfiguration;
    let exception = new RelayUnreachable();
    try {
      this.relayClient = this.relayClientProvider.createRelayClient(relayUrl);
      hostConfiguration = await this.relayClient.initHost(hostId);
    } catch (e) {
      // handle network error here
      exception = e;
    }
    return new Promise<HostConfiguration>((resolve, reject) => {
      if (hostConfiguration) {
        resolve(hostConfiguration);
      } else {
        reject(exception);
      }
    });
  }

  async initClient(hostId: string): Promise<ClientConfiguration> {
    const relayUrls = await this.relayUrlsProvider.getRelayUrls(hostId);
    let clientConfiguration: ClientConfiguration;
    let exception = new RelayUnreachable();
    for (const url of relayUrls) {
      try {
        this.relayClient = this.relayClientProvider.createRelayClient(url);
        clientConfiguration = await this.relayClient.initClient(hostId);
        break;
      } catch (e) {
        // handle network error here
        exception = e;
        if (e instanceof InvalidHostId) {
          break;
        }
      }
    }
    return new Promise<ClientConfiguration>((resolve, reject) => {
      if (clientConfiguration) {
        resolve(clientConfiguration);
      } else {
        reject(exception);
      }
    });
  }

  sendMessage(token: string, message: any, sendUrl?: string): Promise<any> {
    return this.relayClient.sendMessage(token, message, sendUrl);
  }

  subscribeToMessages(
    token: string,
    messageHandler: MessageHandler,
    relayErrorHandler: Function,
    relayEventHandler: RelayEventHandler,
    receiveUrl?: string
  ): Promise<MessageStream> {
    return this.relayClient.subscribeToMessages(
      token,
      messageHandler,
      relayErrorHandler,
      relayEventHandler,
      receiveUrl
    );
  }
}
