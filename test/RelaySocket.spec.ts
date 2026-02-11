import sinonChai from "sinon-chai";
import { expect, use } from "chai";
import { describe } from "mocha";
import { MessageStream, UhstRelayClient } from "../lib/contracts/UhstRelayClient";
import { ClientConfiguration, ClientSocketParams, HostMessage, HostSocketParams } from "../lib/models";
import { RelaySocket } from "../lib/RelaySocket";
import { stub } from "sinon";

use(sinonChai);

describe("# RelaySocket", () => {
    it("should connect as client", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockStreamClose = stub();

        const mockClientSocketParams: ClientSocketParams = {
            type: "client",
            hostId: "testHostId"
        };
        mockRelay.initClient = stub().returns(<ClientConfiguration>{
            clientToken: "testClientToken",
            receiveUrl: "testReceiveUrl",
            sendUrl: "testSendUrl",
        });
        mockRelay.subscribeToMessages = (clientToken, handleMessage, handleRelayError, handleRelayEvent, receiveUrl) => {
            expect(clientToken).to.equal("testClientToken");
            expect(receiveUrl).to.equal("testReceiveUrl");
            return Promise.resolve(<MessageStream>{
                close: mockStreamClose
            });
        }
        const uhstSocket = new RelaySocket(mockRelay, mockClientSocketParams, true);
        uhstSocket.on('open', () => {
            done();
        });
    });

    it("should connect as host", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiJjbGllbnQxIiwiaWF0IjoxNTk5ODgyNTYwfQ.sign";

        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        uhstSocket.on('open', () => {
            done();
        });
    });

    it("can send string messages", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "token";

        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };

        mockRelay.sendMessage = stub().resolves();
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        uhstSocket.on('open', async () => {
            await uhstSocket.send("Test Message");
            expect(mockRelay.sendMessage).to.have.been.calledWith(mockToken, { type: "string", payload: "Test Message" }, "hostSendUrl");
            done();
        });
    });

    it("can receive string messages", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "token";
        const mockMessage: HostMessage = {
            responseToken: mockToken,
            body: { type: "string", payload: "Test Message" }
        } 
        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        uhstSocket.on('message', (message) => {
            expect(message).to.equal("Test Message");
            done();
        });
        uhstSocket.handleMessage(mockMessage);
    });

    it("can close", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockStreamClose = stub();

        mockRelay.initClient = stub().resolves({ clientToken: "token" });
        mockRelay.subscribeToMessages = stub().resolves({ close: mockStreamClose });

        const uhstSocket = new RelaySocket(mockRelay, { type: "client", hostId: "host" }, false);
        uhstSocket.on("open", () => {
            uhstSocket.close();
            expect(mockStreamClose).to.have.been.called;
        });
        uhstSocket.on("close", () => {
            done();
        });
    });

    it("should handle error during initClient", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const error = new Error("init failed");
        mockRelay.initClient = stub().rejects(error);

        const uhstSocket = new RelaySocket(mockRelay, { type: "client", hostId: "host" }, false);
        uhstSocket.on("error", (e) => {
            expect(e).to.equal(error);
            done();
        });
    });

    it("should handle relay error", (done) => {
        const mockRelay = <any>{
            initClient: stub().resolves({ clientToken: "t" }),
            subscribeToMessages: (t, h, errorH) => {
                setTimeout(() => errorH(), 0);
                return Promise.resolve({ close: stub() });
            }
        };
        const uhstSocket = new RelaySocket(mockRelay, { type: "client", hostId: "h" }, true);
        uhstSocket.on("diagnostic", (msg) => {
            if (msg === "Client connection to relay dropped.") {
                done();
            }
        });
    });

    it("should handle HOST_CLOSED relay event", (done) => {
        const mockRelay = <any>{
            initClient: stub().resolves({ clientToken: "t" }),
            subscribeToMessages: (t, h, errorH, eventH) => {
                setTimeout(() => eventH({ eventType: "host_closed" }), 0);
                return Promise.resolve({ close: stub() });
            }
        };
        const uhstSocket = new RelaySocket(mockRelay, { type: "client", hostId: "h" }, true);
        uhstSocket.on("diagnostic", (msg) => {
            if (msg === "Host disconnected from relay.") {
                done();
            }
        });
    });

    it("should throw on unsupported params", () => {
        expect(() => new RelaySocket(<any>{}, <any>{ type: "invalid" }, false)).to.throw("Unsupported Socket Parameters Type");
    });

    it("should return remoteId", () => {
        const uhstSocket = new RelaySocket(<any>{}, { type: "host", token: "t", clientId: "client1" }, false);
        expect(uhstSocket.remoteId).to.equal("client1");
    });

    it("should handle error during send and emit diagnostic", (done) => {
        const mockRelay = <any>{ sendMessage: stub().rejects(new Error("fail")) };
        const uhstSocket = new RelaySocket(mockRelay, { type: "host", token: "t", clientId: "c" }, true);
        uhstSocket.on("error", () => {});
        uhstSocket.on("diagnostic", (msg) => {
            if (msg.startsWith("Failed sending message:")) {
                done();
            }
        });
        uhstSocket.on("open", () => {
            uhstSocket.send("test");
        });
    });

    it("should emit diagnostic on initClient success", (done) => {
        const mockRelay = <any>{
            initClient: () => new Promise(resolve => setTimeout(() => resolve({ clientToken: "t" }), 10)),
            subscribeToMessages: stub().resolves({ close: stub() })
        };
        const uhstSocket = new RelaySocket(mockRelay, { type: "client", hostId: "h" }, true);
        uhstSocket.on("diagnostic", (msg) => {
            if (msg === "Client subscribed to messages from server.") {
                done();
            }
        });
    });

    it("should handle once and off", () => {
        const uhstSocket = new RelaySocket(<any>{}, { type: "host", token: "t", clientId: "client1" }, false);
        const handler = stub();
        uhstSocket.once("open", handler);
        uhstSocket.off("open", handler);
    });
});
