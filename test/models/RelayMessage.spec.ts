import { expect, use } from "chai";
import sinonChai from "sinon-chai";
import { JSDOM } from "jsdom";
import { RelayMessage } from "../../lib/models";

const dom = new JSDOM();
globalThis.Blob = dom.window.Blob;
globalThis.FileReader = dom.window.FileReader;

use(sinonChai);

describe("# RelayMessage", () => {
    it("can be created", () => {
        expect(new RelayMessage()).to.not.be.null;
    });

    it("sets and gets string payload", async () => {
        const testMessage = new RelayMessage();
        await testMessage.setPayload("test")
        const testPayload = await testMessage.getPayload();
        expect(testPayload).to.equal("test");
    });

        it("sets and gets Blob payload", async () => {

            const testBlob = new Blob(["test"], {type : "text/plain"});

            const testMessage = new RelayMessage();

            

            // mock fetch for data URL

            const mockFetch = (url: string) => Promise.resolve({

                blob: () => Promise.resolve(testBlob)

            });

            (global as any).fetch = mockFetch;

    

            await testMessage.setPayload(testBlob);

            const testPayload = await testMessage.getPayload();

            expect(testPayload).to.deep.equal(testBlob);

            

            delete (global as any).fetch;

        });

    

        it("should throw error for unsupported type", async () => {

            const testMessage = new RelayMessage();

            try {

                await testMessage.setPayload(123 as any);

                expect.fail("Should have thrown");

            } catch (e) {

                expect(e.message).to.equal("Unsupported message type.");

            }

        });

    

        it("should throw error for non-Blob object", async () => {

            const testMessage = new RelayMessage();

            try {

                await testMessage.setPayload({} as any);

                expect.fail("Should have thrown");

            } catch (e) {

                expect(e.message).to.equal("Unsupported message type.");

            }

        });

    });

    