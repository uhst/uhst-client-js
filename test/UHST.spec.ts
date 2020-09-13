import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { describe } from "mocha";
import { stub } from "sinon";
import { UHST } from "../lib";
import { UhstApiClient } from "../lib/UhstApiClient";
import { ClientConfiguration, HostConfiguration, HostMessage } from "../lib/models";
import { ClientSocket } from "../lib/ClientSocket";
import { UhstHost } from "../lib/UhstHost";

use(sinonChai);


describe("# UHST", () => {
    it("should create UHST", () => {
        expect(new UHST()).to.not.be.null;
    });
    it("should accept RTCConfiguration", () => {
        const configuration: RTCConfiguration = {};
        expect(new UHST(configuration)).to.not.be.null;
    });
    it("should accept RTCConfiguration and meetingPointUrl", () => {
        const configuration: RTCConfiguration = {};
        const meetingPointUrl = "test"
        expect(new UHST(configuration, meetingPointUrl)).to.not.be.null;
    });
    it("can join host", (done) => {
        const mockApi = <UhstApiClient>{};
        const mockConfig: RTCConfiguration = {};
        const uhst: UHST = new UHST(mockConfig, mockApi);
        const mockOffer: RTCSessionDescriptionInit = {};
        const mockAnswer: RTCSessionDescriptionInit = { type: "answer" };
        const mockLocalCandidate: RTCIceCandidateInit = {};
        const mockRemoteCandidate: RTCIceCandidateInit = {};
        const mockDataChannel: RTCDataChannel = <RTCDataChannel>{};
        let messageHandler: Function;

        (global as any).RTCPeerConnection = (config: RTCConfiguration): RTCPeerConnection => {
            expect(config).to.equal(mockConfig);
            const connection = <RTCPeerConnection>{
                createOffer: (): Promise<RTCSessionDescriptionInit> => {
                    return new Promise<RTCSessionDescriptionInit>((resolve) => {
                        resolve(mockOffer);
                    });
                },
                createDataChannel: (label: string): RTCDataChannel => {
                    return mockDataChannel;
                },
                setLocalDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
                    return new Promise<void>((resolve) => {
                        expect(description).to.equal(mockOffer);
                        resolve();
                    });
                },
                setRemoteDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
                    return new Promise<void>((resolve) => {
                        expect(description).to.equal(mockAnswer);
                        if (connection.onicecandidate) {
                            connection.onicecandidate(<RTCPeerConnectionIceEvent>{
                                candidate: mockLocalCandidate
                            });
                            resolve();
                        } else {
                            throw new Error("onicecandidate is not overriden!");
                        }
                    });
                },
                addIceCandidate: (candidate: RTCIceCandidate): Promise<void> => {
                    return new Promise<void>((resolve) => {
                        expect(candidate).to.equal(mockRemoteCandidate);
                        if (mockDataChannel.onopen) {
                            mockDataChannel.onopen(<Event>{});
                            resolve();
                        } else {
                            throw new Error("DataChannel onopen is not overriden!");
                        }
                    });
                }
            };
            return connection;
        }
        mockApi.initClient = stub().returns(<ClientConfiguration>{
            clientToken: "testClientToken",
            receiveUrl: "testReceiveUrl",
            sendUrl: "testSendUrl",
        });
        mockApi.subscribeToMessages = (clientToken, handleMessage, receiveUrl) => {
            expect(clientToken).to.equal("testClientToken");
            expect(receiveUrl).to.equal("testReceiveUrl");
            messageHandler = handleMessage;
        }
        mockApi.sendMessage = (clientToken, message, sendUrl): Promise<void> => {
            expect(clientToken).to.equal("testClientToken");
            expect(sendUrl).to.equal("testSendUrl");
            if (message === mockOffer) {
                messageHandler({
                    body: mockAnswer
                });
            } else if (message === mockLocalCandidate) {
                messageHandler({
                    body: mockRemoteCandidate
                });
            } else {
                throw new Error("Unexpcted message!");
            }
            return new Promise((resolve) => { resolve(); });
        }

        const uhstSocket: ClientSocket = uhst.join("testHost");
        expect(uhstSocket).to.not.be.null;
        uhstSocket.on('open', () => {
            expect(mockApi.initClient).to.have.been.calledWith("testHost");
            done();
        });
    });
    it("can host", (done) => {
        const mockApi = <UhstApiClient>{};
        const mockConfig: RTCConfiguration = {};
        const mockOffer: RTCSessionDescriptionInit = { type: "offer" };
        const mockAnswer: RTCSessionDescriptionInit = { type: "answer" };
        const mockLocalCandidate: RTCIceCandidateInit = {};
        const mockRemoteCandidate: RTCIceCandidateInit = {};
        const mockDataChannel: RTCDataChannel = <RTCDataChannel>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";
        const uhst: UHST = new UHST(mockConfig, mockApi);
        let messageHandler: Function;
        const connection = <RTCPeerConnection>{
            createAnswer: (): Promise<RTCSessionDescriptionInit> => {
                return new Promise<RTCSessionDescriptionInit>((resolve) => {
                    resolve(mockAnswer);
                });
            },
            setLocalDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
                return new Promise<void>((resolve) => {
                    expect(description).to.equal(mockAnswer);
                    resolve();
                });
            },
            setRemoteDescription: (description: RTCSessionDescriptionInit): Promise<void> => {
                return new Promise<void>((resolve) => {
                    expect(description).to.equal(mockOffer);
                    if (connection.onicecandidate) {
                        connection.onicecandidate(<RTCPeerConnectionIceEvent>{
                            candidate: mockLocalCandidate
                        });
                        resolve();
                    } else {
                        throw new Error("onicecandidate is not overriden!");
                    }
                });
            },
            addIceCandidate: (candidate: RTCIceCandidate): Promise<void> => {
                return new Promise<void>((resolve) => {
                    expect(candidate).to.equal(mockRemoteCandidate);
                    resolve();
                });
            }
        };
        (global as any).RTCPeerConnection = (config: RTCConfiguration): RTCPeerConnection => {
            expect(config).to.equal(mockConfig);
            return connection;
        }

        mockApi.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
            receiveUrl: "testReceiveUrl",
            sendUrl: "testSendUrl",
        });

        mockApi.subscribeToMessages = (hostToken, handleMessage, receiveUrl) => {
            expect(hostToken).to.equal("testHostToken");
            expect(receiveUrl).to.equal("testReceiveUrl");
            messageHandler = handleMessage;
        }
        mockApi.sendMessage = (responseToken, message, sendUrl): Promise<void> => {
            expect(responseToken).to.equal(mockToken);
            expect(sendUrl).to.equal("testSendUrl");
            if (message === mockAnswer) {
                if (connection.ondatachannel) {
                    connection.ondatachannel(<RTCDataChannelEvent>{
                        channel: mockDataChannel
                    });
                    if (mockDataChannel.onopen) {
                        mockDataChannel.onopen(<Event>{});
                    } else {
                        throw new Error("DataChannel onopen is not overriden!");
                    }
                } else {
                    throw new Error("ondatachannel is not overriden!");
                }
            } else if (message === mockLocalCandidate) {
                messageHandler({
                    responseToken: mockToken,
                    body: mockRemoteCandidate
                });
            } else {
                throw new Error("Unexpcted message!");
            }
            return new Promise((resolve) => { resolve(); });
        }
        const uhstHost: UhstHost = uhst.host("testHost");
        uhstHost.on("ready", () => {
            expect(uhstHost.hostId).to.equal("testHostId");
            messageHandler(<HostMessage>{
                responseToken: mockToken,
                body: mockOffer
            });
        });
        uhstHost.on("connection", (socket) => {
            expect(socket).to.not.be.undefined;
            done();
        });

        expect(mockApi.initHost).to.have.been.calledWith("testHost");

    });
});