import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { stub, match } from "sinon";
import { UhstRelayClient, MessageStream } from "../lib/contracts/UhstRelayClient";
import { ClientConfiguration, HostMessage } from "../lib/models";
import { WebRTCSocket } from "../lib/WebRTCSocket";

use(sinonChai);

describe("# WebRTCSocket", () => {
    let mockRelay: any;
    let mockConfig: RTCConfiguration;
    let mockConnection: any;
    let mockDataChannel: any;

    beforeEach(() => {
        mockRelay = {
            initClient: stub(),
            subscribeToMessages: stub(),
            sendMessage: stub().resolves()
        };
        mockConfig = {};
        mockDataChannel = {
            send: stub(),
            close: stub()
        };
        mockConnection = {
            createOffer: stub(),
            createAnswer: stub(),
            setLocalDescription: stub().resolves(),
            setRemoteDescription: stub().resolves(),
            addIceCandidate: stub().resolves(),
            createDataChannel: stub().returns(mockDataChannel),
            close: stub()
        };
        (global as any).RTCPeerConnection = stub().returns(mockConnection);
    });

    afterEach(() => {
        delete (global as any).RTCPeerConnection;
    });

    it("can connect as host", (done) => {
        const mockOffer = { type: "offer", sdp: "sdp" };
        const mockAnswer = { type: "answer", sdp: "sdp-answer" };
        const mockToken = "token";
        
        mockConnection.createAnswer.resolves(mockAnswer);

        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: mockToken,
            clientId: "client1",
            sendUrl: "send-url"
        }, true); // enable debug

        socket.on("open", () => {
            done();
        });

        // simulate receiving offer
        socket.handleMessage({ body: mockOffer } as any);

        setTimeout(() => {
            expect(mockConnection.setRemoteDescription).to.have.been.calledWith(mockOffer);
            expect(mockConnection.createAnswer).to.have.been.called;
            expect(mockRelay.sendMessage).to.have.been.calledWith(mockToken, mockAnswer, "send-url");
            
            // simulate data channel
            const dataChannelEvent = { channel: mockDataChannel };
            if (mockConnection.ondatachannel) {
                mockConnection.ondatachannel(dataChannelEvent);
                mockDataChannel.onopen();
            }
        }, 0);
    });

    it("can connect as client", (done) => {
        const mockOffer = { type: "offer", sdp: "sdp" };
        const mockAnswer = { type: "answer", sdp: "sdp-answer" };
        const mockClientConfig = { clientToken: "client-token", sendUrl: "send-url", receiveUrl: "receive-url" };
        const mockStream = { close: stub() };

        mockRelay.initClient.resolves(mockClientConfig);
        mockRelay.subscribeToMessages.resolves(mockStream);
        mockConnection.createOffer.resolves(mockOffer);

        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "client",
            hostId: "host1"
        }, true); // enable debug

        socket.on("open", () => {
            expect(mockStream.close).to.have.been.called;
            done();
        });

        setTimeout(() => {
            expect(mockRelay.initClient).to.have.been.calledWith("host1");
            expect(mockRelay.subscribeToMessages).to.have.been.called;
            expect(mockConnection.createOffer).to.have.been.called;
            expect(mockRelay.sendMessage).to.have.been.calledWith("client-token", mockOffer, "send-url");

            // simulate receiving answer
            socket.handleMessage({ body: mockAnswer } as any);
            expect(mockConnection.setRemoteDescription).to.have.been.calledWith(mockAnswer);

            mockDataChannel.onopen();
        }, 10);
    });

    it("should handle ice candidates", (done) => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, true); // enable debug

        const mockCandidate = { candidate: "cand" };
        socket.handleMessage({ body: mockCandidate } as any);
        
        // candidates are cached until offer is accepted
        expect(mockConnection.addIceCandidate).to.not.have.been.called;

        mockConnection.createAnswer.resolves({});

        // accept offer
        socket.handleMessage({ body: { type: "offer" } } as any);

        setTimeout(() => {
            expect(mockConnection.addIceCandidate).to.have.been.calledWith(mockCandidate);
            done();
        }, 0);
    });

    it("should handle sending messages", (done) => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, false);

        mockConnection.createAnswer.resolves({});
        socket.handleMessage({ body: { type: "offer" } } as any);

        setTimeout(() => {
            const dataChannelEvent = { channel: mockDataChannel };
            if (mockConnection.ondatachannel) {
                mockConnection.ondatachannel(dataChannelEvent);
                socket.send("test message");
                expect(mockDataChannel.send).to.have.been.calledWith("test message");
                done();
            }
        }, 0);
    });

    it("should handle close", () => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, false);

        socket.close();
        expect(mockConnection.close).to.have.been.called;
    });

    it("should handle local ice candidates", () => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1",
            sendUrl: "send-url"
        }, true); // enable debug

        const mockIceEvent = { candidate: { cand: "local-cand" } };
        mockConnection.onicecandidate(mockIceEvent);

        expect(mockRelay.sendMessage).to.have.been.calledWith("token", mockIceEvent.candidate, "send-url");
    });

    it("should handle connection state changes", () => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, true); 

        const diagnosticHandler = stub();
        socket.on("diagnostic", diagnosticHandler);

        const states = ["connected", "disconnected", "failed", "closed"];
        states.forEach(state => {
            mockConnection.connectionState = state;
            mockConnection.onconnectionstatechange({});
        });

        expect(diagnosticHandler).to.have.been.calledWith("WebRTC connection established.");
        expect(diagnosticHandler).to.have.been.calledWith("WebRTC connection disconnected.");
        expect(diagnosticHandler).to.have.been.calledWith("WebRTC connection failed.");
        expect(diagnosticHandler).to.have.been.calledWith("WebRTC connection closed.");
    });

    it("should handle data channel messages", (done) => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, true); // enable debug

        socket.on("message", (msg) => {
            expect(msg).to.equal("hello");
            done();
        });

        mockConnection.createAnswer.resolves({});
        socket.handleMessage({ body: { type: "offer" } } as any);

        setTimeout(() => {
            const dataChannelEvent = { channel: mockDataChannel };
            if (mockConnection.ondatachannel) {
                mockConnection.ondatachannel(dataChannelEvent);
                mockDataChannel.onmessage({ data: "hello" });
            }
        }, 0);
    });

    it("should handle data channel close", (done) => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, {
            type: "host",
            token: "token",
            clientId: "client1"
        }, false);

        socket.on("close", () => {
            done();
        });

        mockConnection.createAnswer.resolves({});
        socket.handleMessage({ body: { type: "offer" } } as any);

        setTimeout(() => {
            const dataChannelEvent = { channel: mockDataChannel };
            if (mockConnection.ondatachannel) {
                mockConnection.ondatachannel(dataChannelEvent);
                mockDataChannel.onclose();
            }
        }, 0);
    });

    it("should handle host answer send failure", (done) => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, { type: "host", token: "t", clientId: "c" }, true); // enable debug
        const error = new Error("send fail");
        mockRelay.sendMessage = stub().rejects(error);
        mockConnection.createAnswer.resolves({});

        socket.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });

        socket.handleMessage({ body: { type: "offer" } } as any);
    });

    it("should handle client init failure", (done) => {
        const error = new Error("init fail");
        mockRelay.initClient.rejects(error);

        const socket = new WebRTCSocket(mockRelay as any, mockConfig, { type: "client", hostId: "h" }, true); // enable debug
        socket.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });
    });

    it("should handle client offer send failure", (done) => {
        const error = new Error("send fail");
        mockRelay.initClient.resolves({ clientToken: "t" });
        mockRelay.subscribeToMessages.resolves({ close: stub() });
        mockConnection.createOffer.resolves({});
        mockRelay.sendMessage = stub().rejects(error);

        const socket = new WebRTCSocket(mockRelay as any, mockConfig, { type: "client", hostId: "h" }, true); // enable debug
        socket.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });
    });

    it("should throw on unsupported params", () => {
        expect(() => new WebRTCSocket(mockRelay as any, mockConfig, { type: "invalid" } as any, false)).to.throw("Unsupported Socket Parameters Type");
    });

    it("should handle once and off", () => {
        const socket = new WebRTCSocket(mockRelay as any, mockConfig, { type: "host", token: "t", clientId: "c" }, false);
        const handler = stub();
        socket.once("open", handler);
        socket.off("open", handler);
    });
});
