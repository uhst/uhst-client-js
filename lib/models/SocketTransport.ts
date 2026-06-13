/**
 * Indicates how a [[UhstSocket]] is currently delivering application messages:
 *
 * - `"relay"` — messages travel through the UHST relay server (the default and
 *   the fallback).
 * - `"webrtc"` — the connection was upgraded to a direct peer-to-peer WebRTC
 *   data channel.
 *
 * Every connection starts on `"relay"`; the host automatically attempts to
 * upgrade each client to `"webrtc"` and the socket reports the active transport
 * through [[UhstSocket.transport]] and the `"transportchange"` event.
 */
export type SocketTransport = 'relay' | 'webrtc';
