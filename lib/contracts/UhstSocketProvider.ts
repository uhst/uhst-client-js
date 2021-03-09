import { ClientSocketParams, HostSocketParams } from "../models";
import { UhstRelayClient } from "./UhstRelayClient";
import { UhstSocket } from "./UhstSocket";

export interface UhstSocketProvider {
    createUhstSocket(relayClient: UhstRelayClient, params: ClientSocketParams | HostSocketParams, debug: boolean): UhstSocket;
}