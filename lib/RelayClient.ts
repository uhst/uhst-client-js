import { UhstRelayClient, MessageHandler, MessageStream } from "./contracts/UhstRelayClient";
import { ClientConfiguration, HostConfiguration, Message } from "./models";
import { InvalidToken, InvalidHostId, HostIdAlreadyInUse, RelayError, RelayUnreachable, InvalidClientOrHostId } from "./UhstErrors";

const REQUEST_OPTIONS = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

export class RelayClient implements UhstRelayClient {
    constructor(private relayUrl: string) {

    }

    async initHost(hostId?: string): Promise<HostConfiguration> {
        let response: Response;
        try {
            response = await fetch(`${this.relayUrl}?action=host&hostId=${hostId}`, REQUEST_OPTIONS);
        } catch (error) {
            console.log(error);
            throw new RelayUnreachable(error);
        }
        if (response.status == 200) {
            const jsonResponse = await response.json();
            return jsonResponse;
        } else if (response.status == 400) {
            throw new HostIdAlreadyInUse(response.statusText);
        } else {
            throw new RelayError(`${response.status} ${response.statusText}`);
        }
    }

    async initClient(hostId: string): Promise<ClientConfiguration> {
        let response: Response;
        try {
            response = await fetch(`${this.relayUrl}?action=join&hostId=${hostId}`, REQUEST_OPTIONS);
        } catch (error) {
            console.log(error);
            throw new RelayUnreachable(error);
        }
        if (response.status == 200) {
            const jsonResponse = await response.json();
            return jsonResponse;
        } else if (response.status == 400) {
            throw new InvalidHostId(response.statusText);
        } else {
            throw new RelayError(`${response.status} ${response.statusText}`);
        }
    }

    async sendMessage(token: string, message: any, sendUrl?: string): Promise<void> {
        const url = sendUrl ?? this.relayUrl;
        let response: Response;
        try {
            response = await fetch(`${url}?token=${token}`, {
                ...REQUEST_OPTIONS,
                body: JSON.stringify(message),
            });
        } catch (error) {
            console.log(error);
            throw new RelayUnreachable(error);
        }
        if (response.status == 200) {
            return;
        } else if (response.status == 400) {
            throw new InvalidClientOrHostId(response.statusText);
        } else if (response.status == 401) {
            throw new InvalidToken(response.statusText);
        } else {
            throw new RelayError(`${response.status} ${response.statusText}`);
        }
    }

    subscribeToMessages(token: string, handler: MessageHandler, receiveUrl?: string): Promise<MessageStream> {
        const url = receiveUrl ?? this.relayUrl;
        return new Promise<MessageStream>((resolve, reject) => {
            const stream = new EventSource(`${url}?token=${token}`);
            stream.onopen = (ev: Event) => {
                resolve(stream);
            };
            stream.onerror = (ev: Event) => {
                reject(new RelayError(ev));
            };
            stream.addEventListener("message", (evt: MessageEvent) => {
                const message: Message = JSON.parse(evt.data);
                handler(message);
            });
        });
    }

}