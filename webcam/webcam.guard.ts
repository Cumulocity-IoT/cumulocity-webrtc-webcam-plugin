import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate } from "@angular/router";

@Injectable({ providedIn: "root" })
export class WebcamGuard implements CanActivate {
  constructor() {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const contextData = route.data.contextData || route.parent.data.contextData;
    const { c8y_SupportedOperations: supportedOperations } = contextData;
    if (!supportedOperations || !Array.isArray(supportedOperations)) {
      return false;
    }
    return supportedOperations.includes("c8y_Webcam");
  }
}
