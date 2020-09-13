import { expect } from 'chai';
import { describe } from 'mocha';
import { UHST } from '../lib';

describe('# index', () => {
    it('should export UHST constructor', () => {
        expect(new UHST()).to.not.be.null;
    });
});