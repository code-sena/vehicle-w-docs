# Deployment — Production on Azure (as running on 2026-10-19)

Source: `lavarapido-infra/docker-compose.yml` + `docker-compose.prod.yml`, `deploy/Caddyfile`,
`deploy/update-server.sh`, `deploy/ci-deploy.sh`, `.github/workflows/deploy.yml`, and the server itself
(`docker ps`, read on 2026-10-19). Details and measurements: `10-devops/production.md` and the
Deployment Document of `lavarapido-docs`.

```mermaid
flowchart TB
    browser([Browser]):::person
    phone([Android phone<br/>LavaRápido APK]):::person
    team([Team member<br/>own SSH key]):::person
    gha[GitHub Actions<br/>Desplegar en Azure]:::ext

    subgraph azure["Azure VM vehiclecarwash-vm"]
        caddy["caddy · :80 / :443<br/>only public ports · TLS 1.3"]
        web["web<br/>nginx + Angular"]
        dl[/"/app/<br/>APK + version.json"/]
        gw["api-gateway :8080"]
        apps["6 microservices<br/>security :3001 · customer :3002<br/>booking :3003 · operations :3004<br/>payment :3005 (.NET 8) · notification :3006"]
        db[("SQL Server 2022 Express<br/>LavaRapido · 57 tables")]
        mq[["RabbitMQ :5672"]]
        init["db-init + payment-migrate<br/>(run once, exit 0)"]
        scripts["deploy/update-server.sh<br/>ci-deploy.sh · publish-apk.sh"]
        portainer["Portainer · 127.0.0.1:9443<br/>(SSH tunnel only)"]
    end

    ext[Gmail SMTP · Expo Push API]:::ext

    browser -- "HTTPS (domain on cloudapp.azure.com)" --> caddy
    phone -- "HTTPS /api and /app/version.json" --> caddy
    caddy -- "everything else" --> web
    caddy -- "/app/*" --> dl
    caddy -- "/api/*" --> gw
    gw --> apps
    apps --> db
    apps -- "publish / consume" --> mq
    init --> db
    apps -- "email and push" --> ext
    team -- "SSH :22" --> scripts
    gha -- "SSH :22, restricted key" --> scripts
    scripts -- "git pull + docker compose up --build" --> apps

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef ext fill:#999,color:#fff
```

| Node | Notes |
|---|---|
| Server | Azure VM `vehiclecarwash-vm` (Ubuntu 24.04, 2 vCPU, 7.7 GB), domain `lavarapidovehicular.northcentralus.cloudapp.azure.com`, public IP 64.236.160.129, Docker 29 and Compose v5; every container is in the network `lavarapido_default` |
| Caddy | Only container with published ports; obtains and renews the certificate (valid until 2027-01-14 at the last check) |
| Services | Which service calls which and the events they exchange: [c2-containers](./c2-containers.md). No ports on the host; Swagger off; memory limit per container, `restart: unless-stopped` |
| SQL Server | Express edition; data in the `sqlserver-data` volume. `db-init` only creates the database; each Java service applies its Liquibase changelog on start-up and `payment-migrate` applies the .NET service's (global numbering up to 039) |
| Mailpit | Not started in production (`dev-only` profile) |
| Portainer | Bound to `127.0.0.1`; reached through an SSH tunnel |
| Access | Members with their own key; GitHub Actions with a restricted key that can only run `ci-deploy.sh` |
