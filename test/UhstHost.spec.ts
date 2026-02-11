import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { stub } from "sinon";
import { MessageStream, UhstRelayClient, RelayEventHandler } from "../lib/contracts/UhstRelayClient";
import { UhstSocket } from "../lib/contracts/UhstSocket";
import { UhstSocketProvider } from "../lib/contracts/UhstSocketProvider";
import { HostConfiguration, HostMessage, HostSocketParams } from "../lib/models";
import { UhstHost } from "../lib/UhstHost";

use(sinonChai);

describe("# UhstHost", () => {
    it("can host", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const mockSocket = <UhstSocket>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";
        let messageHandler: any;
        const mockStreamClose = stub();

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
            receiveUrl: "testReceiveUrl",
            sendUrl: "testSendUrl",
        });

        mockRelay.subscribeToMessages = (token, handler, handleRelayError, handleRelayEvent, receiveUrl) => {
            expect(token).to.equal("testHostToken");
            expect(receiveUrl).to.equal("testReceiveUrl");
            messageHandler = handler;
            return Promise.resolve(<MessageStream>{
                close: mockStreamClose
            });
        }

        mockSocket.handleMessage = (message: HostMessage) => {
            expect(message.responseToken).to.equal(mockToken);
            expect(message.body).to.equal("testClientMessage");
        }

        mockSocketProvider.createUhstSocket = (relayClient, params: HostSocketParams, debug) => {
            expect(relayClient).to.equal(mockRelay);
            expect(params.type).to.equal("host");
            expect(params.token).to.equal(mockToken);
            expect(params.sendUrl).to.equal("testSendUrl");
            return mockSocket;
        }

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", () => {
            expect(uhstHost.hostId).to.equal("testHostId");
            messageHandler(<HostMessage>{
                responseToken: mockToken,
                body: "testClientMessage"
            });
        });
        uhstHost.on("connection", (socket) => {
            expect(socket).to.not.be.undefined;
            expect(mockStreamClose).to.not.have.been.called;
            done();
        });

        expect(mockRelay.initHost).to.have.been.calledWith("testHostId");
    });

    it("can broadcast string messages", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const mockStreamClose = stub();
        const mockToken = "testHostToken";

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
            receiveUrl: "testReceiveUrl",
            sendUrl: "testSendUrl",
        });

        mockRelay.subscribeToMessages = (token, handler, handleRelayError, handleRelayEvent, receiveUrl) => {
            expect(token).to.equal("testHostToken");
            expect(receiveUrl).to.equal("testReceiveUrl");
            return Promise.resolve(<MessageStream>{
                close: mockStreamClose
            });
        }

        mockRelay.sendMessage = (token: string, message: any, sendUrl?: string): Promise<void> => {
            expect(token).to.equal(mockToken);
            expect(sendUrl).to.equal("testSendUrl");
            expect(message.type).to.equal("string");
            expect(message.payload).to.equal("Test Message");
            return Promise.resolve();
        }
  
        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("error", console.error);
        uhstHost.on("ready", () => {
            expect(uhstHost.hostId).to.equal("testHostId");
            uhstHost.broadcast("Test Message");
            done();
        });

        expect(mockRelay.initHost).to.have.been.calledWith("testHostId");
    });

    it("can disconnect", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const mockStreamClose = stub();

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = stub().resolves(<MessageStream>{
            close: mockStreamClose
        });

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", () => {
            uhstHost.disconnect();
            expect(mockStreamClose).to.have.been.called;
            done();
        });
    });

    it("should handle relay error", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        let errorHandler: any;
        const mockStreamClose = stub();

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = (token, handler, handleRelayError, handleRelayEvent, receiveUrl) => {
            errorHandler = handleRelayError;
            return Promise.resolve(<MessageStream>{
                close: mockStreamClose
            });
        }

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", () => {
            errorHandler();
        });
        uhstHost.on("error", (error) => {
            expect(error.name).to.equal("RelayError");
            expect(mockStreamClose).to.have.been.called;
            done();
        });
    });

    it("should emit diagnostic messages when debug is enabled", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const diagnosticHandler = stub();

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = stub().resolves(<MessageStream>{
            close: stub()
        });

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", true);
        uhstHost.on("diagnostic", diagnosticHandler);
        uhstHost.on("ready", () => {
            expect(diagnosticHandler).to.have.been.calledWith("Host configuration received from server.");
            expect(diagnosticHandler).to.have.been.calledWith("Host subscribed to messages from server.");
            done();
        });
    });

    it("should handle error during broadcast", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const error = new Error("broadcast failed");

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = stub().resolves(<MessageStream>{
            close: stub()
        });

        mockRelay.sendMessage = stub().rejects(error);

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", async () => {
            await uhstHost.broadcast("Test");
        });
        uhstHost.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });
    });

    it("should handle relay CLIENT_CLOSED event", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const mockSocket = <UhstSocket><any>{ close: stub(), handleMessage: stub() };
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiJjbGllbnQxIiwiaWF0IjoxNTk5ODgyNTYwfQ.sign";
        let eventHandler: any;
        let messageHandler: any;

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = (token, handler, handleRelayError, handleRelayEvent, receiveUrl) => {
            messageHandler = handler;
            eventHandler = handleRelayEvent;
            return Promise.resolve(<MessageStream>{ close: stub() });
        }

        mockSocketProvider.createUhstSocket = stub().returns(mockSocket);

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", () => {
            messageHandler({ responseToken: mockToken, body: "hi" });
            eventHandler({ eventType: "client_closed", body: "client1" });
            expect(mockSocket.close).to.have.been.called;
            done();
        });
    });

    it("should reuse socket for the same client", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const mockSocket = <UhstSocket><any>{ handleMessage: stub() };
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiJjbGllbnQxIiwiaWF0IjoxNTk5ODgyNTYwfQ.sign";
        let messageHandler: any;

        mockRelay.initHost = stub().returns(<HostConfiguration>{
            hostId: "testHostId",
            hostToken: "testHostToken",
        });

        mockRelay.subscribeToMessages = (token, handler, handleRelayError, handleRelayEvent, receiveUrl) => {
            messageHandler = handler;
            return Promise.resolve(<MessageStream>{ close: stub() });
        }

        mockSocketProvider.createUhstSocket = stub().returns(mockSocket);

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", false);
        uhstHost.on("ready", () => {
            messageHandler({ responseToken: mockToken, body: "hi1" });
            messageHandler({ responseToken: mockToken, body: "hi2" });
            expect(mockSocketProvider.createUhstSocket).to.have.been.calledOnce;
            done();
        });
    });

    it("should handle error during init", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockSocketProvider = <UhstSocketProvider>{};
        const error = new Error("init failed");

        mockRelay.initHost = stub().rejects(error);

        const uhstHost: UhstHost = new UhstHost(mockRelay, mockSocketProvider, "testHostId", true);
        uhstHost.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });
    });

    it("should handle diagnostic messages in broadcast failure", (done) => {
        const mockRelay = <any>{ 
            initHost: stub().resolves({ hostToken: "t" }),
            subscribeToMessages: stub().resolves({ close: stub() }),
            sendMessage: stub().rejects(new Error("fail"))
        };
        const uhstHost = new UhstHost(mockRelay, <any>{}, "host1", true);
        uhstHost.on("diagnostic", (msg) => {
            if (msg.startsWith("Failed sending message:")) {
                done();
            }
        });
        uhstHost.on("ready", () => {
            uhstHost.broadcast("test");
        });
    });

    it("should handle relay error and close stream", (done) => {
        let errorHandler: any;
        const mockStream = { close: stub() };
        const mockRelay = <any>{ 
            initHost: stub().resolves({ hostToken: "t" }),
            subscribeToMessages: (t, h, errorH, eventH) => {
                errorHandler = errorH;
                return Promise.resolve(mockStream);
            }
        };
        const uhstHost = new UhstHost(mockRelay, <any>{}, "host1", true);
        uhstHost.on("ready", () => {
            errorHandler();
        });
        uhstHost.on("error", (e) => {
            expect(e.name).to.equal("RelayError");
            expect(mockStream.close).to.have.been.called;
            done();
        });
    });

    it("should handle disconnect without stream", () => {
        const mockRelay = <any>{ initHost: stub().resolves({}) };
        const uhstHost = new UhstHost(mockRelay, <any>{}, "host1", false);
        uhstHost.disconnect();
    });

    it("should handle once", () => {
        const mockRelay = <any>{ initHost: stub().resolves({}) };
        const uhstHost = new UhstHost(mockRelay, <any>{}, "host1", false);
        const handler = stub();
        uhstHost.once("ready", handler);
        (uhstHost as any)._ee.emit("ready");
        (uhstHost as any)._ee.emit("ready");
        expect(handler).to.have.been.calledOnce;
    });

    it("should handle off", () => {
        const mockRelay = <any>{ initHost: stub().resolves({}) };
        const uhstHost = new UhstHost(mockRelay, <any>{}, "host1", false);
        const handler = stub();
        uhstHost.on("ready", handler);
        uhstHost.off("ready", handler);
    });
});
