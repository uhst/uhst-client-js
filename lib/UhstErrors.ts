export class InvalidToken extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "InvalidToken";
    }
}

export class InvalidHostId extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "InvalidHostId";
    }
}

export class HostIdAlreadyInUse extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "HostIdAlreadyInUse"; 
    }
}

export class InvalidClientOrHostId extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "InvalidClientOrHostId";
    }
}

export class RelayUnreachable extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "RelayUnreachable"; 
    }
}

export class RelayError extends Error {
    constructor(message?: any) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "RelayError"; 
    }
}

export class NetworkUnreachable extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "NetworkUnreachable"; 
    }
}

export class NetworkError extends Error {
    constructor(message?: any) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "NetworkError"; 
    }
}