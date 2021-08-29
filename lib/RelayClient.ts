import {
  UhstRelayClient,
  MessageHandler,
  MessageStream,
  RelayEventHandler,
} from './contracts/UhstRelayClient';
import { ClientConfiguration, HostConfiguration, Message, RelayEvent } from './models';
import {
  InvalidToken,
  InvalidHostId,
  HostIdAlreadyInUse,
  RelayError,
  RelayUnreachable,
  InvalidClientOrHostId,
  NetworkError,
} from './UhstErrors';
import { NetworkClient } from './NetworkClient';

export class RelayClient implements UhstRelayClient {
  networkClient: NetworkClient;
  constructor(private relayUrl: string, networkClient?: NetworkClient) {
    this.networkClient = networkClient ?? new NetworkClient();
  }

  async initHost(hostId?: string): Promise<HostConfiguration> {
    try {
      const hostConfig = await this.networkClient.post(
        this.relayUrl,
        hostId ? ['action=host', `hostId=${hostId}`] : ['action=host']
      );
      return hostConfig;
    } catch (error) {
      if (error instanceof NetworkError) {
        if (error.responseCode == 400) {
          throw new HostIdAlreadyInUse(error.message);
        } else {
          throw new RelayError(error.message);
        }
      } else {
        throw new RelayUnreachable(error);
      }
    }
  }

  async initClient(hostId: string): Promise<ClientConfiguration> {
    try {
      const clientConfig = await this.networkClient.post(this.relayUrl, [
        'action=join',
        `hostId=${hostId}`,
      ]);
      return clientConfig;
    } catch (error) {
      if (error instanceof NetworkError) {
        if (error.responseCode == 400) {
          throw new InvalidHostId(error.message);
        } else {
          throw new RelayError(error.message);
        }
      } else {
        throw new RelayUnreachable(error);
      }
    }
  }

  async sendMessage(
    token: string,
    message: any,
    sendUrl?: string
  ): Promise<any> {
    const url = sendUrl ?? this.relayUrl;
    try {
      const response = await this.networkClient.post(
        url,
        [`token=${token}`],
        message
      );
      return response;
    } catch (error) {
      if (error instanceof NetworkError) {
        if (error.responseCode == 400) {
          throw new InvalidClientOrHostId(error.message);
        } else if (error.responseCode == 401) {
          throw new InvalidToken(error.message);
        } else {
          throw new RelayError(`${error.responseCode} ${error.message}`);
        }
      } else {
        throw new RelayUnreachable(error);
      }
    }
  }

  subscribeToMessages(
    token: string,
    messageHandler: MessageHandler,
    relayErrorHandler: Function,
    relayEventHandler?: RelayEventHandler,
    receiveUrl?: string
  ): Promise<MessageStream> {
    const url = receiveUrl ?? this.relayUrl;
    return new Promise<MessageStream>((resolve, reject) => {
      let resolved = false;
      const stream = new EventSource(`${url}?token=${token}`);
      stream.onopen = () => {
        if (!resolved) {
          resolve(stream);
          resolved = true;
        }
      };
      stream.onerror = () => {
        if (!resolved) {
          // error on connect
          reject(new RelayError());
          resolved = true;
        } else if (relayErrorHandler) {
          relayErrorHandler(new RelayError());
        }
      };
      stream.addEventListener('message', (evt: MessageEvent) => {
        const message: Message = JSON.parse(evt.data);
        messageHandler(message);
      });
      if (relayEventHandler) {
        stream.addEventListener('relay_event', (evt: MessageEvent) => {
          const relayEvent: RelayEvent = JSON.parse(evt.data);
          relayEventHandler(relayEvent);
        });
      }
    });
  }
}
