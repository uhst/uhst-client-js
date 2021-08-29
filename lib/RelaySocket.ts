import { EventEmitter } from 'inf-ee';
import { MessageStream, UhstRelayClient } from './contracts/UhstRelayClient';
import { SocketEventSet, UhstSocket } from './contracts/UhstSocket';
import { ClientSocketParams, HostSocketParams, Message, RelayEvent, RelayEventType } from './models';

export class RelaySocket implements UhstSocket {
  private _ee = new EventEmitter<SocketEventSet>();
  private token: string;
  private _remoteId: string;
  private relayMessageStream?: MessageStream;
  private sendUrl?: string;

  constructor(
    private relayClient: UhstRelayClient,
    params: HostSocketParams | ClientSocketParams,
    private debug: boolean
  ) {
    this.send = this.send.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.close = this.close.bind(this);

    switch (params.type) {
      case 'client':
        // will connect to host
        this.initClient(params.hostId);
        this._remoteId = params.hostId;
        break;
      case 'host':
        // client connected
        this.token = params.token;
        this.sendUrl = params.sendUrl;
        this._remoteId = params.clientId;
        // give consumer a chance to subscribe to open event
        setTimeout(() => {
          this._ee.emit('open');
        });
        break;
      default:
        throw Error('Unsupported Socket Parameters Type');
    }
  }
  get remoteId(): string {
    return this._remoteId;
  }

  on<EventName extends keyof SocketEventSet>(
    eventName: EventName,
    handler: SocketEventSet[EventName]
  ) {
    this._ee.on(eventName, handler);
  }

  once<EventName extends keyof SocketEventSet>(
    eventName: EventName,
    handler: SocketEventSet[EventName]
  ) {
    this._ee.once(eventName, handler);
  }

  off<EventName extends keyof SocketEventSet>(
    eventName: EventName,
    handler: SocketEventSet[EventName]
  ) {
    this._ee.off(eventName, handler);
  }

  send(message: string): Promise<any>;
  send(message: Blob): Promise<any>;
  send(message: ArrayBuffer): Promise<any>;
  send(message: ArrayBufferView): Promise<any>;
  async send(message: any): Promise<any> {
    const envelope = {
      type: 'string',
      payload: message,
    };
    try {
      await this.relayClient.sendMessage(this.token, envelope, this.sendUrl);
      if (this.debug) {
        this._ee.emit('diagnostic', 'Sent message ' + message);
      }
    } catch (error) {
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Failed sending message: ' + JSON.stringify(error)
        );
      }
      this._ee.emit('error', error);
    }
  }

  close() {
    this.relayMessageStream?.close();
    this._ee.emit('close');
  }

  handleMessage = (message: Message) => {
    const payload = message.body.payload;
    if (this.debug) {
      this._ee.emit('diagnostic', 'Message received: ' + payload);
    }
    this._ee.emit('message', payload);
  }

  handleRelayEvent = (event: RelayEvent) => {
    if (event.eventType === RelayEventType.HOST_CLOSED) {
      if (this.debug) {
        this._ee.emit('diagnostic', 'Host disconnected from relay.');
      }
      this.close();
    }
  }

  handleRelayError = () => {
    if (this.debug) {
      this._ee.emit('diagnostic', 'Client connection to relay dropped.');
    }
    this.close();
  }

  private async initClient(hostId: string) {
    try {
      const config = await this.relayClient.initClient(hostId);
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Client configuration received from server.'
        );
      }
      this.token = config.clientToken;
      this.sendUrl = config.sendUrl;
      this.relayMessageStream = await this.relayClient.subscribeToMessages(
        config.clientToken,
        this.handleMessage,
        this.handleRelayError,
        this.handleRelayEvent,
        config.receiveUrl
      );
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Client subscribed to messages from server.'
        );
      }
      this._ee.emit('open');
    } catch (error) {
      this.relayMessageStream = undefined;
      if (this.debug) {
        this._ee.emit('diagnostic', 'Client failed: ' + JSON.stringify(error));
      }
      this._ee.emit('error', error);
    }
  }
}
