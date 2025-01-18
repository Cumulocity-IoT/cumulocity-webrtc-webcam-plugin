import { Observable, Subscriber, TeardownLogic, Subscription } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';

export class TwoWayObservable<T = string> extends Observable<T> {
  constructor(
    subscribe: (subscriber: Subscriber<T>) => TeardownLogic,
    private sendCallBack: (msg: T) => void
  ) {
    super(subscribe);
  }

  send(msg: T) {
    this.sendCallBack(msg);
  }
}

export function signalingConnection(connectionDetails: {
  deviceId: string;
  configId: string;
  token: string;
  xsrf: string;
  host: string;
  port: string;
  webcam: string;
}) {
  const queryParams = connectionDetails.token
    ? `token=${connectionDetails.token}&XSRF-TOKEN=${connectionDetails.xsrf}`
    : `XSRF-TOKEN=${connectionDetails.xsrf}`;
  const url = `/service/remoteaccess/client/${connectionDetails.deviceId}/configurations/${connectionDetails.configId}?${queryParams}`;

  let subscribers = new Array<Subscriber<string>>();
  let sub: Subscription | undefined;

  let messagesToSend: string[] = [];
  let open = false;
  let reciveBuffer = new Uint8Array(0);
  const ws = webSocket<Uint8Array>({
    url: url,
    protocol: 'binary',
    binaryType: 'arraybuffer',
    serializer: (msg) => {
      return msg;
    },
    deserializer: (e) => {
      if (e.data instanceof ArrayBuffer) {
        return new Uint8Array(e.data);
      }
      throw Error('wrong type');
    },
  });

  const sendMessage = (msg: string) => {
    console.log('sending msg', msg);
    ws.next(createFrame(msg));
  };

  const createFrame = (data: string) => {
    const messageBytes = new TextEncoder().encode(data);
    const messageLength = messageBytes.length;

    let frameLength = 2; // First 2 bytes are for FIN, RSV, Opcode, Mask, and initial length
    let lengthBytes = 0;

    if (messageLength <= 125) {
      // Length fits in 7 bits
      lengthBytes = 0;
    } else if (messageLength <= 65535) {
      // Length needs 2 additional bytes
      frameLength += 2;
      lengthBytes = 2;
    } else {
      // Length needs 8 additional bytes
      frameLength += 8;
      lengthBytes = 8;
    }

    // Add 4 bytes for masking key
    frameLength += 4;

    // Add message length
    frameLength += messageLength;

    const frame = new Uint8Array(frameLength);

    // Set FIN and Opcode (0x81 = FIN:1 + Opcode:1 for text)
    frame[0] = 0x81;

    // Set masked bit and length
    if (messageLength <= 125) {
      frame[1] = messageLength | 0x80; // Set mask bit
    } else if (messageLength <= 65535) {
      frame[1] = 126 | 0x80;
      frame[2] = (messageLength >> 8) & 0xff;
      frame[3] = messageLength & 0xff;
    } else {
      frame[1] = 127 | 0x80;
      const lengthBytes = new Uint8Array(8);
      let remaining = messageLength;
      for (let i = 7; i >= 0; i--) {
        lengthBytes[i] = remaining & 0xff;
        remaining = Math.floor(remaining / 256);
      }
      frame.set(lengthBytes, 2);
    }

    // Generate and set mask key
    const maskKey = new Uint8Array(4);
    crypto.getRandomValues(maskKey);
    const maskOffset = frameLength - messageLength - 4;
    frame.set(maskKey, maskOffset);

    // Mask and set the data
    for (let i = 0; i < messageLength; i++) {
      frame[maskOffset + 4 + i] = messageBytes[i] ^ maskKey[i % 4];
    }

    return frame;
  };

  const sendHandShake = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const nonce = btoa(String.fromCharCode.apply(null, [...randomBytes]));
    ws.next(
      new TextEncoder().encode(
        `GET /api/ws?src=${connectionDetails.webcam} HTTP/1.1\r\n` +
          `Host: ${connectionDetails.host}:${connectionDetails.port}\r\n` +
          `Connection: keep-alive, Upgrade\r\n` +
          `Accept: */*\r\n` +
          `Upgrade: websocket\r\n` +
          `Sec-WebSocket-Key: ${nonce}\r\n` +
          `Sec-WebSocket-Version: 13\r\n` +
          `\r\n`
      )
    );
  };

  const onMessage = (data: Uint8Array) => {
    const newBuffer = new Uint8Array(reciveBuffer.length + data.length);
    newBuffer.set(reciveBuffer);
    newBuffer.set(data, reciveBuffer.length);
    reciveBuffer = newBuffer;
    if (!open) {
      const textDecoder = new TextDecoder('utf-8');
      const message = textDecoder.decode(reciveBuffer);
      const dataAsString = message;
      console.log(message);

      const endOfHTTP = '\r\n\r\n';
      if (!dataAsString.includes(endOfHTTP)) {
        console.log('did not yet get a FULL HTTP packet');
        return;
      }

      if (!dataAsString.startsWith('HTTP/1.1 101')) {
        throw new Error('Wrong status code, expected 101');
      }

      const httpPacketEndMarkerPosition =
        dataAsString.indexOf(endOfHTTP) + endOfHTTP.length;
      const httpPacket = dataAsString.slice(0, httpPacketEndMarkerPosition);
      console.log(httpPacket);
      // todo add old data here
      reciveBuffer = new Uint8Array(0);
      console.log(messagesToSend);
      while (messagesToSend.length) {
        const queuedMsg = messagesToSend.shift();
        if (queuedMsg !== undefined) {
          sendMessage(queuedMsg);
        } else {
          break;
        }
      }
      console.log('OPEN', open);
      open = true;
      return;
    }

    console.log(reciveBuffer);
    processData();
  };

  const processData = () => {
    // Process frames while we have enough data
    while (reciveBuffer.length >= 2) {
      const frameInfo = parseFrameHeader();
      if (!frameInfo) return;

      const { payloadLength, headerLength } = frameInfo;
      const totalLength = headerLength + payloadLength;

      // Check if we have the complete frame
      if (reciveBuffer.length < totalLength) return;

      // Extract and process the frame
      const frame = extractFrame(headerLength, payloadLength);
      if (frame) {
        handleFrame(frame);
      }

      // Remove processed frame from buffer
      reciveBuffer = reciveBuffer.slice(totalLength);
    }
  };

  const parseFrameHeader = () => {
    const firstByte = reciveBuffer[0];
    const secondByte = reciveBuffer[1];

    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    // Handle extended payload lengths
    if (payloadLength === 126) {
      if (reciveBuffer.length < 4) return null;
      payloadLength = (reciveBuffer[2] << 8) | reciveBuffer[3];
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (reciveBuffer.length < 10) return null;
      payloadLength = 0;
      for (let i = 0; i < 8; i++) {
        payloadLength = (payloadLength << 8) | reciveBuffer[2 + i];
      }
      headerLength = 10;
    }

    // Add mask bytes to header length if frame is masked
    if (masked) {
      headerLength += 4;
    }

    return { payloadLength, headerLength, masked, opcode, fin };
  };

  const extractFrame = (headerLength: number, payloadLength: number) => {
    const masked = (reciveBuffer[1] & 0x80) === 0x80;
    const payload = new Uint8Array(payloadLength);

    if (masked) {
      const maskKey = reciveBuffer.slice(headerLength - 4, headerLength);
      // Unmask the payload
      for (let i = 0; i < payloadLength; i++) {
        payload[i] = reciveBuffer[headerLength + i] ^ maskKey[i % 4];
      }
    } else {
      payload.set(
        reciveBuffer.slice(headerLength, headerLength + payloadLength)
      );
    }

    return payload;
  };

  const handleFrame = (payload: Uint8Array) => {
    // Convert payload to text
    const textDecoder = new TextDecoder('utf-8');
    const message = textDecoder.decode(payload);

    // Call message callback if set
    // this.responses.next(message);
    console.log(message);
    subscribers.forEach((sub) => sub.next(message));
  };

  return new TwoWayObservable<string>(
    (subscriber) => {
      if (!sub) {
        sendHandShake();
        sub = ws.subscribe((data) => onMessage(data));
      }
      subscribers.push(subscriber);
      return {
        unsubscribe: () => {
          subscribers = subscribers.filter((sub) => sub !== subscriber);
          if (!subscribers.length) {
            sub?.unsubscribe();
            sub = undefined;
          }
        },
      };
    },
    (msg: string) => {
      if (open && !messagesToSend.length) {
        return sendMessage(msg);
      }
      messagesToSend.push(msg);
    }
  );
}
