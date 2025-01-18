import type { ConfigurationOptions } from '@c8y/devkit';
import { version, name, license, author } from './package.json';

export default {
  runTime: {
    version,
    name: 'WebRTC Webcam Plugin',
    contextPath: 'sag-ps-iot-pkg-webrtc-webcam-plugin',
    key: 'sag-ps-iot-pkg-webrtc-webcam-plugin-application-key',
    dynamicOptionsUrl: true,
    isPackage: true,
    license,
    author,
    package: 'plugin',
    exports: [
      {
        name: 'Webcam plugin',
        module: 'WebcamPluginModule',
        path: './src/app/webcam/webcam.module.ts',
        description: 'Adds a webcam tab to supported devices.'
      },
      {
        name: 'WebRTC ice server config plugin',
        module: 'IceServerConfigurationModule',
        path: './src/app/ice-server-configuration/ice-server-configuration.module.ts',
        description: 'Allows to configure the ice servers to be used for WebRTC.'
      }
    ],
    remotes: {
      'sag-ps-iot-pkg-webrtc-webcam-plugin': [
        'WebcamPluginModule',
        'IceServerConfigurationModule'
      ]
    }
  },
  buildTime: {
    federation: [
      '@angular/animations',
      '@angular/cdk',
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/router',
      '@c8y/client',
      '@c8y/ngx-components',
      'ngx-bootstrap',
      '@ngx-translate/core',
      '@ngx-formly/core'
    ],
    copy: [
      {
        from: 'CHANGELOG.md',
        to: 'CHANGELOG.md',
        noErrorOnMissing: true
      },
      {
        from: 'images',
        to: 'images'
      },
      {
        from: 'LICENSE',
        to: 'LICENSE.txt'
      }
    ]
  }
} as const satisfies ConfigurationOptions;
