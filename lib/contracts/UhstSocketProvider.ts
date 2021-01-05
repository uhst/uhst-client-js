import { ClientSocketParams, HostSocketParams } from "../models";
import { UhstApiClient } from "./UhstApiClient";
import { UhstSocket } from "./UhstSocket";

export interface UhstSocketProvider {
    createUhstSocket(apiClient: UhstApiClient, params: ClientSocketParams | HostSocketParams, debug: boolean): UhstSocket;
}