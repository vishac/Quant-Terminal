import fs from 'fs';
import path from 'path';

const iconPath = path.resolve('public', 'apple-touch-icon.png');
let iconBase64 = '';
if (fs.existsSync(iconPath)) {
  iconBase64 = fs.readFileSync(iconPath).toString('base64');
}

const defaultAppUrl = 'https://ais-pre-vukfnptjjqdoqpnhegsft2-932561199131.asia-southeast1.run.app';

const mobileconfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            ${iconBase64 ? `<key>Icon</key>\n            <data>${iconBase64}</data>` : ''}
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>JARVIS Quant</string>
            <key>PayloadDescription</key>
            <string>Configures Standalone App Web Clip for J.A.R.V.I.S. Institutional Quant Terminal</string>
            <key>PayloadDisplayName</key>
            <string>JARVIS Quant Terminal WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.jarvis.quant.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>B6C3A401-D181-45F6-6F9F-005155244201</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${defaultAppUrl}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>J.A.R.V.I.S. Quant Terminal</string>
    <key>PayloadIdentifier</key>
    <string>com.jarvis.quant.profile</string>
    <key>PayloadOrganization</key>
    <string>J.A.R.V.I.S. Quantitative Systems</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>B6C3A402-D181-45F6-6F9F-005155244202</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

fs.writeFileSync(path.resolve('public', 'jarvis-quant-ios.mobileconfig'), mobileconfigXml, 'utf-8');
console.log('Generated public/jarvis-quant-ios.mobileconfig successfully');
