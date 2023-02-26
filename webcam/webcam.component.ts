import { Component, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IManagedObject } from "@c8y/client";
import { OperationRealtimeService } from "@c8y/ngx-components";
import { WebRtcSignalingService } from "./web-rtc-signaling.service";

@Component({
  selector: "app-webcam",
  templateUrl: "./webcam.component.html",
  providers: [OperationRealtimeService, WebRtcSignalingService],
})
export class WebcamComponent implements OnDestroy {
  servers: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // Global State
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  connectionUUID: string;
  device: IManagedObject;

  constructor(
    public signaling: WebRtcSignalingService,
    private activatedRoute: ActivatedRoute
  ) {
    this.device = this.activatedRoute.parent.snapshot.data.contextData;
  }

  ngOnDestroy(): void {
    this.hangUp();
  }

  async call() {
    const connectionUUID = crypto.randomUUID();
    this.connectionUUID = connectionUUID;
    const { candidates: remoteCandidates, offer } = await this.signaling
      .requestOffer$(`${this.device.id}`, connectionUUID)
      .toPromise();
    console.log(remoteCandidates, offer);
    this.pc = new RTCPeerConnection(this.servers);
    this.remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };
    this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteCandidates.forEach((candidate) => {
      this.pc.addIceCandidate(candidate);
    });
    const { candidates, answerDescription } = await this.getAnswer();

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    };

    const update = await this.signaling
      .createAnswer$(`${this.device.id}`, connectionUUID, answer, candidates)
      .toPromise();
    console.log(update);
  }

  async hangUp() {
    this.pc?.close();
    if (this.connectionUUID) {
      const uuid = crypto.randomUUID();
      this.signaling.requestCleanUp(
        this.connectionUUID,
        uuid,
        `${this.device.id}`
      );
      this.connectionUUID = undefined;
    }
    this.remoteStream = undefined;
    this.pc = undefined;
  }

  private getAnswer(): Promise<{
    candidates: Array<RTCIceCandidate>;
    answerDescription: RTCSessionDescriptionInit;
  }> {
    console.log("getAnswer");
    return new Promise(async (resolve) => {
      const candidates = new Array<RTCIceCandidate>();
      let answerDescription: RTCSessionDescriptionInit;
      this.pc.onicegatheringstatechange = (event) => {
        if (this.pc.iceGatheringState === "complete") {
          console.log("Gathering completed: ", candidates);
          resolve({ candidates, answerDescription });
        }
      };
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate);
        }
      };

      answerDescription = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answerDescription);
    });
  }
}
