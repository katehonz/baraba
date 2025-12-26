# Baraba Migration to Elixir Phoenix

This directory contains the new architecture for Baraba, migrating from a polyglot microservices setup to a consolidated Elixir Phoenix Umbrella application with a React frontend.

## Structure

*   `apps/baraba_umbrella`: Core domain logic and database access (Ecto).
*   `apps/baraba_umbrella_web`: Phoenix Web layer (API, GraphQL, etc.).
*   `apps/saft`: The migrated SAFT service (Placeholder for now, logic to be ported from `old/saft_service`).
*   `frontend`: A new React + TypeScript application using Chakra UI.
*   `jasper_service`: The existing Jasper Reports service (copied from old).

## Prerequisites

*   Docker & Docker Compose
*   (Optional) Elixir 1.14+, Node 20+

## How to Run

1.  Navigate to this directory:
    ```bash
    cd baraba_umbrella
    ```

2.  Start the entire stack using Docker Compose:
    ```bash
    docker-compose up --build
    ```

    This will start:
    *   PostgreSQL (Port 5432)
    *   Jasper Service (Port 5005)
    *   Phoenix Backend (Port 4000)
    *   React Frontend (Port 5173)

3.  Access the application:
    *   Frontend: http://localhost:5173
    *   Backend API: http://localhost:4000
    *   Jasper: http://localhost:5005

## Next Steps for Migration

1.  **Port Domain Models**: Migrate Nim models from `src/models` to Ecto schemas in `apps/baraba_umbrella/lib/baraba_umbrella/`.
2.  **Port SAFT Logic**: Copy logic from `old/saft_service/lib` to `apps/saft/lib`.
3.  **Frontend Development**: Build the UI in `frontend/src` using Chakra UI, consuming the Phoenix API.
4.  **Identity Service**: Create a new app `apps/identity` or integrate into `baraba_umbrella` (Contexts).

## Notes

*   The database is configured to use `jesterac` (same as old).
*   The Phoenix app is set up as an Umbrella project to support the "microservices within a monolith" pattern.
