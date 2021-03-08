import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { describe } from 'mocha';
import { RelayClientProvider, UHST } from '../lib';
import { UhstSocketProvider } from '../lib/contracts/UhstSocketProvider';
import { ApiClient } from '../lib/ApiClient';
import { RelayClient } from '../lib/RelayClient';
import { ApiResponse, ClientConfiguration, HostConfiguration } from '../lib/models';
import { stub } from 'sinon';

use(sinonChai);

describe('# ApiClient', () => {
  it('should create ApiClient', () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    expect(new ApiClient(mockRelayClientProvider)).to.not.be.null;
  });
  it('should initHost without hostId', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockHostConfiguration = <HostConfiguration>{};
    const mockApiResponse = <ApiResponse>{
      url: 'testUrl',
    };
    const mockNetworkClient = {
      post: stub().returns(mockApiResponse),
    };
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelay.initHost = stub().returns(mockHostConfiguration);
    const hostConfiguration = await new ApiClient(
      mockRelayClientProvider,
      mockNetworkClient
    ).initHost();
    expect(hostConfiguration).to.equal(mockHostConfiguration);
    expect(mockNetworkClient.post).to.have.been.calledWith(
      'https://api.uhst.io/v1/get-relay'
    );
    expect(mockRelayClientProvider.createRelayClient).to.have.been.calledWith(
      'testUrl'
    );
  });
  it('should initHost with hostId', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockHostConfiguration = <HostConfiguration>{};
    const mockApiResponse = <ApiResponse>{
      url: 'testUrlWithHostId',
    };
    const mockNetworkClient = {
      post: stub().returns(mockApiResponse),
    };
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelay.initHost = stub().returns(mockHostConfiguration);
    const hostConfiguration = await new ApiClient(
      mockRelayClientProvider,
      mockNetworkClient
    ).initHost('testHostId');
    expect(hostConfiguration).to.equal(mockHostConfiguration);
    expect(
      mockNetworkClient.post
    ).to.have.been.calledWith('https://api.uhst.io/v1/get-relay', [
      'hostId=testHostId',
    ]);
    expect(mockRelayClientProvider.createRelayClient).to.have.been.calledWith(
      'testUrlWithHostId'
    );
  });
  it('should initClient with hostId', async () => {
    const mockRelayClientProvider = <RelayClientProvider>{};
    const mockRelay = <RelayClient>{};
    const mockClientConfiguration = <ClientConfiguration>{};
    const mockApiResponse = <ApiResponse>{
      url: 'testUrlWithHostId',
    };
    const mockNetworkClient = {
      post: stub().returns(mockApiResponse),
    };
    mockRelayClientProvider.createRelayClient = stub().returns(mockRelay);
    mockRelay.initClient = stub().returns(mockClientConfiguration);
    const clientConfiguration = await new ApiClient(
      mockRelayClientProvider,
      mockNetworkClient
    ).initClient('testHostId');
    expect(clientConfiguration).to.equal(mockClientConfiguration);
    expect(
      mockNetworkClient.post
    ).to.have.been.calledWith('https://api.uhst.io/v1/get-relay', [
      'hostId=testHostId',
    ]);
    expect(mockRelayClientProvider.createRelayClient).to.have.been.calledWith(
      'testUrlWithHostId'
    );
  });
});
