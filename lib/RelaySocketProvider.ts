import { UhstApiClient } from "./contracts/UhstApiClient";
import { UhstSocket } from "./contracts/UhstSocket";
import { UhstSocketProvider } from "./contracts/UhstSocketProvider";
import { ClientSocketParams, HostSocketParams } from "./models";
import { RelaySocket } from "./RelaySocket";

export class RelaySocketProvider implements UhstSocketProvider {
    createUhstSocket(apiClient: UhstApiClient, params: ClientSocketParams | HostSocketParams, debug: boolean): UhstSocket {
        return new RelaySocket(apiClient, params, debug);
    }
}