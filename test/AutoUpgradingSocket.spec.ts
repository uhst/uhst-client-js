import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { stub } from 'sinon';
import { AutoUpgradingSocket } from '../lib/AutoUpgradingSocket';

use(sinonChai);

const OFFER = { type: 'offer', sdp: 'sdp-offer' };
const ANSWER = { type: 'answer', sdp: 'sdp-answer' };

describe('# AutoUpgradingSocket', () => {
  let mockRelay: any;
  let mockConnection: any;
  let mockDataChannel: any;

  beforeEach(() => {
    mockRelay = {
      initClient: stub().resolves({
        clientToken: 'client-token',
        sendUrl: 'send-url',
        receiveUrl: 'receive-url',
      }),
      subscribeToMessages: stub().resolves({ close: stub() }),
      sendMessage: stub().resolves(),
    };
    mockDataChannel = { send: stub(), close: stub(), readyState: 'open' };
    mockConnection = {
      createOffer: stub().resolves(OFFER),
      createAnswer: stub().resolves(ANSWER),
      setLocalDescription: stub().resolves(),
      setRemoteDescription: stub().resolves(),
      addIceCandidate: stub().resolves(),
      createDataChannel: stub().returns(mockDataChannel),
      close: stub(),
      connectionState: 'connected',
    };
    (global as any).RTCPeerConnection = stub().returns(mockConnection);
  });

  afterEach(() => {
    delete (global as any).RTCPeerConnection;
  });

  it('starts a client connection on the relay and announces itself', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'client', hostId: 'host1' },
      true,
      false
    );
    expect(socket.remoteId).to.equal('host1');
    socket.on('open', () => {
      expect(socket.transport).to.equal('relay');
      // a hello envelope was sent to the host
      expect(mockRelay.sendMessage).to.have.been.calledWith(
        'client-token',
        { type: 'uhst-hello', payload: null },
        'send-url'
      );
      done();
    });
  });

  it('upgrades the client to WebRTC when an offer arrives', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'client', hostId: 'host1' },
      true,
      false
    );
    socket.on('transportchange', (transport) => {
      expect(transport).to.equal('webrtc');
      expect(socket.transport).to.equal('webrtc');
      done();
    });
    socket.on('open', () => {
      socket.handleMessage({ body: { type: 'uhst-webrtc-offer', payload: OFFER } } as any);
      setTimeout(() => {
        expect(mockConnection.setRemoteDescription).to.have.been.calledWith(OFFER);
        expect(mockConnection.createAnswer).to.have.been.called;
        expect(mockRelay.sendMessage).to.have.been.calledWith(
          'client-token',
          { type: 'uhst-webrtc-answer', payload: ANSWER },
          'send-url'
        );
        // simulate the data channel opening
        mockConnection.ondatachannel({ channel: mockDataChannel });
        mockDataChannel.onopen();
      }, 5);
    });
  });

  it('host emits open, offers an upgrade and applies the answer', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'host', token: 'resp-token', clientId: 'client1', sendUrl: 'send-url' },
      true,
      false
    );
    expect(socket.remoteId).to.equal('client1');
    socket.on('open', () => {
      expect(socket.transport).to.equal('relay');
      setTimeout(() => {
        expect(mockConnection.createDataChannel).to.have.been.calledWith('uhst');
        expect(mockRelay.sendMessage).to.have.been.calledWith(
          'resp-token',
          { type: 'uhst-webrtc-offer', payload: OFFER },
          'send-url'
        );
        // client answers
        socket.handleMessage({ body: { type: 'uhst-webrtc-answer', payload: ANSWER } } as any);
        // data channel opens -> upgrade
        mockDataChannel.onopen();
      }, 5);
    });
    socket.on('transportchange', (transport) => {
      expect(transport).to.equal('webrtc');
      done();
    });
  });

  it('sends over the relay before upgrade and over WebRTC after', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'host', token: 'resp-token', clientId: 'client1', sendUrl: 'send-url' },
      true,
      false
    );
    socket.on('open', async () => {
      await socket.send('before');
      expect(mockRelay.sendMessage).to.have.been.calledWith(
        'resp-token',
        { type: 'string', payload: 'before' },
        'send-url'
      );
      setTimeout(async () => {
        mockDataChannel.onopen();
        await socket.send('after');
        expect(mockDataChannel.send).to.have.been.calledWith('after');
        done();
      }, 5);
    });
  });

  it('emits messages received over the relay and ignores hello/unknown', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'host', token: 'resp-token', clientId: 'client1', sendUrl: 'send-url' },
      true,
      false
    );
    const messages: any[] = [];
    socket.on('message', (m) => messages.push(m));
    socket.handleMessage({ body: { type: 'uhst-hello', payload: null } } as any);
    socket.handleMessage({ body: { type: 'something-else' } } as any);
    socket.handleMessage({ body: { type: 'string', payload: 'hello world' } } as any);
    setTimeout(() => {
      expect(messages).to.deep.equal(['hello world']);
      done();
    }, 5);
  });

  it('falls back to the relay when the data channel closes', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'host', token: 'resp-token', clientId: 'client1', sendUrl: 'send-url' },
      true,
      false
    );
    socket.on('open', () => {
      setTimeout(() => {
        mockDataChannel.onopen();
        expect(socket.transport).to.equal('webrtc');
        mockDataChannel.onclose();
        expect(socket.transport).to.equal('relay');
        done();
      }, 5);
    });
  });

  it('stays on the relay when WebRTC is disabled', (done) => {
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'host', token: 'resp-token', clientId: 'client1', sendUrl: 'send-url' },
      false,
      false
    );
    socket.on('open', () => {
      setTimeout(() => {
        expect(mockConnection.createDataChannel).to.not.have.been.called;
        expect(socket.transport).to.equal('relay');
        done();
      }, 5);
    });
  });

  it('closes the relay stream and the peer connection', (done) => {
    const stream = { close: stub() };
    mockRelay.subscribeToMessages.resolves(stream);
    const socket = new AutoUpgradingSocket(
      mockRelay,
      {},
      { type: 'client', hostId: 'host1' },
      true,
      false
    );
    socket.on('open', () => {
      socket.on('close', () => {
        expect(stream.close).to.have.been.called;
        done();
      });
      socket.close();
    });
  });

  it('throws on unsupported params', () => {
    expect(
      () =>
        new AutoUpgradingSocket(mockRelay, {}, { type: 'bogus' } as any, true, false)
    ).to.throw();
  });
});
