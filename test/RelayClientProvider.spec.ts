import { expect } from 'chai';
import { describe } from 'mocha';
import { RelayClientProvider } from '../lib/RelayClientProvider';
import { RelayClient } from '../lib/RelayClient';

describe('# RelayClientProvider', () => {
    it('should create RelayClient', () => {
        const provider = new RelayClientProvider();
        const client = provider.createRelayClient('http://test.com');
        expect(client).to.be.instanceOf(RelayClient);
    });
});
