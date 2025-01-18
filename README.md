# Cumulocity WebRTC Webcam Plugin

A plugin that allows to access the webcam of compatible Cumulocity devices via [WebRTC](https://en.wikipedia.org/wiki/WebRTC).
WebRTC allows to create a peer-to-peer connection between the Cumulocity device and the browser to stream the video.
Because of that the video traffic does not have to go through another server or e.g. Cumulocity, which saves bandwith and costs.

![](images/webcam.png)

The Webcam plugin adds a Webcam tab to compatible devices in the app you install it to. You can e.g. install it to the `Devicemanagement` or `Cockpit` application.

The plugin uses by default some [STUN servers](https://de.wikipedia.org/wiki/Session_Traversal_Utilities_for_NAT) by Google to find the public IP addresses of the peer in order to establish the peer-to-peer connection. You can configure a different set of [ICE servers](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) (STUN or TURN) via the configuration plugin included in the package.

Depending on the firewall setup beteen the two peers it might happen that a peer-to-peer connection can not be established.
In that case a third party [TURN server](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT) is required, where the video traffic passes through. You can host such a server on your own with e.g. [Coturn](https://github.com/coturn/coturn).

The plugin works with devices that have [go2rtc](https://github.com/AlexxIT/go2rtc) installed and configured and are running a Cumulocity agent which supports the [Cloud Remote Access feature of Cumulocity](https://cumulocity.com/docs/cloud-remote-access/cra-general-aspects/). The recommended agent would be [thin-edge.io](https://thin-edge.io/).

The plugin uses Cumulocity's remote-access-connect feature in `PASSTHROUGH` mode to establish a WebSocket connection between the browser and an WebRTC server like e.g. [go2rtc](https://github.com/AlexxIT/go2rtc) running on the device. Ensure that this microservice together with it's `PASSTHROUGH` mode is available on your Cumulocity tenant.

## Installation instructions go2rtc

- download the latest release of [go2rtc](https://github.com/AlexxIT/go2rtc/releases) that matches the architecture of your device to your current users home directory
```bash
wget https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
```
- copy the `go2rtc.yaml` file also into your home directory
- Adjust the `streams` section of the `go2rtc.yaml` file according to your needs, just keep the `tedge_cam` as the name of your stream.
- You can verify the setup, by starting it temporarily by executing the previously downloaded binary:
```bash
./go2rtc_linux_arm64
```
by connecting to `http://<local-ip-of-tedge>:1984/stream.html?src=tedge_cam&mode=webrtc` with your browser you should be able to see the camera stream.
- Depending on your firewall setup you may also need to add a [TURN server](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT) to the `ice_servers` section.
- You might want to adjust the `listen` attributes of the `api`, `rtsp`, and `srtp` sections of these files to be prefixed with `127.0.0.1` (e.g. `127.0.0.1:1984` for the `api`) to only allow local connections
- copy and adjust the `go2rtc.service` file to `/etc/systemd/system/go2rtc.service`, adjust it to your setup (e.g. the `ExecStart`, `WorkingDirectory`, `User` and `Group` settings might need to be adjusted if you are not using a user called `ubuntu`)
- you can then start and enable the service:
```bash
sudo systemctl start go2rtc
sudo systemctl enable go2rtc
```

## Usage

- Install the plugin to  your cockpit and/or devicemanagement application.
- Go to your device in the devicemanagement application and create a new Remote Access configuration.
The configuration should be of type `PASSTHROUGH`, the host should point to the host running [go2rtc](https://github.com/AlexxIT/go2rtc) (most probably `127.0.0.1` if you are running it on the same device as your thin-edge agent) and the port should be configured to the http port of go2rtc (in the default configuration that should be `1984`).
The name of the configuration should start with `webcam:` as this is used to identify the configuration as compatbile to be used by this plugin.
- after refreshing the page or navigating another time to the device you should see a new tab with the configuration name that you gave it (without the `webcam:` prefix), where you can start the video stream via the play button in the action bar.

## Debugging

- the WebRTC connection can be e.g. debugged from firefox by visiting `about:webrtc`.

---

These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
