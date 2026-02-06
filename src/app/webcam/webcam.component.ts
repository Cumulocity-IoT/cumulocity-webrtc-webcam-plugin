import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FetchClient } from '@c8y/client';
import { IceServerConfigurationService } from '../ice-server-configuration.service';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  from,
  fromEvent,
  map,
  merge,
  NEVER,
  Observable,
  of,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { signalingConnection } from './signaling.service';

enum WebRTCSignalingMessageTypes {
  offer = 'webrtc/offer',
  candidate = 'webrtc/candidate',
  answer = 'webrtc/answer',
}

@Component({
  selector: 'app-webrtc-webcam',
  templateUrl: './webcam.component.html',
  providers: [],
  standalone: false
})
export class WebcamComponent {
  mediaStream$: Observable<MediaStream> | undefined;

  constructor(
    private activatedRoute: ActivatedRoute,
    private iceConfig: IceServerConfigurationService,
    private fetch: FetchClient
  ) {}

  play() {
    const rcaId$ = this.activatedRoute.params.pipe(
      map((params) => params['rcaId']),
      filter(Boolean),
      distinctUntilChanged()
    );
    const deviceId$ =
      this.activatedRoute.parent?.data.pipe(
        map((data) => data['contextData']['id']),
        filter(Boolean),
        distinctUntilChanged()
      ) || NEVER;

    this.mediaStream$ = combineLatest([deviceId$, rcaId$]).pipe(
      switchMap(([deviceId, configId]) => {
        return this.call(deviceId, configId);
      })
    );
  }

  stop() {
    this.mediaStream$ = undefined;
  }

  private call(deviceId: string, configId: string) {
    const { token, xsrf } = this.getToken();
    const peerConnection$ = from(this.iceConfig.getIceServers()).pipe(
      switchMap((serviers) => {
        return new Observable<RTCPeerConnection>((observer) => {
          const peerConnection = new RTCPeerConnection({
            iceServers: serviers,
            iceCandidatePoolSize: 10,
          });
          observer.next(peerConnection);

          return {
            unsubscribe: () => {
              peerConnection.close();
            },
          };
        }).pipe(share());
      })
    );

    const mediaStreamAndPeerConnection$ = peerConnection$.pipe(
      switchMap((peerConnection) => {
        const mediaStream = new MediaStream();
        const track$ = fromEvent<RTCTrackEvent>(peerConnection, 'track').pipe(
          tap((event) => {
            event.streams[0].getTracks().forEach((track) => {
              mediaStream?.addTrack(track);
            });
          })
        );

        return merge(
          of({ mediaStream, peerConnection }),
          merge(track$).pipe(switchMap(() => NEVER))
        );
      })
    );

    const details$ = mediaStreamAndPeerConnection$.pipe(
      switchMap(({ mediaStream, peerConnection }) => {
        const signaling = signalingConnection({
          deviceId,
          configId,
          token,
          xsrf,
          host: '127.0.0.1',
          port: '1984',
          webcam: 'tedge_cam',
        });

        const connectionState$ = fromEvent<Event>(
          peerConnection,
          'connectionstatechange'
        ).pipe(
          startWith(null),
          map(() => {
            return peerConnection.connectionState;
          })
        );

        const canCloseSignalingConnection$ = connectionState$.pipe(
          filter((state) => {
            return (
              state === 'connected' ||
              state === 'failed' ||
              state === 'closed' ||
              state === 'disconnected'
            );
          })
        );

        const signalingMessages$ = signaling.pipe(
          takeUntil(canCloseSignalingConnection$),
          tap((msg) => {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.type === WebRTCSignalingMessageTypes.answer) {
                peerConnection.setRemoteDescription(
                  new RTCSessionDescription({
                    type: 'answer',
                    sdp: parsed.value,
                  })
                );
              } else if (
                parsed.type === WebRTCSignalingMessageTypes.candidate
              ) {
                peerConnection
                  .addIceCandidate({ candidate: parsed.value, sdpMid: '0' })
                  .catch((tmp) => console.error(tmp));
              }
            } catch (e) {
              console.log(e);
              console.error(msg);
            }
          })
        );

        return merge(
          of({ mediaStream, signaling, peerConnection }),
          signalingMessages$.pipe(switchMap(() => NEVER))
        );
      })
    );

    return details$.pipe(
      switchMap(({ mediaStream, signaling, peerConnection }) => {
        const iceGatheringStateChange$ = fromEvent(
          peerConnection,
          'icegatheringstatechange'
        ).pipe(filter(() => peerConnection.iceGatheringState === 'complete'));

        const iceCandidate$ = fromEvent<RTCPeerConnectionIceEvent>(
          peerConnection,
          'icecandidate'
        ).pipe(
          tap((event) => {
            if (event.candidate) {
              signaling.send(
                JSON.stringify({
                  type: WebRTCSignalingMessageTypes.candidate,
                  value: event.candidate.toJSON().candidate,
                })
              );
            } else {
              signaling.send(
                JSON.stringify({
                  type: WebRTCSignalingMessageTypes.candidate,
                  value: '',
                })
              );
            }
          })
        );

        const createOffer$ = from(
          peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
        ).pipe(
          switchMap((offerDescription) => {
            signaling.send(
              JSON.stringify({
                type: WebRTCSignalingMessageTypes.offer,
                value: offerDescription?.sdp,
              })
            );
            return peerConnection.setLocalDescription(offerDescription);
          })
        );

        return merge(
          of(mediaStream),
          merge(createOffer$, iceCandidate$, iceGatheringStateChange$).pipe(
            switchMap(() => NEVER)
          )
        );
      })
    );
  }

  private getToken(): { token: string; xsrf: string } {
    const { headers } = this.fetch.getFetchOptions();
    let { Authorization: token, 'X-XSRF-TOKEN': xsrf } = headers;
    if (token) {
      token = token.replace('Basic ', '');
    }
    if (token) {
      return { token, xsrf };
    }

    return { token: '', xsrf };
  }
}
