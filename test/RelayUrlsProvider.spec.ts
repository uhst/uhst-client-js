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
});
