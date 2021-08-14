export interface HostSocketParams {
    type: "host",
    token: string,
    clientId: string,
    sendUrl?: string
}

export interface ClientSocketParams {
    type: "client",
    hostId: string
}