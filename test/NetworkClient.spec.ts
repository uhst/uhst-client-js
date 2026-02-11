import { expect, use } from 'chai';
import { describe } from 'mocha';
import { stub, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import { NetworkClient } from '../lib/NetworkClient';
import { NetworkError, NetworkUnreachable } from '../lib/UhstErrors';

use(sinonChai);

describe('# NetworkClient', () => {
    let networkClient: NetworkClient;
    let fetchStub: SinonStub;
    let abortControllerStub: any;

    beforeEach(() => {
        networkClient = new NetworkClient();
        (global as any).fetch = stub();
        fetchStub = (global as any).fetch;
        abortControllerStub = {
            abort: stub(),
            signal: {}
        };
        (global as any).AbortController = stub().returns(abortControllerStub);
    });

    afterEach(() => {
        delete (global as any).fetch;
        delete (global as any).AbortController;
    });

    describe('fetchWithTimeout', () => {
        it('should fetch with signal', async () => {
            fetchStub.resolves({ status: 200 });
            await networkClient.fetchWithTimeout('http://example.com', { timeout: 1000 });
            expect(fetchStub).to.have.been.calledWith('http://example.com', {
                timeout: 1000,
                signal: abortControllerStub.signal
            });
        });

        it('should use default timeout', async () => {
            fetchStub.resolves({ status: 200 });
            await networkClient.fetchWithTimeout('http://example.com', {});
            expect(fetchStub).to.have.been.called;
        });
    });

    describe('post', () => {
        it('should perform a POST request', async () => {
            const mockResponse = {
                status: 200,
                json: stub().resolves({ success: true })
            };
            fetchStub.resolves(mockResponse);

            const result = await networkClient.post('http://example.com', ['a=1'], { data: 'test' });

            expect(fetchStub).to.have.been.calledWith('http://example.com?a=1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: 'test' })
            });
            expect(result).to.deep.equal({ success: true });
        });

        it('should perform a POST request with timeout', async () => {
            const mockResponse = {
                status: 200,
                json: stub().resolves({ success: true })
            };
            fetchStub.resolves(mockResponse);

            const result = await networkClient.post('http://example.com', undefined, undefined, 1000);

            expect(fetchStub).to.have.been.called;
            expect(result).to.deep.equal({ success: true });
        });

        it('should perform a POST request without body or queryParams', async () => {
            const mockResponse = {
                status: 200,
                json: stub().resolves({ success: true })
            };
            fetchStub.resolves(mockResponse);

            const result = await networkClient.post('http://example.com');

            expect(fetchStub).to.have.been.calledWith('http://example.com', {
                method: 'POST'
            });
            expect(result).to.deep.equal({ success: true });
        });

        it('should throw NetworkError if status is not 200', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found'
            };
            fetchStub.resolves(mockResponse);

            try {
                await networkClient.post('http://example.com');
                expect.fail('Should have thrown NetworkError');
            } catch (error) {
                expect(error).to.be.instanceOf(NetworkError);
                expect(error.responseCode).to.equal(404);
                expect(error.message).to.equal('Not Found');
            }
        });

        it('should throw NetworkUnreachable if fetch fails', async () => {
            fetchStub.rejects(new Error('Network failure'));

            try {
                await networkClient.post('http://example.com');
                expect.fail('Should have thrown NetworkUnreachable');
            } catch (error) {
                expect(error).to.be.instanceOf(NetworkUnreachable);
            }
        });
    });

    describe('get', () => {
        it('should perform a GET request', async () => {
            const mockResponse = {
                status: 200,
                json: stub().resolves({ success: true })
            };
            fetchStub.resolves(mockResponse);

            const result = await networkClient.get('http://example.com', ['a=1']);

            expect(fetchStub).to.have.been.calledWith('http://example.com?a=1');
            expect(result).to.deep.equal({ success: true });
        });

        it('should perform a GET request with timeout', async () => {
            const mockResponse = {
                status: 200,
                json: stub().resolves({ success: true })
            };
            fetchStub.resolves(mockResponse);

            const result = await networkClient.get('http://example.com', undefined, 1000);

            expect(fetchStub).to.have.been.called;
            expect(result).to.deep.equal({ success: true });
        });

        it('should throw NetworkError if status is not 200', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error'
            };
            fetchStub.resolves(mockResponse);

            try {
                await networkClient.get('http://example.com');
                expect.fail('Should have thrown NetworkError');
            } catch (error) {
                expect(error).to.be.instanceOf(NetworkError);
                expect(error.responseCode).to.equal(500);
            }
        });

        it('should throw NetworkUnreachable if fetch fails', async () => {
            fetchStub.rejects(new Error('Network failure'));

            try {
                await networkClient.get('http://example.com');
                expect.fail('Should have thrown NetworkUnreachable');
            } catch (error) {
                expect(error).to.be.instanceOf(NetworkUnreachable);
            }
        });
    });
});
