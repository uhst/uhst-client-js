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

export class MeetingPointUnreachable extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "MeetingPointUnreachable"; 
    }
}

export class MeetingPointError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "MeetingPointError"; 
    }
}