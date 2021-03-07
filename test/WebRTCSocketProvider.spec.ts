// import sinonChai from "sinon-chai";
// import { expect, use } from "chai";
// import { describe } from "mocha";
// import { WebRTCSocketProvider } from "../lib/WebRTCSocketProvider";
// import { UhstRelayClient } from "../lib/contracts/UhstRelayClient";
// import { ClientSocketParams, HostSocketParams } from "../lib/models";

// use(sinonChai);
// describe("# WebRTCTransportProvider", () => {
//     it("should create WebRTCTransportProvider", () => {
//         expect(new WebRTCSocketProvider()).to.not.be.null;
//     });

//     it("should accept RTCConfiguration", () => {
//         expect(new WebRTCSocketProvider(<RTCConfiguration>{})).to.not.be.null;
//     });

//     it("should create WebRTCSocket for client", () => {
//         const provider = new WebRTCSocketProvider();
//         expect(provider.createUhstSocket(<UhstRelayClient>{}, <ClientSocketParams>{}, false)).to.not.be.null;
//     });

//     it("should create WebRTCSocket for host", () => {
//         const provider = new WebRTCSocketProvider();
//         expect(provider.createUhstSocket(<UhstRelayClient>{}, <HostSocketParams>{}, false)).to.not.be.null;
//     });
// });