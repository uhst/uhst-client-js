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
});