import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { stub } from 'sinon';
import { AutoUpgradingSocketProvider } from '../lib/AutoUpgradingSocketProvider';

use(sinonChai);

describe('# AutoUpgradingSocketProvider', () => {
  afterEach(() => {
    delete (global as any).RTCPeerConnection;
  });

  it('uses default STUN servers', () => {
    const provider = new AutoUpgradingSocketProvider();
    expect(provider.rtcConfiguration.iceServers).to.have.length(2);
    expect(provider.webrtcEnabled).to.equal(true);
  });

  it('accepts a custom RTCConfiguration and webrtc flag', () => {
    const config = { iceServers: [] };
    const provider = new AutoUpgradingSocketProvider(config, false);
    expect(provider.rtcConfiguration).to.equal(config);
    expect(provider.webrtcEnabled).to.equal(false);
  });

  it('creates an auto-upgrading socket', () => {
    (global as any).RTCPeerConnection = stub();
    const mockRelay: any = {
      initClient: stub().resolves({ clientToken: 't' }),
      subscribeToMessages: stub().resolves({ close: stub() }),
      sendMessage: stub().resolves(),
    };
    const provider = new AutoUpgradingSocketProvider();
    const socket = provider.createUhstSocket(
      mockRelay,
      { type: 'client', hostId: 'host1' },
      false
    );
    expect(socket).to.not.be.null;
    expect(socket.transport).to.equal('relay');
  });
});
