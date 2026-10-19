# Sequence — Publishing a new Android APK and telling the users

Source: `LavadoVehicular-Movil/scripts/publish-apk.mjs`, `lavarapido-infra/deploy/publish-apk.sh`,
`notification-service` `InternalAppUpdateController` and `AppUpdateNoticeService`, app
`AppUpdatesCheck.tsx` and `publishedApk.ts`; checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor D as Team member
    participant EAS as EAS Build
    participant VM as Azure VM (deploy/publish-apk.sh)
    participant CD as Caddy (/app/*)
    participant N as notification-service
    participant DB as SQL Server (notification)
    participant X as Expo Push API
    participant APP as Installed app
    actor U as User

    D->>EAS: Android build (versionCode + 1)
    EAS-->>D: APK link
    D->>VM: node scripts/publish-apk.mjs → ssh "bash deploy/publish-apk.sh <url> <versionCode> <notes>"
    VM->>VM: downloads the APK apart and swaps it at once
    VM->>CD: deploy/downloads/LavaRapidoVehicular.apk + version.json {versionCode, url, size, notes}
    alt NOTIFY is not 0
        VM->>N: POST /internal/v1/notifications/app-update {versionCode}<br/>(Docker network, X-Internal-Key from .env.production)
        alt version already announced (processed_event "app-update-v<code>")
            N-->>VM: 0 users
        else
            N->>DB: users with an active device token
            loop each user
                N->>DB: APP_UPDATE_AVAILABLE in the inbox (reference app_version)
                N->>X: push
            end
            N->>DB: processed_event app-update-v<code>
            N-->>VM: number of users notified
        end
    end

    U->>APP: Opens the app
    APP->>CD: GET /app/version.json
    alt published versionCode > installed versionCode
        APP-->>U: "New version" → download
        U->>CD: GET /app/LavaRapidoVehicular.apk
    end
```

The web download button reads the same `version.json`. The `/internal` route is never published by the
gateway or Caddy; the script calls it from inside the Docker network.
