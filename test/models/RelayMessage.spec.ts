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

    // it("sets and gets Blob payload", async () => {
    //     const testBlob = new Blob([JSON.stringify({test: "message"}, null, 2)], {type : "application/json"});
    //     const testMessage = new RelayMessage();
    //     await testMessage.setPayload(testBlob);
    //     const testPayload = await testMessage.getPayload();
    //     expect(testPayload).to.equal(testBlob);
    // });
});