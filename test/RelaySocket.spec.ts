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
        let messageHandler: Function;

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
            messageHandler = handleMessage;
            return new Promise<MessageStream>((resolve) => {
                resolve({
                    close: mockStreamClose
                });
            });
                
        }
        const uhstSocket = new RelaySocket(mockRelay, mockClientSocketParams, true);
        expect(uhstSocket).to.not.be.null;
        uhstSocket.on('error', console.error);
        uhstSocket.on('diagnostic', console.log);
        uhstSocket.on('open', () => {
            done();
        });
        expect(mockRelay.initClient).to.have.been.calledWith("testHostId");
    });

    it("should connect as host", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";

        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        expect(uhstSocket).to.not.be.null;
        uhstSocket.on('error', console.error);
        uhstSocket.on('diagnostic', console.log);
        uhstSocket.on('open', () => {
            done();
        });
    });

    it("can send string messages", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";

        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };

        mockRelay.sendMessage = (token: string, message: any, sendUrl?: string): Promise<void> => {
            expect(token).to.equal(mockToken);
            expect(sendUrl).to.equal("hostSendUrl");
            expect(message.type).to.equal("string");
            expect(message.payload).to.equal("Test Message");
            return Promise.resolve();
        }
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        expect(uhstSocket).to.not.be.null;
        uhstSocket.on('error', console.error);
        uhstSocket.on('diagnostic', console.log);
        uhstSocket.on('open', async () => {
            await uhstSocket.send("Test Message");
            done();
        });
    });

    it("can receive string messages", (done) => {
        const mockRelay = <UhstRelayClient>{};
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzcG9uc2VUb2tlbiIsImhvc3RJZCI6InRlc3RIb3N0IiwiY2xpZW50SWQiOiI4ODk2OGUzYi03YTQ1LTQwMTMtYjY2OC1iNWIwMDIwMTQ2M2EiLCJpYXQiOjE1OTk4ODI1NjB9.Ck583aKIeEcEsvCVlNgpMgLrVM1JQQC4vB8PCaTU-pA";
        const mockMessage:HostMessage = {
            responseToken: mockToken,
            body: {type:"string", payload: "Test Message"}
        } 
        const mockHostSocketParams: HostSocketParams = {
            type: "host",
            token: mockToken,
            clientId: "testClient",
            sendUrl: "hostSendUrl"
        };
  
        const uhstSocket = new RelaySocket(mockRelay, mockHostSocketParams, true);
        expect(uhstSocket).to.not.be.null;
        uhstSocket.on('error', console.error);
        uhstSocket.on('diagnostic', console.log);
        uhstSocket.on('message', (message) => {
            expect(message).to.equal("Test Message");
            done();
        });
        uhstSocket.handleMessage(mockMessage);
    });
    
});