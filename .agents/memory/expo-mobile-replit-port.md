---
name: Expo Mobile Replit Port Configuration
description: How to configure the port for a kind=mobile Expo artifact on Replit so the workflow health check passes
---

## The Rule
For `kind = "mobile"` artifacts with `router = "expo-domain"`, the Expo dev domain health check routes to the **system-assigned PORT** (5000 in this project), not an arbitrary port.

Set `localPort = 5000` and `PORT = "5000"` in `[services.env]` in artifact.toml. Verify the real system port by running `echo $PORT` in bash — it will show 5000, not 23054 or 3000.

## Why
The platform routes `$REPLIT_EXPO_DEV_DOMAIN` → `localPort`. If `localPort` doesn't match the actual system port, the health check polls a port where nothing is listening and always fails with `DIDNT_OPEN_A_PORT` (even though the port appears open via `/proc/net/tcp6`).

## How to Apply
- Always check `$PORT` in bash to confirm the system-assigned port before configuring `localPort`
- Metro must run **directly** on `$PORT` (not behind a proxy on a different port)
- Keep `router = "expo-domain"` — it wires the Expo dev domain to the service
- Don't override PORT in `[services.env]` with a wrong value

## Additional Lessons
- `reactCompiler: true` in `app.json` requires React 19; on React 18 it causes `compiler-runtime` warnings and potential issues — remove it for SDK 54 projects
- `SplashScreen.preventAutoHideAsync()` must be guarded with `Platform.OS !== "web"` or the web preview renders blank forever
- Missing packages for a fresh Expo SDK 54 app: `expo-blur`, `expo-web-browser`, `@react-native-async-storage/async-storage`, `react-native-web`, `react-dom`
- Pre-warming the Metro cache via `expo export --platform web` before workflow restart dramatically speeds up subsequent Metro starts
