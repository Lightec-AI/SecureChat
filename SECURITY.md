# Security Deployment Guide

This document captures practical security controls for deploying SecureChat across web, desktop (Electron), and mobile wrappers.

## Security Goals

- Prevent remote code execution via XSS and unsafe navigation.
- Protect conversation data at rest when local persistence is enabled.
- Reduce blast radius for credential/session compromise.
- Keep a clear path toward end-to-end encrypted conversation storage.

## Baseline Hardening Checklist

- Keep dependencies updated; patch high/critical CVEs first.
- Run with TLS in production (reverse proxy or ingress).
- Restrict admin interfaces by network policy and strong authentication.
- Store secrets in environment/secret manager, never in git.
- Enable logging/alerting for auth and privilege events.

## Web Deployment Controls

### 1) Content Security Policy (CSP)

SecureChat sets CSP and related security headers in `api/server/index.js`.

- `script-src 'self'`
- `object-src 'none'`
- `frame-ancestors 'none'`
- restrictive `connect-src` with optional allowlist override

To allow additional API endpoints safely:

- Use `CSP_CONNECT_SRC` env var with comma-separated origins.
- Avoid adding broad wildcards (`*`) unless absolutely necessary.

### 2) Reverse Proxy

Recommended proxy behavior:

- Force HTTPS + HSTS.
- Strip untrusted forwarding/tenant headers from public traffic.
- Limit request body sizes.
- Rate-limit auth and high-cost endpoints.

### 3) Cookies and Session

- Use secure, httpOnly cookies in production.
- Use strict/limited same-site policy as app flow permits.
- Rotate JWT/session secrets periodically.

## XSS Mitigation Requirements

- Keep HTML/markdown sanitization strict (no untrusted script execution).
- Do not inject unsanitized user content into `dangerouslySetInnerHTML`.
- Disallow `javascript:` and similar dangerous URL schemes.
- Keep `script-src` free of `unsafe-inline` and `unsafe-eval`.

## Electron Desktop Controls

Current security posture in `apps/desktop/electron/main.js` includes:

- `contextIsolation: true`
- `nodeIntegration: false`
- renderer `sandbox: true`
- blocked `webview` attachment
- denied permission requests by default
- in-app navigation restricted to the configured app origin
- external links opened only for safe schemes (`https`, `http`, `mailto`)

Operational recommendations:

- Do not expose generic filesystem/network IPC APIs.
- Validate all IPC inputs with strict schema and path checks.
- Code-sign desktop builds for distribution.

## Mobile Controls (Capacitor)

- Use latest Capacitor runtime and plugins.
- Keep iOS deployment target in sync with plugin requirements.
- Enforce ATS / Android network security config for trusted domains.
- Prefer platform keystore/keychain for optional local encryption keys.

## Local Conversation Encryption Notes

Current web implementation:

- AES-GCM encryption key is browser-managed (IndexedDB).
- Encrypted payload format: header + `base64(iv):base64(ciphertext)`.
- This protects against casual file inspection, not active XSS in-session.

Desktop/mobile option:

- For users requiring stronger at-rest guarantees, prefer KEK in platform keychain/keystore and wrap DEKs used for chat files.

## Incident Response Basics

- Rotate secrets immediately after compromise suspicion.
- Revoke active sessions/tokens when account takeover is suspected.
- Preserve relevant logs for forensics before cleanup.
- Communicate impact and required user actions quickly.

## Verification Routine (Release Gate)

Before release:

- Run unit/integration tests for security-sensitive paths.
- Validate CSP in browser devtools response headers.
- Verify Electron navigation guard behavior with malicious URLs.
- Confirm no new `eval`/`Function` patterns in changed frontend code.
- Review dependency advisories and acknowledge any accepted residual risk.
