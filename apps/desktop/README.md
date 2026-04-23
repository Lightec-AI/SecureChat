# SecureChat Desktop Wrapper

Electron-based desktop shell for SecureChat with packaging targets:

- macOS
- Windows
- Linux

## Commands

From repo root:

- `npm run desktop:postinstall`
- `npm run desktop:dev`
- `npm run desktop:dist`

By default it loads `http://localhost:3080`.
Set `SECURECHAT_DESKTOP_URL` to point to another endpoint.

## Native local file access

The desktop shell exposes native APIs to the renderer through preload:

- `window.secureChatDesktop.workspace.choose()`
- `window.secureChatDesktop.workspace.get()`
- `window.secureChatDesktop.workspace.list(relativePath)`
- `window.secureChatDesktop.workspace.readText(relativePath)`
- `window.secureChatDesktop.workspace.writeText(relativePath, content)`

All file operations are constrained to the selected workspace folder.
