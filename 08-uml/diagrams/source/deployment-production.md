# Deployment — Production on Azure (as running on 2026-10-19)

Source: `lavarapido-infra/docker-compose.yml` + `docker-compose.prod.yml`, `deploy/Caddyfile`,
`deploy/update-server.sh`, `deploy/ci-deploy.sh`, `.github/workflows/deploy.yml`, and the server itself
(`docker ps`, read on 2026-10-19). Details and measurements: `10-devops/production.md` and the
Deployment Document of `lavarapido-docs`.

```mermaid
flowchart TB
    browser([Browser<br/>web app]):::person
    phone([Android phone<br/>LavaRápido APK]):::person
    team([Team member<br/>own SSH key]):::person
    gha[GitHub Actions<br/>Desplegar en Azure]:::ext
    expo[Expo Push API]:::ext
    gmail[Gmail SMTP]:::ext

    subgraph azure["Azure · VM vehiclecarwash-vm · Ubuntu 24.04 · 2 vCPU · 7.7 GB · 64.236.160.129"]
        subgraph docker["Docker 29 + Compose v5 · network lavarapido_default"]
            caddy["caddy<br/>:80 / :443 (only public ports)<br/>Let's Encrypt TLS 1.3"]
            web["web<br/>nginx + Angular build"]
            gw["api-gateway :8080"]
            sec["security-service :3001"]
            cus["customer-service :3002"]
            boo["booking-service :3003"]
            ops["operations-service :3004"]
            pay["payment-service :3005 (.NET 8)"]
            noti["notification-service :3006"]
            mq[["rabbitmq :5672"]]
            db[("sqlserver :1433<br/>SQL Server 2022 Express<br/>LavaRapido · 57 tables")]
            init["db-init (creates the database, exits 0)"]
            mig["payment-migrate<br/>Liquibase for payment and promotion (exits 0)"]
            dl[/"deploy/downloads<br/>APK + version.json"/]
        end
        portainer["Portainer<br/>127.0.0.1:9443 (SSH tunnel only)"]
        scripts["deploy/update-server.sh<br/>deploy/ci-deploy.sh · publish-apk.sh"]
    end

    browser -- "HTTPS lavarapidovehicular.northcentralus.cloudapp.azure.com" --> caddy
    phone -- "HTTPS /api, /app/version.json" --> caddy
    caddy -- "/api/*" --> gw
    caddy -- "/app/*" --> dl
    caddy -- "everything else" --> web
    gw --> sec & cus & boo & ops & pay & noti
    sec & cus & boo & ops & pay & noti --> db
    sec & boo & ops & pay -- publish --> mq
    mq -- consume --> cus & ops & noti
    init --> db
    mig --> db
    noti --> expo
    noti --> gmail
    sec -- recovery code --> gmail
    team -- "SSH :22 (key in authorized_keys)" --> scripts
    gha -- "SSH :22 restricted key → ci-deploy.sh" --> scripts
    scripts -- "git pull + docker compose up --build" --> docker

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef ext fill:#999,color:#fff
```

| Node | Notes |
|---|---|
| Caddy | Only container with published ports; obtains and renews the certificate (valid until 2027-01-14 at the last check) |
| Services | No ports on the host; Swagger off; memory limit per container, `restart: unless-stopped` |
| SQL Server | Express edition; data in the `sqlserver-data` volume. `db-init` only creates the database; each Java service applies its Liquibase changelog on start-up and `payment-migrate` applies the .NET service's (global numbering up to 039) |
| Mailpit | Not started in production (`dev-only` profile) |
| Portainer | Bound to `127.0.0.1`; reached through an SSH tunnel |
| Access | Members with their own key; GitHub Actions with a restricted key that can only run `ci-deploy.sh` |
