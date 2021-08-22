// import { expect } from "chai";
// import { stub } from "sinon";
// import { UhstRelayClient } from "../lib/contracts/UhstRelayClient";
// import { ClientConfiguration, HostConfiguration, HostMessage } from "../lib/models";
// import { WebRTCSocket } from "../lib/WebRTCSocket";

// describe("# WebRTCSocket", () => {
//     it("can connect as host", (done) => {
//         const mockRelay = <UhstRelayClient>{};
//         const mockConfig: RTCConfiguration = <RTCConfiguration>{};
//         const mockOffer: RTCSessionDescriptionInit = { type: "offer" };
//         const mockAnswer: RTCSessionDescriptionInit = { type: "answer" };
//         const mockLocalCandidate: RTCIceCandidateInit = {};
//         const mockRemoteCandidate: RTCIceCandidateInit = {};
//         const mockDataChannel: RTCDataChannel = <RTCDataChannel>{};
//         const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";
//         let messageHandler: Function;
//         const connection = <RTCPeerConnection>{
//             createAnswer: (): Promise<RTCSessionDescriptionInit> => {
//                 return new Promise<RTCSessionDescriptionInit>((resolve) => {
//                     resolve(mockAnswer);
//                 });
//             },
//             setLocalDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
//                 return new Promise<void>((resolve) => {
//                     expect(description).to.equal(mockAnswer);
//                     resolve();
//                 });
//             },
//             setRemoteDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
//                 return new Promise<void>((resolve) => {
//                     expect(description).to.equal(mockOffer);
//                     if (connection.onicecandidate) {
//                         connection.onicecandidate(<RTCPeerConnectionIceEvent>{
//                             candidate: mockLocalCandidate
//                         });
//                         resolve();
//                     } else {
//                         throw new Error("onicecandidate is not overriden!");
//                     }
//                 });
//             },
//             addIceCandidate: (candidate: RTCIceCandidate): Promise<void> => {
//                 return new Promise<void>((resolve) => {
//                     expect(candidate).to.equal(mockRemoteCandidate);
//                     resolve();
//                 });
//             }
//         };
//         (global as any).RTCPeerConnection = (config: RTCConfiguration): RTCPeerConnection => {
//             expect(config).to.equal(mockConfig);
//             return connection;
//         }
//         mockRelay.sendMessage = (responseToken, message, sendUrl): Promise<void> => {
//             expect(responseToken).to.equal(mockToken);
//             expect(sendUrl).to.equal("testSendUrl");
//             if (message === mockAnswer) {
//                 if (connection.ondatachannel) {
//                     connection.ondatachannel(<RTCDataChannelEvent>{
//                         channel: mockDataChannel
//                     });
//                     if (mockDataChannel.onopen) {
//                         mockDataChannel.onopen(<Event>{});
//                     } else {
//                         throw new Error("DataChannel onopen is not overriden!");
//                     }
//                 } else {
//                     throw new Error("ondatachannel is not overriden!");
//                 }
//             } else if (message === mockLocalCandidate) {
//                 messageHandler({
//                     responseToken: mockToken,
//                     body: mockRemoteCandidate
//                 });
//             } else {
//                 throw new Error("Unexpcted message!");
//             }
//             return new Promise((resolve) => { resolve(); });
//         }


//     });

//     it("can connect as client", (done) => {
//         const mockRelay = <UhstRelayClient>{};
//         const mockConfig: RTCConfiguration = <RTCConfiguration>{};
//         const mockOffer: RTCSessionDescriptionInit = {};
//         const mockAnswer: RTCSessionDescriptionInit = { type: "answer" };
//         const mockLocalCandidate: RTCIceCandidateInit = {};
//         const mockRemoteCandidate: RTCIceCandidateInit = {};
//         const mockDataChannel: RTCDataChannel = <RTCDataChannel>{};
//         const mockStreamClose = stub();
//         let messageHandler: Function;

//         (global as any).RTCPeerConnection = (config: RTCConfiguration): RTCPeerConnection => {
//             expect(config).to.equal(mockConfig);
//             const connection = <RTCPeerConnection>{
//                 createOffer: (): Promise<RTCSessionDescriptionInit> => {
//                     return new Promise<RTCSessionDescriptionInit>((resolve) => {
//                         resolve(mockOffer);
//                     });
//                 },
//                 createDataChannel: (label: string): RTCDataChannel => {
//                     return mockDataChannel;
//                 },
//                 setLocalDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
//                     return new Promise<void>((resolve) => {
//                         expect(description).to.equal(mockOffer);
//                         resolve();
//                     });
//                 },
//                 setRemoteDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
//                     return new Promise<void>((resolve) => {
//                         expect(description).to.equal(mockAnswer);
//                         if (connection.onicecandidate) {
//                             connection.onicecandidate(<RTCPeerConnectionIceEvent>{
//                                 candidate: mockLocalCandidate
//                             });
//                             resolve();
//                         } else {
//                             throw new Error("onicecandidate is not overriden!");
//                         }
//                     });
//                 },
//                 addIceCandidate: (candidate: RTCIceCandidate): Promise<void> => {
//                     return new Promise<void>((resolve) => {
//                         expect(candidate).to.equal(mockRemoteCandidate);
//                         if (mockDataChannel.onopen) {
//                             mockDataChannel.onopen(<Event>{});
//                             resolve();
//                         } else {
//                             throw new Error("DataChannel onopen is not overriden!");
//                         }
//                     });
//                 }
//             };
//             return connection;
//         }
//         mockRelay.initClient = stub().returns(<ClientConfiguration>{
//             clientToken: "testClientToken",
//             receiveUrl: "testReceiveUrl",
//             sendUrl: "testSendUrl",
//         });
//         mockRelay.subscribeToMessages = (clientToken, handleMessage, handleRelayError, handleRelayEvent, receiveUrl) => {
//             expect(clientToken).to.equal("testClientToken");
//             expect(receiveUrl).to.equal("testReceiveUrl");
//             messageHandler = handleMessage;
//             return {
//                 close: mockStreamClose
//             }
//         }
//         mockRelay.sendMessage = (clientToken, message, sendUrl): Promise<void> => {
//             expect(clientToken).to.equal("testClientToken");
//             expect(sendUrl).to.equal("testSendUrl");
//             if (message === mockOffer) {
//                 messageHandler({
//                     body: mockAnswer
//                 });
//             } else if (message === mockLocalCandidate) {
//                 messageHandler({
//                     body: mockRemoteCandidate
//                 });
//             } else {
//                 throw new Error("Unexpcted message!");
//             }
//             return new Promise((resolve) => { resolve(); });
//         }

//         const uhstSocket: WebRTCSocket = new WebRTCSocket(mockRelay, mockConfig, {type: "client", hostId: "testHost"}, false);
//         expect(uhstSocket).to.not.be.null;
//         uhstSocket.on('open', () => {
//             expect(mockRelay.initClient).to.have.been.calledWith("testHost");
//             expect(mockStreamClose).to.have.been.calledOnce;
//             done();
//         });
//     });
// });