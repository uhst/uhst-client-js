import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { stub } from 'sinon';
import { NetworkClient } from '../lib/NetworkClient';
import { ApiRelayUrlsProvider } from '../lib/ApiRelayUrlsProvider';

use(sinonChai);

describe('# ApiRelayUrlsProvider', () => {
  it('resolves a single server by host prefix', async () => {
    const net = <NetworkClient>{};
    net.get = stub().resolves({ prefix: '1202', hostname: 'relay.example.com', lastSeenAt: 1 });
    const urls = await new ApiRelayUrlsProvider('uhst_dev_x', undefined, net).getRelayUrls(
      '1202-abcd'
    );
    expect(net.get).to.have.been.calledWith(
      'https://api.uhst.io/v1/client/server',
      ['prefix=1202'],
      undefined,
      { 'X-Api-Key': 'uhst_dev_x' }
    );
    expect(urls).to.deep.equal(['https://relay.example.com/']);
  });

  it('returns an empty list when the prefix is unknown', async () => {
    const net = <NetworkClient>{};
    net.get = stub().rejects(new Error('404'));
    const urls = await new ApiRelayUrlsProvider('uhst_dev_x', undefined, net).getRelayUrls(
      '9999-abcd'
    );
    expect(urls).to.deep.equal([]);
  });

  it('lists every available server when no hostId is given', async () => {
    const net = <NetworkClient>{};
    net.get = stub().resolves({
      servers: [
        { prefix: '1202', hostname: 'a.example.com' },
        { prefix: '4420', hostname: 'b.example.com' },
      ],
    });
    const urls = await new ApiRelayUrlsProvider(
      'uhst_dev_x',
      'https://staging.uhst.io/',
      net
    ).getRelayUrls();
    expect(net.get).to.have.been.calledWith(
      'https://staging.uhst.io/v1/client/server',
      undefined,
      undefined,
      { 'X-Api-Key': 'uhst_dev_x' }
    );
    expect(urls).to.deep.equal([
      'https://a.example.com/',
      'https://b.example.com/',
    ]);
  });

  it('tolerates an unreachable API when listing servers', async () => {
    const net = <NetworkClient>{};
    net.get = stub().rejects(new Error('down'));
    const urls = await new ApiRelayUrlsProvider('uhst_dev_x', undefined, net).getRelayUrls();
    expect(urls).to.deep.equal([]);
  });

  it('throws RelayUnreachable from getBestRelayUrl when no servers exist', async () => {
    const net = <NetworkClient>{};
    net.get = stub().resolves({ servers: [] });
    try {
      await new ApiRelayUrlsProvider('uhst_dev_x', undefined, net).getBestRelayUrl();
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.name).to.equal('RelayUnreachable');
    }
  });

  it('returns the first relay that responds to a ping', async () => {
    const net = <NetworkClient>{};
    net.get = stub().resolves({
      servers: [
        { prefix: '1202', hostname: 'a.example.com' },
        { prefix: '4420', hostname: 'b.example.com' },
      ],
    });
    const post = stub();
    post.withArgs('https://a.example.com/').rejects(new Error('slow'));
    post.withArgs('https://b.example.com/').resolves({ pong: 1 });
    net.post = post as any;
    const best = await new ApiRelayUrlsProvider('uhst_dev_x', undefined, net).getBestRelayUrl();
    expect(best).to.equal('https://b.example.com/');
  });
});
