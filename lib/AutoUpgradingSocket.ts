import { EventEmitter } from 'inf-ee';
import { MessageStream, UhstRelayClient } from './contracts/UhstRelayClient';
import { SocketEventSet, UhstSocket } from './contracts/UhstSocket';
import {
  ClientSocketParams,
  HostSocketParams,
  Message,
  RelayEvent,
  RelayEventType,
  SocketTransport,
} from './models';

/**
 * Message envelope `type` markers exchanged over the relay. Application
 * payloads keep the historical `"string"` type so they stay compatible with
 * relay broadcasts; the rest are control/signaling messages handled internally.
 */
const ENVELOPE = {
  /** An application message: `{ type: "string", payload }`. */
  MESSAGE: 'string',
  /** Sent by a client once connected so the host learns about it and can
   * initiate the WebRTC upgrade. */
  HELLO: 'uhst-hello',
  /** WebRTC SDP offer (host -> client). */
  OFFER: 'uhst-webrtc-offer',
  /** WebRTC SDP answer (client -> host). */
  ANSWER: 'uhst-webrtc-answer',
  /** WebRTC ICE candidate (either direction). */
  ICE: 'uhst-webrtc-ice',
} as const;

const isRTCAvailable = (): boolean => typeof RTCPeerConnection !== 'undefined';

/**
 * A [[UhstSocket]] that always establishes a relay connection first and then,
 * transparently and automatically, tries to upgrade it to a direct WebRTC data
 * channel:
 *
 * - The **host** always attempts to upgrade every client that connects: as soon
 *   as a client announces itself it sends a WebRTC offer.
 * - The **client** answers any offer it receives and, once the data channel is
 *   open, application messages flow peer-to-peer.
 * - If WebRTC cannot be established (or later drops) the socket keeps/falls back
 *   to the relay, so messaging never breaks. Different clients of the same host
 *   can independently end up on WebRTC or the relay.
 *
 * The active transport is exposed via [[transport]] and the `transportchange`
 * event so the application can tell whether it is connected peer-to-peer or
 * through the relay.
 */
export class AutoUpgradingSocket implements UhstSocket {
  private _ee = new EventEmitter<SocketEventSet>();
  private _remoteId: string;
  private _transport: SocketTransport = 'relay';

  // Relay transport state.
  private token: string;
  private sendUrl?: string;
  private relayMessageStream?: MessageStream;

  // WebRTC upgrade state.
  private webrtcEnabled: boolean;
  private connection?: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private remoteDescriptionSet = false;
  private pendingCandidates: (RTCIceCandidate | RTCIceCandidateInit)[] = [];

  constructor(
    private relayClient: UhstRelayClient,
    private rtcConfiguration: RTCConfiguration,
    params: HostSocketParams | ClientSocketParams,
    webrtcEnabled: boolean,
    private debug: boolean
  ) {
    this.send = this.send.bind(this);
    this.close = this.close.bind(this);
    this.handleMessage = this.handleMessage.bind(this);

    this.webrtcEnabled = webrtcEnabled && isRTCAvailable();

    switch (params.type) {
      case 'client':
        this._remoteId = params.hostId;
        this.initClient(params.hostId);
        break;
      case 'host':
        this.token = params.token;
        this.sendUrl = params.sendUrl;
        this._remoteId = params.clientId;
        // The relay path is immediately usable; give the consumer a chance to
        // subscribe to "open" before it fires.
        setTimeout(() => {
          this._ee.emit('open');
          // The host always attempts to upgrade each client to WebRTC.
          this.startHostUpgrade();
        });
        break;
      default:
        throw Error('Unsupported Socket Parameters Type');
    }
  }

  get remoteId(): string {
    return this._remoteId;
  }

  get transport(): SocketTransport {
    return this._transport;
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
    // Prefer the direct WebRTC data channel when it is open.
    if (this._transport === 'webrtc' && this.dataChannel?.readyState === 'open') {
      try {
        this.dataChannel.send(message);
        if (this.debug) {
          this._ee.emit('diagnostic', 'Sent message over WebRTC: ' + message);
        }
        return;
      } catch (error) {
        // Fall through to the relay if the data channel send fails.
        if (this.debug) {
          this._ee.emit(
            'diagnostic',
            'WebRTC send failed, falling back to relay: ' + JSON.stringify(error)
          );
        }
        this.downgrade();
      }
    }
    await this.sendOverRelay(ENVELOPE.MESSAGE, message);
  }

  close() {
    this.relayMessageStream?.close();
    this.relayMessageStream = undefined;
    try {
      this.connection?.close();
    } catch {
      // ignore
    }
    this._ee.emit('close');
  }

  handleMessage = (message: Message) => {
    const body = message.body ?? {};
    switch (body.type) {
      case ENVELOPE.MESSAGE:
        if (this.debug) {
          this._ee.emit('diagnostic', 'Message received over relay: ' + body.payload);
        }
        this._ee.emit('message', body.payload);
        break;
      case ENVELOPE.HELLO:
        // A client announced itself; the host upgrade is kicked off from the
        // constructor, nothing else to do here.
        if (this.debug) {
          this._ee.emit('diagnostic', 'Received client hello.');
        }
        break;
      case ENVELOPE.OFFER:
        this.handleOffer(body.payload);
        break;
      case ENVELOPE.ANSWER:
        this.handleAnswer(body.payload);
        break;
      case ENVELOPE.ICE:
        this.handleRemoteIceCandidate(body.payload);
        break;
      default:
        if (this.debug) {
          this._ee.emit(
            'diagnostic',
            'Ignoring unknown relay message: ' + JSON.stringify(body)
          );
        }
    }
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
      this._ee.emit('diagnostic', 'Connection to relay dropped.');
    }
    this.close();
  }

  private async sendOverRelay(type: string, payload: any): Promise<void> {
    const envelope = { type, payload };
    try {
      await this.relayClient.sendMessage(this.token, envelope, this.sendUrl);
      if (this.debug && type === ENVELOPE.MESSAGE) {
        this._ee.emit('diagnostic', 'Sent message over relay: ' + payload);
      }
    } catch (error) {
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Failed sending over relay: ' + JSON.stringify(error)
        );
      }
      this._ee.emit('error', error as Error);
    }
  }

  private async initClient(hostId: string) {
    try {
      const config = await this.relayClient.initClient(hostId);
      if (this.debug) {
        this._ee.emit('diagnostic', 'Client configuration received from server.');
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
        this._ee.emit('diagnostic', 'Client subscribed to messages from server.');
      }
      // The relay connection is ready; announce ourselves so the host can
      // attempt a WebRTC upgrade, then let the consumer start sending.
      await this.sendOverRelay(ENVELOPE.HELLO, null);
      this._ee.emit('open');
    } catch (error) {
      this.relayMessageStream = undefined;
      if (this.debug) {
        this._ee.emit('diagnostic', 'Client failed: ' + JSON.stringify(error));
      }
      this._ee.emit('error', error as Error);
    }
  }

  // --- WebRTC upgrade -------------------------------------------------------

  private createConnection(): RTCPeerConnection {
    const connection = new RTCPeerConnection(this.rtcConfiguration);
    connection.onicecandidate = (ev) => {
      if (ev.candidate) {
        void this.sendOverRelay(ENVELOPE.ICE, ev.candidate);
      }
    };
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      if (this.debug) {
        this._ee.emit('diagnostic', 'WebRTC connection state: ' + state);
      }
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        // Lost the peer-to-peer path; the relay remains open as a fallback.
        this.downgrade();
      }
    };
    return connection;
  }

  /** Host side: proactively offer a WebRTC upgrade to the client. */
  private async startHostUpgrade() {
    if (!this.webrtcEnabled) {
      return;
    }
    try {
      this.connection = this.createConnection();
      this.dataChannel = this.connection.createDataChannel('uhst');
      this.configureDataChannel();
      const offer = await this.connection.createOffer();
      await this.connection.setLocalDescription(offer);
      await this.sendOverRelay(ENVELOPE.OFFER, offer);
      if (this.debug) {
        this._ee.emit('diagnostic', 'Host sent WebRTC offer.');
      }
    } catch (error) {
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Host WebRTC upgrade failed, staying on relay: ' + JSON.stringify(error)
        );
      }
    }
  }

  /** Client side: answer an offer received from the host. */
  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.webrtcEnabled) {
      return;
    }
    try {
      if (!this.connection) {
        this.connection = this.createConnection();
      }
      this.connection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.configureDataChannel();
      };
      await this.connection.setRemoteDescription(offer);
      this.remoteDescriptionSet = true;
      this.flushPendingCandidates();
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);
      await this.sendOverRelay(ENVELOPE.ANSWER, answer);
      if (this.debug) {
        this._ee.emit('diagnostic', 'Client answered WebRTC offer.');
      }
    } catch (error) {
      if (this.debug) {
        this._ee.emit(
          'diagnostic',
          'Client WebRTC upgrade failed, staying on relay: ' + JSON.stringify(error)
        );
      }
    }
  }

  /** Host side: apply the client's answer. */
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.connection) {
      return;
    }
    try {
      await this.connection.setRemoteDescription(answer);
      this.remoteDescriptionSet = true;
      this.flushPendingCandidates();
    } catch (error) {
      if (this.debug) {
        this._ee.emit('diagnostic', 'Failed applying WebRTC answer: ' + JSON.stringify(error));
      }
    }
  }

  private handleRemoteIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.connection) {
      return;
    }
    this.pendingCandidates.push(candidate);
    this.flushPendingCandidates();
  }

  private flushPendingCandidates() {
    if (!this.connection || !this.remoteDescriptionSet) {
      return;
    }
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        void this.connection.addIceCandidate(candidate);
      }
    }
  }

  private configureDataChannel() {
    if (!this.dataChannel) {
      return;
    }
    this.dataChannel.onopen = () => {
      this.upgrade();
    };
    this.dataChannel.onclose = () => {
      if (this.debug) {
        this._ee.emit('diagnostic', 'WebRTC data channel closed.');
      }
      this.downgrade();
    };
    this.dataChannel.onmessage = (event) => {
      if (this.debug) {
        this._ee.emit('diagnostic', 'Message received over WebRTC: ' + event.data);
      }
      this._ee.emit('message', event.data);
    };
  }

  private upgrade() {
    if (this._transport === 'webrtc') {
      return;
    }
    this._transport = 'webrtc';
    if (this.debug) {
      this._ee.emit('diagnostic', 'Connection upgraded to WebRTC.');
    }
    this._ee.emit('transportchange', 'webrtc');
  }

  private downgrade() {
    if (this._transport === 'relay') {
      return;
    }
    this._transport = 'relay';
    if (this.debug) {
      this._ee.emit('diagnostic', 'Connection fell back to the relay.');
    }
    this._ee.emit('transportchange', 'relay');
  }
}
