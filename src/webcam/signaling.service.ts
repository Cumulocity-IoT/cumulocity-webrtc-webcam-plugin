import { Injectable } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { merge, Observable, Subject } from 'rxjs';
import { buffer, filter } from 'rxjs/operators';

export class SignalingConnection {
  private ws: WebSocket;
  private responses = new Subject<Blob>();
  private messagesToSend = new Subject<Blob>();
  constructor(deviceId: string, configId: string, token: string, xsrf: string) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol?.includes('https') ? 'wss' : 'ws';
    const port = window.location.port;
    const url = `${protocol}://${hostname}:${port}/service/remoteaccess/client/${deviceId}/configurations/${configId}?token=${token}&XSRF-TOKEN=${xsrf}`;
    const bufferTrigger = new Subject();
    this.ws = new WebSocket(url, ['binary']);
    this.ws.onmessage = (msg) => {
      console.log('msg', msg.data);
      this.responses.next(msg.data);
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
      filter(() => this.ws.readyState === WebSocket.OPEN)
    );
    merge(buffered, whileConnectionOpen).subscribe((msg) => {
      if (Array.isArray(msg)) {
        msg.forEach((entry) => this.ws.send(entry));
      } else {
        this.ws.send(msg);
      }
    });
    this.ws.onopen = () => {
      console.log('open');
      bufferTrigger.next();
    };
  }

  sendMsg(msg: string) {
    console.log('sending');
    this.messagesToSend.next(new Blob([msg]));
  }

  responses$(): Observable<Blob> {
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
