// import sinonChai from "sinon-chai";
// import { expect, use } from "chai";
// import { describe } from "mocha";
// import { WebRTCSocketProvider } from "../lib/WebRTCSocketProvider";
// import { UhstApiClient } from "../lib/contracts/UhstApiClient";
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
//         expect(provider.createUhstSocket(<UhstApiClient>{}, <ClientSocketParams>{}, false)).to.not.be.null;
//     });

//     it("should create WebRTCSocket for host", () => {
//         const provider = new WebRTCSocketProvider();
//         expect(provider.createUhstSocket(<UhstApiClient>{}, <HostSocketParams>{}, false)).to.not.be.null;
//     });
// });