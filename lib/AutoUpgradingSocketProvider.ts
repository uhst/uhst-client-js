import { UhstRelayClient } from './contracts/UhstRelayClient';
import { UhstSocket } from './contracts/UhstSocket';
import { UhstSocketProvider } from './contracts/UhstSocketProvider';
import { ClientSocketParams, HostSocketParams } from './models';
import { AutoUpgradingSocket } from './AutoUpgradingSocket';

/**
 * Default [[UhstSocketProvider]]. Produces [[AutoUpgradingSocket]]s, which start
 * on the relay and automatically try to upgrade each connection to a direct
 * WebRTC data channel, falling back to the relay when WebRTC is unavailable.
 */
export class AutoUpgradingSocketProvider implements UhstSocketProvider {
  /**
   * Passed to every `RTCPeerConnection`. Most importantly allows specifying
   * `iceServers` for NAT traversal.
   */
  rtcConfiguration: RTCConfiguration;

  /**
   * Whether to attempt WebRTC upgrades at all. When false (or when no WebRTC
   * implementation is available) every connection stays on the relay.
   */
  webrtcEnabled: boolean;

  constructor(configuration?: RTCConfiguration, webrtcEnabled: boolean = true) {
    this.rtcConfiguration = configuration ?? {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    };
    this.webrtcEnabled = webrtcEnabled;
  }

  createUhstSocket(
    relayClient: UhstRelayClient,
    params: ClientSocketParams | HostSocketParams,
    debug: boolean
  ): UhstSocket {
    return new AutoUpgradingSocket(
      relayClient,
      this.rtcConfiguration,
      params,
      this.webrtcEnabled,
      debug
    );
  }
}
