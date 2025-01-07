import { Injectable } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { merge, Observable, Subject } from 'rxjs';
import { buffer, filter } from 'rxjs/operators';

export class SignalingConnection {
  private ws: WebSocket;
  private responses = new Subject<string>();
  private messagesToSend = new Subject<string>();
  private open = false;
  private reciveBuffer = new Uint8Array(0);
  constructor(deviceId: string, configId: string, token: string, xsrf: string) {
    const queryParams = token
      ? `token=${token}&XSRF-TOKEN=${xsrf}`
      : `XSRF-TOKEN=${xsrf}`;
    const url = `/service/remoteaccess/client/${deviceId}/configurations/${configId}?${queryParams}`;
    const bufferTrigger = new Subject<void>();
    this.ws = new WebSocket(url, ['binary']);
    this.ws.onmessage = async (msg) => {
      console.log('msg', msg);
      if (!this.open) {
        const dataAsString =
          msg.data instanceof Blob
            ? await msg.data.text()
            : new String(msg.data);
        console.log(JSON.stringify(dataAsString));
        if (
          dataAsString.startsWith('HTTP/1.1 101') &&
          dataAsString.endsWith('\r\n\r\n')
        ) {
          console.log(true);
          this.open = true;
          bufferTrigger.next();
        }
        return;
      }

      if (msg.data instanceof Blob) {
        // const data = await msg.data.text()
        // console.log(data);
        const arr = new Uint8Array(await msg.data.arrayBuffer());
        this.processData(arr);
      }

      

      // this.responses.next(msg.data);
    };
    this.ws.onclose = () => {
      console.log('closed');
      this.responses.complete();
    };
    this.ws.onerror = () => {
      console.log('error');
      this.responses.error('error');
    };
    const buffered = this.messagesToSend.pipe(buffer(bufferTrigger));
    const whileConnectionOpen = this.messagesToSend.pipe(
      filter(() => this.ws.readyState === WebSocket.OPEN && this.open)
    );
    merge(buffered, whileConnectionOpen).subscribe((msg) => {
      console.log(msg);
      const sendMsg = (msgToSend: string) => {
        const payloadSize = msgToSend;
        // let utf8Encode = new TextEncoder();
        // utf8Encode.encode(msgToSend);
        const buffer = this.createFrame(msgToSend);
        this.ws.send(buffer);
      };
      if (Array.isArray(msg)) {
        msg.forEach((entry) => sendMsg(entry));
      } else {
        sendMsg(msg);
      }
    });
    this.ws.onopen = () => {
      console.log('open');
      // bufferTrigger.next();

      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const nonce = btoa(String.fromCharCode.apply(null, [...randomBytes]));
      this.ws.send(
        new Blob([
          `GET /api/ws?src=tedge_cam HTTP/1.1\r\n` +
            `Host: 127.0.0.1:1984\r\n` +
            `Connection: keep-alive, Upgrade\r\n` +
            `Accept: */*\r\n` +
            `Upgrade: websocket\r\n` +
            `Sec-WebSocket-Key: ${nonce}\r\n` +
            `Sec-WebSocket-Version: 13\r\n` +
            `\r\n`,
        ])
      );
    };
  }

  createFrame(data: string) {
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
  }

  processData(data: Uint8Array) {
    // Combine new data with existing buffer
    const newBuffer = new Uint8Array(this.reciveBuffer.length + data.length);
    newBuffer.set(this.reciveBuffer);
    newBuffer.set(data, this.reciveBuffer.length);
    this.reciveBuffer = newBuffer;

    // Process frames while we have enough data
    while (this.reciveBuffer.length >= 2) {
      const frameInfo = this.parseFrameHeader();
      if (!frameInfo) return;

      const { payloadLength, headerLength } = frameInfo;
      const totalLength = headerLength + payloadLength;

      // Check if we have the complete frame
      if (this.reciveBuffer.length < totalLength) return;

      // Extract and process the frame
      const frame = this.extractFrame(headerLength, payloadLength);
      if (frame) {
        this.handleFrame(frame);
      }

      // Remove processed frame from buffer
      this.reciveBuffer = this.reciveBuffer.slice(totalLength);
    }
  }

  parseFrameHeader() {
    const firstByte = this.reciveBuffer[0];
    const secondByte = this.reciveBuffer[1];

    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    // Handle extended payload lengths
    if (payloadLength === 126) {
      if (this.reciveBuffer.length < 4) return null;
      payloadLength = (this.reciveBuffer[2] << 8) | this.reciveBuffer[3];
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (this.reciveBuffer.length < 10) return null;
      payloadLength = 0;
      for (let i = 0; i < 8; i++) {
        payloadLength = (payloadLength << 8) | this.reciveBuffer[2 + i];
      }
      headerLength = 10;
    }

    // Add mask bytes to header length if frame is masked
    if (masked) {
      headerLength += 4;
    }

    return { payloadLength, headerLength, masked, opcode, fin };
  }

  extractFrame(headerLength: number, payloadLength: number) {
    const masked = (this.reciveBuffer[1] & 0x80) === 0x80;
    const payload = new Uint8Array(payloadLength);

    if (masked) {
      const maskKey = this.reciveBuffer.slice(headerLength - 4, headerLength);
      // Unmask the payload
      for (let i = 0; i < payloadLength; i++) {
        payload[i] = this.reciveBuffer[headerLength + i] ^ maskKey[i % 4];
      }
    } else {
      payload.set(
        this.reciveBuffer.slice(headerLength, headerLength + payloadLength)
      );
    }

    return payload;
  }

  handleFrame(payload: Uint8Array) {
    // Convert payload to text
    const textDecoder = new TextDecoder('utf-8');
    const message = textDecoder.decode(payload);

    // Call message callback if set
    this.responses.next(message);
    console.log(message);
  }

  sendMsg(msg: string) {
    console.log('sending', msg);
    this.messagesToSend.next(msg);
  }

  responses$(): Observable<string> {
    return this.responses.asObservable();
  }

  close() {
    this.ws.close();
    this.messagesToSend.complete();
    this.responses.complete();
  }
}

@Injectable({ providedIn: 'root' })
export class SignalingService {
  extractRCAIdFromDevice(device: IManagedObject): string | null {
    const { c8y_RemoteAccessList: remoteAccessList } = device;
    if (!remoteAccessList || !Array.isArray(remoteAccessList)) {
      return null;
    }

    const entry = remoteAccessList.find(
      ({ name }) =>
        typeof name === 'string' && name.toLowerCase().includes('webcam')
    );

    return entry?.id;
  }

  establishSignalingConnection(
    deviceId: string,
    configId: string,
    token: string,
    xsrf: string
  ): SignalingConnection {
    return new SignalingConnection(deviceId, configId, token, xsrf);
  }
}
