# Cumulocity WebRTC Webcam Plugin

A plugin that allows to access the webcam of compatible Cumulocity devices via [WebRTC](https://en.wikipedia.org/wiki/WebRTC).
WebRTC allows to create a peer-to-peer connection between the Cumulocity device and the browser to stream the video.
Because of that the video traffic does not have to go through another server or e.g. Cumulocity, which saves bandwith and costs.

![](images/webcam.png)

The Webcam plugin adds a Webcam tab to compatible devices in the app you install it to. You can e.g. install it to the `Devicemanagement` or `Cockpit` application.

The plugin uses by default some [STUN servers](https://de.wikipedia.org/wiki/Session_Traversal_Utilities_for_NAT) by Google to find the public IP addresses of the peer in order to establish the peer-to-peer connection. You can configure a different set of [ICE servers](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) (STUN or TURN) via the configuration plugin included in the package.

Depending on the firewall setup beteen the two peers it might happen that a peer-to-peer connection can not be established.
In that case a third party [TURN server](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT) is required, where the video traffic passes through. You can host such a server on your own with e.g. [Coturn](https://github.com/coturn/coturn).

Have a look at this [thin-edge extension](https://github.com/thin-edge/thin-edge.io_examples/pull/54) for a sample Cumulocity agent, that supports this feature.

The plugin uses Cumulocity's remote-access-connect feature in `PASSTHROUGH` mode to establish a WebSocket connection between the browser and an WebRTC server like e.g. [go2rtc](https://github.com/AlexxIT/go2rtc) running on the device. Ensure that this microservice together with it's `PASSTHROUGH` mode is available on your Cumulocity tenant.

With the current set of changes this plugin is no longer compatible with the [electron-agent](https://github.com/SoftwareAG/cumulocity-electron-agent).

---

This tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.

---

For more information you can Ask a Question in the [TECHcommunity Forums](https://tech.forums.softwareag.com/tags/c/forum/1/Cumulocity-IoT).

You can find additional information in the [Software AG TECHcommunity](https://tech.forums.softwareag.com/tag/Cumulocity-IoT).
