# [3.0.0](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/compare/v2.0.1...v3.0.0) (2025-01-18)


### Features

* Upgrade WebSDK to version 1021 and tunnel websocket via websocket ([#3](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/issues/3)) ([8ec8863](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/commit/8ec8863235f2ab71775315d85ba8d61a2b586d3f))


### BREAKING CHANGES

* The custom implementation of remote access connect (https://github.com/thin-edge/thin-edge.io_examples/pull/54) is no longer required and will no longer work with this version

## [2.0.1](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/compare/v2.0.0...v2.0.1) (2023-04-04)


### Bug Fixes

* copy LICENSE file into build ([#2](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/issues/2)) ([e746dcf](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/commit/e746dcf7fde4db64a474565f0515c79628334a17))

# [2.0.0](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/compare/v1.0.0...v2.0.0) (2023-03-31)


### Features

* adjust to remote access connect approach ([#1](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/issues/1)) ([b28f511](https://github.com/Cumulocity-IoT/cumulocity-webrtc-webcam-plugin/commit/b28f511cc6f57379438469452bfdc281483337dd))


### BREAKING CHANGES

* The way of establishing the WebRTC connection has changed and is no longer compatible with the old implementation.
