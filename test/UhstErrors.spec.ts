import { expect } from "chai";
import { describe } from "mocha";
import * as Errors from "../lib/UhstErrors";

describe("# UhstErrors", () => {
    it("should create all errors with and without message", () => {
        const errorClasses = [
            Errors.InvalidToken,
            Errors.InvalidHostId,
            Errors.HostIdAlreadyInUse,
            Errors.InvalidClientOrHostId,
            Errors.RelayUnreachable,
            Errors.RelayError,
            Errors.NetworkUnreachable
        ];

        errorClasses.forEach(Err => {
            const e1 = new Err();
            expect(e1).to.be.instanceOf(Error);
            const e2 = new Err("msg");
            expect(e2.message).to.equal("msg");
        });

        const ne1 = new Errors.NetworkError(404);
        expect(ne1.responseCode).to.equal(404);
        const ne2 = new Errors.NetworkError(500, "err");
        expect(ne2.message).to.equal("err");
    });
});
