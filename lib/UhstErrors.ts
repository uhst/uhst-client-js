export class InvalidToken extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidToken.name;
    }
}

export class InvalidHostId extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidHostId.name;
    }
}

export class HostIdAlreadyInUse extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HostIdAlreadyInUse.name; 
    }
}

export class InvalidClientOrHostId extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidClientOrHostId.name;
    }
}

export class MeetingPointUnreachable extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MeetingPointUnreachable.name; 
    }
}

export class MeetingPointError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MeetingPointError.name; 
    }
}