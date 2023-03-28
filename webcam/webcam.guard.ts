import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate } from "@angular/router";
import { SignalingService } from "./signaling.service";

@Injectable({ providedIn: "root" })
export class WebcamGuard implements CanActivate {
  constructor(private signaling: SignalingService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const contextData = route.data.contextData || route.parent.data.contextData;
    const { c8y_SupportedOperations: supportedOperations } = contextData;
    if (!supportedOperations || !Array.isArray(supportedOperations)) {
      return false;
    }
    if (!supportedOperations.includes("c8y_RemoteAccessConnect")) {
      return false;
    }

    return !!this.signaling.extractRCAIdFromDevice(contextData);
  }
}
