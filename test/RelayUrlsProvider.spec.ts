import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { describe } from 'mocha';
import { stub } from 'sinon';
import { NetworkClient } from '../lib';
import { RelayUrlsProvider } from '../lib/RelayUrlsProvider';
import { Relay } from '../lib/models';

use(sinonChai);

describe('# RelayUrlsProvider', () => {
  it('should create RelayUrlsProvider', () => {
    const mockNetworkClient = <NetworkClient>{};
    expect(new RelayUrlsProvider(mockNetworkClient)).to.not.be.null;
  });
  it('should getRelayUrls when hostId is provided and prefix exists', async () => {
    const urls = ['testUrl'];
    const relayListResponse = [
      <Relay>{
        prefix: 'test',
        urls,
      },
    ];
    const mockNetworkClient = <NetworkClient>{};
    mockNetworkClient.get = stub().returns(relayListResponse);
    const relayUrls = await new RelayUrlsProvider(
      mockNetworkClient
    ).getRelayUrls('test-1234');
    expect(mockNetworkClient.get).to.have.been.calledWith(
      'https://raw.githubusercontent.com/uhst/relays/main/list.json'
    );
    expect(relayUrls).to.equal(urls);
  });
  it('should return empty list when getRelayUrls and hostId prefix does not exist', async () => {
    const urls = ['testUrl'];
    const relayListResponse = [
      <Relay>{
        prefix: 'test',
        urls,
      },
    ];
    const mockNetworkClient = <NetworkClient>{};
    mockNetworkClient.get = stub().returns(relayListResponse);
    const relayUrls = await new RelayUrlsProvider(
      mockNetworkClient
    ).getRelayUrls('hello');
    expect(mockNetworkClient.get).to.have.been.calledWith(
      'https://raw.githubusercontent.com/uhst/relays/main/list.json'
    );
    expect(relayUrls.length).to.equal(0);
  });
  it('should get all relay URLs when hostId is not provided', async () => {
    const urls1 = ['testUrl1'];
    const urls2 = ['testUrl2'];
    const relayListResponse = [
      <Relay>{
        prefix: 'test1',
        urls: urls1,
      },
      <Relay>{
        prefix: 'test2',
        urls: urls2,
      },
    ];
    const mockNetworkClient = <NetworkClient>{};
    mockNetworkClient.get = stub().returns(relayListResponse);
    const relayUrls = await new RelayUrlsProvider(
      mockNetworkClient
    ).getRelayUrls();
    expect(relayUrls).to.deep.equal(['testUrl1', 'testUrl2']);
  });

  describe('getBestRelayUrl', () => {
    it('should throw RelayUnreachable if no URLs found', async () => {
        const mockNetworkClient = <NetworkClient>{};
        mockNetworkClient.get = stub().returns([]);
        try {
            await new RelayUrlsProvider(mockNetworkClient).getBestRelayUrl();
            expect.fail('Should have thrown');
        } catch (e) {
            expect(e.name).to.equal('RelayUnreachable');
        }
    });

    it('should return the first successful ping', async () => {
        const mockNetworkClient = <NetworkClient>{};
        const postStub = stub();
        mockNetworkClient.post = postStub as any;
        mockNetworkClient.get = stub().returns([
            { prefix: 'p', urls: ['url1', 'url2'] }
        ]);
        postStub.withArgs('url1').rejects(new Error());
        postStub.withArgs('url2').resolves({ success: true });

        const bestUrl = await new RelayUrlsProvider(mockNetworkClient).getBestRelayUrl();
        expect(bestUrl).to.equal('url2');
    });

    it('should reject if all pings fail', async () => {
        const mockNetworkClient = <NetworkClient>{};
        mockNetworkClient.get = stub().returns([
            { prefix: 'p', urls: ['url1'] }
        ]);
        const error = new Error('fail');
        mockNetworkClient.post = stub().rejects(error);

        try {
            await new RelayUrlsProvider(mockNetworkClient).getBestRelayUrl();
            expect.fail('Should have thrown');
        } catch (e) {
            expect(e).to.equal(error);
        }
    });

    it("should reject if two pings fail", async () => {
        const mockNetworkClient = <NetworkClient>{};
        mockNetworkClient.get = stub().returns([
            { prefix: 'p', urls: ['url1', 'url2'] }
        ]);
        const error = new Error('fail');
        mockNetworkClient.post = stub().rejects(error);

        try {
            await new RelayUrlsProvider(mockNetworkClient).getBestRelayUrl();
            expect.fail('Should have thrown');
        } catch (e) {
            // we expect the error from the last ping
            expect(e).to.equal(error);
        }
    });
  });
});
