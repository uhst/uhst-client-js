import { expect, use } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { stub, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import { RelayClient } from '../lib/RelayClient';
import { NetworkClient } from '../lib/NetworkClient';
import { HostIdAlreadyInUse, RelayError, RelayUnreachable, InvalidHostId, InvalidClientOrHostId, InvalidToken, NetworkError } from '../lib/UhstErrors';

use(sinonChai);

describe('# RelayClient', () => {
    let relayClient: RelayClient;
    let mockNetworkClient: any;
    const relayUrl = 'http://test-relay.com';

    beforeEach(() => {
        mockNetworkClient = {
            post: stub(),
            get: stub()
        };
        relayClient = new RelayClient(relayUrl, mockNetworkClient as any);
    });

    describe('initHost', () => {
        it('should init host without hostId', async () => {
            const hostConfig = { hostId: 'new-id', hostToken: 'token' };
            mockNetworkClient.post.resolves(hostConfig);

            const result = await relayClient.initHost();

            expect(mockNetworkClient.post).to.have.been.calledWith(relayUrl, ['action=host']);
            expect(result).to.equal(hostConfig);
        });

        it('should init host with hostId', async () => {
            const hostConfig = { hostId: 'my-id', hostToken: 'token' };
            mockNetworkClient.post.resolves(hostConfig);

            const result = await relayClient.initHost('my-id');

            expect(mockNetworkClient.post).to.have.been.calledWith(relayUrl, ['action=host', 'hostId=my-id']);
            expect(result).to.equal(hostConfig);
        });

        it('should throw HostIdAlreadyInUse if status 400', async () => {
            mockNetworkClient.post.rejects(new NetworkError(400, 'Already in use'));

            try {
                await relayClient.initHost('my-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(HostIdAlreadyInUse);
            }
        });

        it('should throw RelayError if other NetworkError', async () => {
            mockNetworkClient.post.rejects(new NetworkError(500, 'Error'));

            try {
                await relayClient.initHost('my-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayError);
            }
        });

        it('should throw RelayUnreachable if non-NetworkError', async () => {
            mockNetworkClient.post.rejects(new Error('Unreachable'));

            try {
                await relayClient.initHost('my-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayUnreachable);
            }
        });
    });

    describe('initClient', () => {
        it('should init client', async () => {
            const clientConfig = { clientToken: 'token' };
            mockNetworkClient.post.resolves(clientConfig);

            const result = await relayClient.initClient('host-id');

            expect(mockNetworkClient.post).to.have.been.calledWith(relayUrl, ['action=join', 'hostId=host-id']);
            expect(result).to.equal(clientConfig);
        });

        it('should throw InvalidHostId if status 400', async () => {
            mockNetworkClient.post.rejects(new NetworkError(400, 'Invalid id'));

            try {
                await relayClient.initClient('host-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(InvalidHostId);
            }
        });

        it('should throw RelayError if other NetworkError', async () => {
            mockNetworkClient.post.rejects(new NetworkError(500, 'Error'));

            try {
                await relayClient.initClient('host-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayError);
            }
        });

        it('should throw RelayUnreachable if non-NetworkError', async () => {
            mockNetworkClient.post.rejects(new Error('Unreachable'));

            try {
                await relayClient.initClient('host-id');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayUnreachable);
            }
        });
    });

    describe('sendMessage', () => {
        it('should send message', async () => {
            mockNetworkClient.post.resolves({ success: true });

            const result = await relayClient.sendMessage('token', 'message');

            expect(mockNetworkClient.post).to.have.been.calledWith(relayUrl, ['token=token'], 'message');
            expect(result).to.deep.equal({ success: true });
        });

        it('should send message to specific URL', async () => {
            mockNetworkClient.post.resolves({ success: true });

            await relayClient.sendMessage('token', 'message', 'http://other.com');

            expect(mockNetworkClient.post).to.have.been.calledWith('http://other.com', ['token=token'], 'message');
        });

        it('should throw InvalidClientOrHostId if status 400', async () => {
            mockNetworkClient.post.rejects(new NetworkError(400, 'Invalid id'));

            try {
                await relayClient.sendMessage('token', 'msg');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(InvalidClientOrHostId);
            }
        });

        it('should throw InvalidToken if status 401', async () => {
            mockNetworkClient.post.rejects(new NetworkError(401, 'Invalid token'));

            try {
                await relayClient.sendMessage('token', 'msg');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(InvalidToken);
            }
        });

        it('should throw RelayError if other NetworkError', async () => {
            mockNetworkClient.post.rejects(new NetworkError(500, 'Error'));

            try {
                await relayClient.sendMessage('token', 'msg');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayError);
            }
        });

        it('should throw RelayUnreachable if non-NetworkError', async () => {
            mockNetworkClient.post.rejects(new Error('Unreachable'));

            try {
                await relayClient.sendMessage('token', 'msg');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayUnreachable);
            }
        });
    });

    describe('subscribeToMessages', () => {
        let mockEventSource: any;

        beforeEach(() => {
            mockEventSource = {
                onopen: null,
                onerror: null,
                addEventListener: stub(),
                close: stub()
            };
            (global as any).EventSource = stub().returns(mockEventSource);
        });

        afterEach(() => {
            delete (global as any).EventSource;
        });

        it('should subscribe and resolve on open', async () => {
            const promise = relayClient.subscribeToMessages('token', stub(), stub());
            
            mockEventSource.onopen();

            const stream = await promise;
            expect(stream).to.equal(mockEventSource);
            expect((global as any).EventSource).to.have.been.calledWith(`${relayUrl}?token=token`);
        });

        it('should subscribe to specific URL', async () => {
            const promise = relayClient.subscribeToMessages('token', stub(), stub(), undefined, 'http://receive.com');
            
            mockEventSource.onopen();

            await promise;
            expect((global as any).EventSource).to.have.been.calledWith(`http://receive.com?token=token`);
        });

        it('should reject on error during connection', async () => {
            const promise = relayClient.subscribeToMessages('token', stub(), stub());
            
            mockEventSource.onerror();

            try {
                await promise;
                expect.fail('Should have rejected');
            } catch (error) {
                expect(error).to.be.instanceOf(RelayError);
            }
        });

        it('should call relayErrorHandler on error after connection', async () => {
            const errorHandler = stub();
            const promise = relayClient.subscribeToMessages('token', stub(), errorHandler);
            
            mockEventSource.onopen();
            await promise;

            mockEventSource.onerror();
            expect(errorHandler).to.have.been.calledWith(sinon.match.instanceOf(RelayError));
        });

        it('should not throw if no relayErrorHandler after connection', async () => {
            const promise = relayClient.subscribeToMessages('token', stub(), null as any);
            
            mockEventSource.onopen();
            await promise;

            mockEventSource.onerror();
        });

        it('should handle message events', async () => {
            const messageHandler = stub();
            const promise = relayClient.subscribeToMessages('token', messageHandler, stub());
            
            mockEventSource.onopen();
            await promise;

            expect(mockEventSource.addEventListener).to.have.been.calledWith('message', sinon.match.func);
            const handler = mockEventSource.addEventListener.getCall(0).args[1];
            
            const eventData = { data: JSON.stringify({ body: 'test' }) };
            handler(eventData);

            expect(messageHandler).to.have.been.calledWith({ body: 'test' });
        });

        it('should handle relay events', async () => {
            const relayEventHandler = stub();
            const promise = relayClient.subscribeToMessages('token', stub(), stub(), relayEventHandler);
            
            mockEventSource.onopen();
            await promise;

            expect(mockEventSource.addEventListener).to.have.been.calledWith('relay_event', sinon.match.func);
            const handler = mockEventSource.addEventListener.getCall(1).args[1];
            
            const eventData = { data: JSON.stringify({ body: 'event' }) };
            handler(eventData);

            expect(relayEventHandler).to.have.been.calledWith({ body: 'event' });
        });
    });
});
