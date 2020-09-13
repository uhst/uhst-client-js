import { UhstApiClient, MessageHandler } from "./UhstApiClient";
import { ClientConfiguration, HostConfiguration, Message } from "./models";

export class ApiClient implements UhstApiClient {
    constructor(private apiUrl: string) {

    }
    initHost(hostId: string): Promise<HostConfiguration> {
        return new Promise<HostConfiguration>((resolve, reject) => {
            fetch(`${this.apiUrl}?action=host&hostId=${hostId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }).then(response => response.json())
                .then(data => {
                    resolve(data);
                }).catch(reject);
        });
    }
    initClient(hostId: string): Promise<ClientConfiguration> {
        return new Promise<ClientConfiguration>((resolve, reject) => {
            fetch(`${this.apiUrl}?action=join&hostId=${hostId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }).then(response => response.json())
                .then(data => {
                    resolve(data);
                }).catch(reject);
        });
    }
    sendMessage(token: string, message: any, sendUrl?: string): Promise<any> {
        const url = sendUrl ?? this.apiUrl;
        return fetch(`${url}?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
    }
    subscribeToMessages(token: string, handler: MessageHandler, receiveUrl?: string): void {
        const url = receiveUrl ?? this.apiUrl;
        const stream = new EventSource(`${url}?token=${token}`);
        stream.addEventListener("message", (evt: MessageEvent) => {
            const message: Message = JSON.parse(evt.data);
            handler(message);
        });
    }

}