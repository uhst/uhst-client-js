import { expect } from "chai";
import { describe } from "mocha";
import { isRelayEvent } from "../../lib/models/RelayEvent";

describe("# RelayEvent", () => {
    it("should identify relay event", () => {
        expect(isRelayEvent({ eventType: "test" })).to.be.true;
    });
    it("should identify non-relay event", () => {
        expect(isRelayEvent({ })).to.be.false;
    });
});
