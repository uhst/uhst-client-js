enum PayloadType {
    STRING = "string",
    BLOB = "blob"
}

export class RelayMessage {
    private payload: string;
    private payloadType: PayloadType;

    async setPayload(message: string): Promise<void>;
    async setPayload(message: Blob): Promise<void>;
    async setPayload(message: ArrayBuffer): Promise<void>;
    async setPayload(message: ArrayBufferView): Promise<void>;
    async setPayload(message: any): Promise<void> {
        switch (typeof message) {
            case "string":
                this.payload = message;
                this.payloadType = PayloadType.STRING;
                break;
            case "object":
                if (message instanceof Blob) {
                    this.payloadType = PayloadType.BLOB;
                    this.payload  = await this.blobToBase64(message);
                } else {
                    throw Error("Unsupported message type.");
                }
                break;
            default:
                throw Error("Unsupported message type.");
        }
    }

    async getPayload():Promise<any> {
        switch(this.payloadType) {
            case PayloadType.STRING:
                return this.payload;
            case PayloadType.BLOB:
                console.log(this.payload);
                const result = await fetch(this.payload).then(res => res.blob());
                return result;
        }

    }

    private blobToBase64 (blob: Blob): Promise<string> {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function () {
            resolve(reader.result as string);
          };
        });
      };
}