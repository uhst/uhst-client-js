# uhst-client

> JavaScript client library for the User Hosted Secure Transmission framework.

[![Build Status](https://travis-ci.org/uhst/uhst-client-js.svg?branch=master)](https://travis-ci.org/uhst/uhst-client-js)
[![NPM Version](https://badge.fury.io/js/uhst.svg)](https://badge.fury.io/js/uhst)
[![Gitter](https://badges.gitter.im/uhst/community.svg)](https://gitter.im/uhst/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

## Documentation
Visit our website for more complete documentation: [https://docs.uhst.io](https://docs.uhst.io).

## Support and discussions
Join us on [Gitter](https://gitter.im/uhst/community?utm_source=share-link&utm_medium=link&utm_campaign=share-link) or StackOverflow .

## Installation

The UHST client library is available on NPM:

```bash
$ npm install uhst --save
```

UMD bundle is also available from the releases tab and can be included with your resources.

Finally, you may skip installing UHST altogether and just load the minified UMD bundle from a CDN:

```html
 <script crossorigin src="https://unpkg.com/uhst/uhst.min.js"></script>
```

## Usage

### JavsScript

Assuming you have loaded the library, first create a new instance:

```JavaScript
var test = new uhst.UHST();
```

Refer to the documentation to learn about the options you can pass (including your own relay server URL, WebRTC configuration, etc.) .

#### Host
Host in UHST is a peer which every other peer connects to. This concept is similar to listen-server in multiplayer games.
The simplest way to create a new host is:

```JavaScript
var host = test.host();
host.on("ready", () => {
    alert("Host %s ready", host.hostId);
});
host.on("connection", function connection(uhstSocket) {
    uhstSocket.on("message", function incoming(message) {
        console.log("Host received: %s", message);
    });
    uhstSocket.on("open", function ready() {
        // note the socket is ready for sending only
        // after the "open" event fires!
        uhstSocket.send("something");
    });
});
```

Note that you can optionally specify a requested hostId when calling `host()` but it may not be 
accepted by the relay server. You should always use the `hostId` you get after receiving a `ready` event
when joining the host.<br>
By default the generated host ids will follow this pattern: `<4-digit-relay-prefix>-<4-digit-host-id>`.<br>
To pass the `hostId` to a client browser you can embed it in a URL parameter or a QR code.

#### Client
To connect to a host from another browser use the same `hostId` you received after `ready` event:

```JavaScript
var client = test.join(<host-id-from-host-ready-above>);
client.on("open", function open() {
    client.send("hello");
});
client.on("message", function incoming(message) {
    console.log("Client received: %s", message);
});
```

The UHST client interface is similar to the HTML5 WebSocket interface but instead of a dedicated server, one peer acts as a host for other peers to join.<br>

Once a client and a host have connected they can exchange messages asynchronously. Arbitrary number of clients can connect to the same host but clients cannot
send messages to each other, they can only communicate with the host.

## Contributing

This project is maintained by a community of developers. Contributions are welcome and appreciated.
You can find UHST on GitHub; feel free to start an issue or create a pull requests:<br>
[https://github.com/uhst/uhst-client-js](https://github.com/uhst/uhst-client-js).


## License

Copyright (c) 2021 Stefan Dimitrov<br>
Licensed under MIT License.
