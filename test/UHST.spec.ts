import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { describe } from "mocha";
import { UHST } from "../lib";
import { UhstSocketProvider } from "../lib/contracts/UhstSocketProvider";

use(sinonChai);


describe("# UHST", () => {
    it("should create UHST", () => {
        expect(new UHST()).to.not.be.null;
    });
    it("should accept socketProvider", () => {
        const mockSocketProvider: UhstSocketProvider = <UhstSocketProvider>{};
        expect(new UHST({ socketProvider: mockSocketProvider })).to.not.be.null;
    });
        it("should accept relayUrl", () => {
            const relayUrl = "test"
            expect(new UHST({ relayUrl: relayUrl })).to.not.be.null;
        });
        it("should accept relayClient", () => {
            const mockRelayClient = <any>{};
            expect(new UHST({ relayClient: mockRelayClient })).to.not.be.null;
        });
        it("should join", () => {
            const mockSocketProvider = <any>{ createUhstSocket: (r, p, d) => ({}) };
            const uhst = new UHST({ socketProvider: mockSocketProvider });
            expect(uhst.join("host1")).to.not.be.null;
        });
        it("should host", () => {
            const uhst = new UHST();
            expect(uhst.host("host1")).to.not.be.null;
        });
    });
    