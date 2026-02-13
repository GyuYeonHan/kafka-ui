# CLAUDE.md

This file provides guidance for AI assistants working with the kafka-ui codebase.

## Project Overview

kafka-ui is an open-source web UI for Apache Kafka cluster management. It is a full-stack application with a Spring Boot reactive backend and a React/TypeScript frontend, using an API-first development approach driven by OpenAPI specifications.

**License:** Apache 2.0
**Organization:** Provectus (com.provectus)

## Repository Structure

```
kafka-ui/
├── kafka-ui-api/            # Backend: Spring Boot 3 WebFlux REST API
├── kafka-ui-react-app/      # Frontend: React 18 + TypeScript + Vite
├── kafka-ui-contract/       # OpenAPI specs & code generation (source of truth for APIs)
├── kafka-ui-serde-api/      # Plugin API for custom message serialization/deserialization
├── kafka-ui-e2e-checks/     # End-to-end tests (Selenide + TestNG)
├── documentation/           # Docker Compose examples
├── etc/                     # Checkstyle configuration
├── .github/                 # CI/CD workflows & PR templates
├── pom.xml                  # Root Maven POM (multi-module aggregator)
└── mvnw / mvnw.cmd          # Maven wrapper scripts
```

## Tech Stack

### Backend (kafka-ui-api)
- **Java 17** with **Spring Boot 3.1.3** (reactive WebFlux)
- Apache Kafka Clients 3.5.0
- Confluent Schema Registry 7.4.0
- MapStruct 1.5.5 (DTO mapping), Lombok 1.18.24
- Reactor (non-blocking I/O)
- Spring Security with OAuth2/LDAP support

### Frontend (kafka-ui-react-app)
- **React 18** with **TypeScript 4.7**
- **Vite 4** (bundler), **pnpm 8.6.12** (package manager), **Node 18.17.1**
- Styled Components for styling
- React Query (server state), React Context (app state), React Router v6
- React Hook Form, Ace Editor

### API Contract (kafka-ui-contract)
- OpenAPI YAML specs in `src/main/resources/swagger/`
- Auto-generates: Spring WebFlux interfaces (backend) and TypeScript client (frontend)
- Generated frontend code lands in `kafka-ui-react-app/src/generated-sources/`

## Build Commands

### Full Project Build (Maven)
```bash
# Standard build (backend only, skips frontend)
./mvnw -B verify

# Production build (includes frontend bundling + Docker image)
./mvnw -B verify -Pprod

# Skip tests
./mvnw -B verify -DskipTests

# Set version (used in CI)
./mvnw -B -ntp versions:set -DnewVersion=<version>
```

### Frontend Commands (run from `kafka-ui-react-app/`)
```bash
pnpm install --frozen-lockfile   # Install dependencies (CI-safe)
pnpm gen:sources                 # Generate TypeScript client from OpenAPI specs
pnpm dev                         # Start dev server (port 3000)
pnpm build                       # Production build
pnpm lint                        # Run ESLint
pnpm lint:fix                    # Run ESLint with auto-fix
pnpm lint:CI                     # Lint with zero warnings allowed (CI mode)
pnpm test                        # Run Jest in watch mode
pnpm test:CI                     # Run Jest with coverage (CI mode, no watch)
pnpm tsc                         # TypeScript type checking (no emit)
```

### Running Locally
```bash
# Backend: Start Spring Boot (requires Kafka cluster, see application-local.yml)
./mvnw -B spring-boot:run -pl kafka-ui-api -Dspring-boot.run.profiles=local

# Frontend: Start Vite dev server
cd kafka-ui-react-app && pnpm dev
```

## Testing

### Backend Tests
- **Framework:** JUnit 5, Mockito, Testcontainers
- **Location:** `kafka-ui-api/src/test/java/`
- **Run:** `./mvnw -B verify` (runs all tests in the verify phase)
- Integration tests use Testcontainers for Kafka

### Frontend Tests
- **Framework:** Jest 29 + React Testing Library
- **Location:** Co-located with components in `__test__/` directories, files named `*.spec.ts(x)` or `*.test.ts(x)`
- **Run:** `pnpm test` (watch mode) or `pnpm test:CI` (CI mode with coverage)
- Mocking: Mock API hooks and child components at top of test files
- Test helpers: Custom `render()` from `lib/testHelpers` wraps with routing context

### End-to-End Tests
- **Framework:** Selenide 6.12 + TestNG + Allure reporting
- **Location:** `kafka-ui-e2e-checks/`
- **Pattern:** Page Object Model with `BasePage` base class

## Code Style & Linting

### Java (Backend)
- **Checkstyle** enforced via maven-checkstyle-plugin (config: `etc/checkstyle/checkstyle.xml`)
- Based on Google Java Style Guide
- Max line length: 120 characters
- Indentation: 2 spaces
- No star imports
- Runs automatically during Maven `validate` phase

### TypeScript/React (Frontend)
- **ESLint** with Airbnb + TypeScript + Prettier config
- **Prettier** for formatting (single quotes, trailing commas ES5, semicolons)
- Key rules enforced:
  - `@typescript-eslint/no-explicit-any`: error
  - `react-hooks/rules-of-hooks`: error
  - `import/no-cycle`: error
  - `import/no-relative-parent-imports`: error
- CI enforces zero warnings (`pnpm lint:CI`)

### Editor Configuration (.editorconfig)
- Charset: UTF-8, line endings: LF
- Default indent: 4 spaces; Java and YAML: 2 spaces
- Max line length: 120
- Trailing whitespace trimmed, final newline required

## Architecture & Code Conventions

### API-First Development
The OpenAPI YAML specifications in `kafka-ui-contract` are the single source of truth:
1. Modify the YAML spec in `kafka-ui-contract/src/main/resources/swagger/`
2. Maven build generates Spring WebFlux interfaces and TypeScript client code
3. Backend controllers implement the generated interfaces
4. Frontend uses generated types from `src/generated-sources/`

### Backend Patterns

**Controller Layer:**
- All controllers extend `AbstractController`
- Every endpoint follows: build `AccessContext` -> `validateAccess()` -> execute service logic -> `audit()`
- Return reactive types: `Mono<ResponseEntity<T>>` or `Flux<T>`
- Naming: `*Controller.java`

**Service Layer:**
- Annotated with `@Service` and `@RequiredArgsConstructor` (Lombok)
- Delegate to `AdminClientService` / `ReactiveAdminClient` for Kafka operations
- Custom exceptions: `TopicNotFoundException`, `ClusterNotFoundException`, etc.
- Naming: `*Service.java`

**Mapper Layer:**
- MapStruct declarative mappers for domain model to DTO conversion
- Use `@Mapping` annotations for field transformations
- Naming: `*Mapper.java`

**Key conventions:**
- Constructor injection via Lombok `@RequiredArgsConstructor` (never field injection)
- Use `@Slf4j` for logging
- Reactive streams throughout: never block
- Model DTOs have `DTO` suffix (auto-generated from OpenAPI)

### Frontend Patterns

**Component Organization:**
```
components/
  Feature/
    Feature.tsx              # Main/container component (often routing)
    FeatureView.tsx          # Presentational component
    Feature.styled.tsx       # Styled-components styles
    __test__/
      Feature.spec.tsx       # Tests
```

**State Management:**
- Server state: React Query via custom API hooks (e.g., `useTopicDetails()`)
- App state: React Context (ClusterContext, GlobalSettingsContext, ThemeModeContext)
- URL state: `useSearchParams()` from React Router
- Local state: `useState()`, custom `useBoolean()` hook

**Styling:**
- styled-components in separate `.styled.tsx` files
- Import as namespace: `import * as S from './Component.styled'`
- Use in JSX: `<S.Wrapper>...</S.Wrapper>`

**Testing:**
- Mock dependencies at top of file: `jest.mock('lib/hooks/api/...')`
- Use custom `render()` helper from `lib/testHelpers`
- Query with Testing Library's `screen` object
- User interactions via `@testing-library/user-event`
- Test fixtures in `lib/fixtures/`

### REST API Naming Conventions
- URLs: lowercase, plural nouns, hyphen-separated (e.g., `/api/clusters/{clusterName}/topics`)
- Query parameters: camelCase
- Model names: plural nouns in camelCase

### Branch Naming Convention
- `issues/xxx` for issue fixes
- `feature/feature_name` for new features
- `bugfix/fix_thing` for bug fixes

## Key Entry Points

### Backend
- **Main class:** `kafka-ui-api/src/main/java/com/provectus/kafka/ui/KafkaUiApplication.java`
- **Controllers:** `kafka-ui-api/src/main/java/com/provectus/kafka/ui/controller/`
- **Services:** `kafka-ui-api/src/main/java/com/provectus/kafka/ui/service/`
- **Configuration:** `kafka-ui-api/src/main/resources/application.yml`
- **Local dev config:** `kafka-ui-api/src/main/resources/application-local.yml`

### Frontend
- **Entry point:** `kafka-ui-react-app/src/index.tsx`
- **Components:** `kafka-ui-react-app/src/components/`
- **API hooks:** `kafka-ui-react-app/src/lib/hooks/api/`
- **Generated API client:** `kafka-ui-react-app/src/generated-sources/`

### API Contracts
- **Main API spec:** `kafka-ui-contract/src/main/resources/swagger/kafka-ui-api.yaml`
- **Kafka Connect spec:** `kafka-ui-contract/src/main/resources/swagger/kafka-connect-api.yaml`
- **Schema Registry spec:** `kafka-ui-contract/src/main/resources/swagger/kafka-sr-api.yaml`

## Docker

- **Dockerfile:** `kafka-ui-api/Dockerfile`
- **Base image:** Azul Zulu OpenJDK Alpine
- **Exposed port:** 8080
- **Non-root user:** `kafkaui`
- **Docker Compose examples:** `documentation/compose/` (SASL, JMX, ACL, connectors, etc.)

## CI/CD

Key GitHub Actions workflows in `.github/workflows/`:
- **backend.yml** - Backend build + tests + SonarCloud (on PR and master)
- **frontend.yaml** - Frontend lint + tests + SonarCloud (on PR and master)
- **master.yaml** - Full prod build + multi-platform Docker image push
- **e2e-checks.yaml** - End-to-end Selenium tests
- **release.yaml** - Release versioning and artifact publishing

## Common Development Tasks

### Adding a new API endpoint
1. Define the endpoint in the OpenAPI YAML spec (`kafka-ui-contract/src/main/resources/swagger/kafka-ui-api.yaml`)
2. Run Maven build to regenerate interfaces: `./mvnw -B compile -pl kafka-ui-contract`
3. Implement the generated interface in a controller extending `AbstractController`
4. Add service logic with proper access control and auditing
5. Regenerate frontend client: `cd kafka-ui-react-app && pnpm gen:sources`
6. Build frontend components using the generated types

### Adding a new React component
1. Create component directory under `kafka-ui-react-app/src/components/`
2. Create component file (`.tsx`), styled file (`.styled.tsx`), and test directory (`__test__/`)
3. Use existing patterns: functional components, hooks for state, styled-components for styling
4. Write tests using React Testing Library with the custom `render()` helper

### Adding a custom Serde plugin
1. Implement the `Serde` interface from `kafka-ui-serde-api`
2. Provide a no-arg constructor
3. Implement `configure()`, `getSchema()`, `canDeserialize()`, `canSerialize()`
4. Package as a JAR and configure in the application properties
