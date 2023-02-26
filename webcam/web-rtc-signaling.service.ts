import { Injectable } from "@angular/core";
import { IOperation, OperationService, OperationStatus } from "@c8y/client";
import { OperationRealtimeService } from "@c8y/ngx-components";
import { Observable } from "rxjs";
import { filter, map, startWith, tap, take } from "rxjs/operators";

const type = "c8y_Webcam";

@Injectable()
export class WebRtcSignalingService {
  constructor(
    private operation: OperationService,
    private realtime: OperationRealtimeService
  ) {}

  requestOffer$(deviceId: string, connectionUUID: string): Observable<{
    candidates: RTCIceCandidateInit[];
    offer: RTCSessionDescriptionInit;
  }> {
    const uuid = crypto.randomUUID();
    return this.operationUpdates$(uuid, deviceId).pipe(
      startWith(false),
      tap((tmp) => {
        if (tmp === false) {
          this.requestOffer(connectionUUID, uuid, deviceId);
        }
      }),
      filter((tmp) => !!tmp),
      filter((tmp: IOperation) => tmp.status === OperationStatus.SUCCESSFUL),
      map((tmp) => tmp[`${type}_Offer`]),
      take(1)
    );
  }

  createAnswer$(deviceId: string, connectionUUID: string, answer: any, candidates: any[]) {
    const uuid = crypto.randomUUID();
    return this.operationUpdates$(uuid, deviceId).pipe(
      startWith(false),
      tap((tmp) => {
        if (tmp === false) {
          this.createAnswer(
            connectionUUID,
            uuid,
            deviceId,
            answer,
            candidates
          );
        }
      }),
      filter((tmp) => !!tmp),
      filter((tmp: IOperation) => tmp.status === OperationStatus.SUCCESSFUL)
    );
  }

  requestCleanUp(connectionUUID: string, uuid: string, deviceId: string) {
    this.operation.create({
      deviceId,
      connectionUUID,
      uuid,
      description: "Requesting cleanup of WebRTC session",
      [type]: {},
      [`${type}_Cleanup`]: {},
    });
  }

  private requestOffer(connectionUUID: string, uuid: string, deviceId: string) {
    this.operation.create({
      deviceId,
      connectionUUID,
      uuid,
      description: "Requesting WebRTC offer",
      [type]: {},
      [`${type}_OfferRequest`]: {},
    });
  }

  private createAnswer(
    connectionUUID: string,
    uuid: string,
    deviceId: string,
    answer: any,
    candidates: RTCIceCandidate[]
  ) {
    this.operation.create({
      deviceId,
      connectionUUID,
      uuid,
      description: "Sending WebRTC answer",
      [type]: {},
      [`${type}_Answer`]: {
        answer,
        candidates,
      },
    });
  }

  private operationUpdates$(uuid: string, deviceId: string) {
    return this.realtime
      .onUpdate$(deviceId)
      .pipe(filter((tmp) => tmp.uuid === uuid));
  }
}
