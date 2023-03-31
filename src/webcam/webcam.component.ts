import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BasicAuth, IManagedObject } from '@c8y/client';
import { concatMap } from 'rxjs/operators';
import { IceServerConfigurationService } from '../ice-server-configuration.service';
import { SignalingConnection, SignalingService } from './signaling.service';

enum WebRTCSignalingMessageTypes {
  offer = 'webrtc/offer',
  candidate = 'webrtc/candidate',
  answer = 'webrtc/answer',
}

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  providers: [],
})
export class WebcamComponent implements OnDestroy {
  // Global State
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  connectionUUID: string;
  device: IManagedObject;
  signaling: SignalingConnection;

  constructor(
    private activatedRoute: ActivatedRoute,
    private iceConfig: IceServerConfigurationService,
    private basicAuth: BasicAuth,
    private signalingService: SignalingService
  ) {
    this.device = this.activatedRoute.parent.snapshot.data.contextData;
  }

  ngOnDestroy(): void {
    this.hangUp();
  }

  async call() {
    const { token, xsrf } = this.getToken();
    const configId = this.signalingService.extractRCAIdFromDevice(this.device);
    this.signaling = this.signalingService.establishSignalingConnection(
      this.device.id,
      configId,
      token,
      xsrf
    );
    const iceServers = await this.iceConfig.getIceServers();
    const iceConfig: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };
    this.pc = new RTCPeerConnection(iceConfig);
    this.remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };
    this.pc.onconnectionstatechange = (event) => {
      console.log(event);
    };

    this.signaling
      .responses$()
      .pipe(concatMap((tmp: Blob) => tmp.text()))
      .subscribe((msg) => {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === WebRTCSignalingMessageTypes.answer) {
            this.pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: parsed.value })
            );
          } else if (parsed.type === WebRTCSignalingMessageTypes.candidate) {
            this.pc
              .addIceCandidate({ candidate: parsed.value, sdpMid: '0' })
              .catch((tmp) => console.error(tmp));
          }
        } catch (e) {
          console.log(e);
          console.error(msg);
        }
      });

    await this.getOffer(this.signaling);
  }

  async hangUp() {
    this.pc?.close();
    this.signaling?.close();
    this.remoteStream = undefined;
    this.pc = undefined;
    this.signaling = undefined;
  }

  private async getOffer(signaling: SignalingConnection): Promise<void> {
    const promise = new Promise<void>((resolve) => {
      this.pc.onicegatheringstatechange = () => {
        if (this.pc.iceGatheringState === 'complete') {
          console.log('Gathering completed');
          resolve();
        }
      };
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling.sendMsg(
            JSON.stringify({
              type: WebRTCSignalingMessageTypes.candidate,
              value: event.candidate.toJSON().candidate,
            })
          );
        } else {
          signaling.sendMsg(
            JSON.stringify({
              type: WebRTCSignalingMessageTypes.candidate,
              value: '',
            })
          );
        }
      };
    });
    const offerDescription = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    signaling.sendMsg(
      JSON.stringify({
        type: WebRTCSignalingMessageTypes.offer,
        value: offerDescription.sdp,
      })
    );
    await this.pc.setLocalDescription(offerDescription);
    return await promise;
  }

  private getToken(): { token: string; xsrf: string } {
    const { headers } = this.basicAuth.getFetchOptions({});
    const { Authorization: token, 'X-XSRF-TOKEN': xsrf } = headers;
    if (token && token !== 'Basic ') {
      return { token, xsrf };
    }

    return { token: '', xsrf };
  }
}
