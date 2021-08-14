import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { describe } from "mocha";
import { RelaySocketProvider } from "../lib/RelaySocketProvider";
import { UhstRelayClient } from "../lib/contracts/UhstRelayClient";
import { ClientSocketParams, HostSocketParams } from "../lib/models";

use(sinonChai);
describe("# RelaySocketProvider", () => {
    it("should create RelaySocketProvider", () => {
        expect(new RelaySocketProvider()).to.not.be.null;
    });

    it("should create RelaySocket for client", () => {
        const provider = new RelaySocketProvider();
        const mockClientSocketParams:ClientSocketParams = {
            type: "client",
            hostId: "testHostId"
        };
        expect(provider.createUhstSocket(<UhstRelayClient>{}, mockClientSocketParams, false)).to.not.be.null;
    });

    it("should create RelaySocket for host", () => {
        const provider = new RelaySocketProvider();
        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            clientId: "testClient",
            token: "responseToken"
        };
        expect(provider.createUhstSocket(<UhstRelayClient>{}, mockHostSocketParams, false)).to.not.be.null;
    });
});