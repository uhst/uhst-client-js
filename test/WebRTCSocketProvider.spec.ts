import { expect, use } from "chai";
import { describe } from "mocha";
import { stub } from "sinon";
import sinonChai from "sinon-chai";
import { WebRTCSocketProvider } from "../lib/WebRTCSocketProvider";
import { UhstRelayClient } from "../lib/contracts/UhstRelayClient";
import { ClientSocketParams, HostSocketParams } from "../lib/models";

use(sinonChai);

describe("# WebRTCSocketProvider", () => {
    beforeEach(() => {
        (global as any).RTCPeerConnection = stub().returns({
            close: stub()
        });
    });

    afterEach(() => {
        delete (global as any).RTCPeerConnection;
    });

    it("should create WebRTCSocketProvider", () => {
        expect(new WebRTCSocketProvider()).to.not.be.null;
    });

    it("should accept RTCConfiguration", () => {
        const config: RTCConfiguration = { iceServers: [] };
        const provider = new WebRTCSocketProvider(config);
        expect(provider.rtcConfiguration).to.equal(config);
    });

    it("should create WebRTCSocket for client", () => {
        const provider = new WebRTCSocketProvider();
        const socket = provider.createUhstSocket(<UhstRelayClient>{}, <ClientSocketParams>{ type: "client", hostId: "host" }, false);
        expect(socket).to.not.be.null;
    });

    it("should create WebRTCSocket for host", () => {
        const provider = new WebRTCSocketProvider();
        const socket = provider.createUhstSocket(<UhstRelayClient>{}, <HostSocketParams>{ type: "host", token: "token", clientId: "client" }, false);
        expect(socket).to.not.be.null;
    });
});
