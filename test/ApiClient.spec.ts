import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { describe } from 'mocha';
import { stub } from 'sinon';
import { InvalidHostId, RelayClientProvider, RelayUnreachable } from '../lib';
import { ApiClient } from '../lib/ApiClient';
import { RelayClient } from '../lib/RelayClient';
import { ClientConfiguration, HostConfiguration } from '../lib/models';
import { RelayUrlsProvider } from '../lib/RelayUrlsProvider';

use(sinonChai);

describe('# ApiClient', () => {
  it('should create ApiClient', () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    expect(new ApiClient(mockRelayClientProvider)).to.not.be.null;
  });
  it('should initHost when working relay is available', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockHostConfiguration = <HostConfiguration>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelayUrlsProvider.getBestRelayUrl = stub().returns('testUrl');
    mockRelay.initHost = stub().returns(mockHostConfiguration);
    const hostConfiguration = await new ApiClient(
      mockRelayClientProvider,
      mockRelayUrlsProvider
    ).initHost();
    expect(hostConfiguration).to.equal(mockHostConfiguration);
    expect(mockRelayClientProvider.createRelayClient).to.have.been.calledWith(
      'testUrl'
    );
  });
  it('should throw RelayUnreachable when initHost and no relay is available', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayUrlsProvider.getBestRelayUrl = stub().throws(new RelayUnreachable());
    let exception: any;
    try {
      await new ApiClient(
        mockRelayClientProvider,
        mockRelayUrlsProvider
      ).initHost();
    } catch (e) {
      exception = e;
    }
    expect(exception).to.be.instanceOf(RelayUnreachable);
  });
  it('should rethrow InvalidHostId when initHost', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelayUrlsProvider.getBestRelayUrl = stub().returns('testUrl');
    mockRelay.initHost = stub().throws(new InvalidHostId());
    let exception: any;
    try {
      await new ApiClient(
        mockRelayClientProvider,
        mockRelayUrlsProvider
      ).initHost();
    } catch (e) {
      exception = e;
    }
    expect(exception).to.be.instanceOf(InvalidHostId);
  });
  it('should initClient when working relay is available', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockClientConfiguration = <ClientConfiguration>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelayUrlsProvider.getRelayUrls = stub().returns(['testUrl']);
    mockRelay.initClient = stub().returns(mockClientConfiguration);
    const clientConfiguration = await new ApiClient(
      mockRelayClientProvider,
      mockRelayUrlsProvider
    ).initClient('testHostId');
    expect(clientConfiguration).to.equal(mockClientConfiguration);
    expect(mockRelayClientProvider.createRelayClient).to.have.been.calledWith(
      'testUrl'
    );
  });
  it('should throw RelayUnreachable when initClient and no relay is available', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayUrlsProvider.getRelayUrls = stub().returns([]);
    let exception: any;
    try {
      await new ApiClient(
        mockRelayClientProvider,
        mockRelayUrlsProvider
      ).initClient('testHostId');
    } catch (e) {
      exception = e;
    }
    expect(exception).to.be.instanceOf(RelayUnreachable);
  });
  it('should rethrow InvalidHostId when initClient', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockRelayUrlsProvider = <RelayUrlsProvider>{};
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelayUrlsProvider.getRelayUrls = stub().returns(['testUrl']);
    mockRelay.initClient = stub().throws(new InvalidHostId());
    let exception: any;
    try {
      await new ApiClient(
        mockRelayClientProvider,
        mockRelayUrlsProvider
      ).initClient('testHostId');
    } catch (e) {
      exception = e;
    }
    expect(exception).to.be.instanceOf(InvalidHostId);
  });
});
