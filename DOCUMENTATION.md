# Kafka UI - 프로젝트 구조 및 기능 문서

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [모듈 상세](#4-모듈-상세)
   - [kafka-ui-contract](#41-kafka-ui-contract)
   - [kafka-ui-serde-api](#42-kafka-ui-serde-api)
   - [kafka-ui-api (백엔드)](#43-kafka-ui-api-백엔드)
   - [kafka-ui-react-app (프론트엔드)](#44-kafka-ui-react-app-프론트엔드)
   - [kafka-ui-e2e-checks (E2E 테스트)](#45-kafka-ui-e2e-checks-e2e-테스트)
5. [주요 기능](#5-주요-기능)
6. [REST API 구조](#6-rest-api-구조)
7. [설정 및 환경변수](#7-설정-및-환경변수)
8. [인증 및 보안](#8-인증-및-보안)
9. [빌드 및 실행](#9-빌드-및-실행)
10. [CI/CD 파이프라인](#10-cicd-파이프라인)

---

## 1. 프로젝트 개요

**Kafka UI**는 Apache Kafka 클러스터를 시각적으로 관리하기 위한 오픈소스 웹 UI 도구입니다.
제작사: [Provectus](https://provectus.com)

- 단일 인터페이스에서 **다수의 Kafka 클러스터**를 통합 관리
- 브로커, 토픽, 메시지, 컨슈머 그룹, Schema Registry, Kafka Connect, ksqlDB, ACL 등 전 영역 커버
- Spring Boot(WebFlux) 백엔드 + React 프론트엔드가 단일 JAR로 배포

---

## 2. 기술 스택

### 백엔드

| 영역 | 기술 |
|---|---|
| 프레임워크 | Spring Boot 3.1.3 (WebFlux — 완전 리액티브) |
| 언어 | Java 17 |
| 리액티브 | Project Reactor (Mono/Flux) |
| Kafka 클라이언트 | kafka-clients 3.5.0 |
| Schema Registry | Confluent 7.4.0 (Avro, JSON Schema, Protobuf) |
| 보안 | Spring Security + OAuth2 Client + LDAP |
| 코드 생성 | Lombok, MapStruct |
| 메트릭 | Micrometer + Prometheus |
| 스크립팅 | Groovy JSR-223 (메시지 필터링) |
| 문법 파싱 | ANTLR4 (ksqlDB 쿼리 문법) |
| 데이터 분석 | Apache DataSketches (토픽 통계) |
| AWS 통합 | aws-msk-iam-auth (MSK IAM 인증) |
| 빌드 | Maven 3, Checkstyle, JaCoCo |

### 프론트엔드

| 영역 | 기술 |
|---|---|
| 프레임워크 | React 18 (TypeScript) |
| 빌드 도구 | Vite 4 |
| 전역 상태 | Redux Toolkit + React Redux |
| 서버 상태 | TanStack React Query v4 |
| 라우팅 | React Router v6 |
| 스타일링 | styled-components v5 + SASS |
| 테이블 | TanStack React Table v8 |
| 폼 | React Hook Form + Yup |
| 코드 에디터 | react-ace (Ace Editor) |
| 패키지 관리 | pnpm 8 |
| 테스트 | Jest 29 + Testing Library |

### E2E 테스트

| 영역 | 기술 |
|---|---|
| 브라우저 자동화 | Selenide 6 (Selenium 래퍼) |
| 테스트 프레임워크 | TestNG 7 |
| 리포팅 | Allure 2 |
| 인프라 | Testcontainers |
| 테스트 관리 | Qase.io |

---

## 3. 프로젝트 구조

```
kafka-ui/
├── kafka-ui-api/           # Spring Boot 백엔드 (Java 17)
│   └── src/main/java/com/provectus/kafka/ui/
│       ├── config/         # Spring 설정 (CORS, Auth, WebClient 등)
│       ├── controller/     # REST 컨트롤러
│       ├── service/        # 비즈니스 로직
│       ├── emitter/        # 리액티브 메시지 스트리밍
│       ├── mapper/         # MapStruct DTO 매퍼
│       ├── model/          # 도메인 모델
│       └── exception/      # 예외 계층
│
├── kafka-ui-contract/      # OpenAPI 스펙 + 코드 생성
│   └── src/main/resources/swagger/
│       ├── kafka-ui-api.yaml       # 메인 REST API 스펙
│       ├── kafka-connect-api.yaml  # Kafka Connect API 스펙
│       └── kafka-sr-api.yaml       # Schema Registry API 스펙
│
├── kafka-ui-serde-api/     # 커스텀 직렬화 플러그인 공개 API
│
├── kafka-ui-react-app/     # React 18 프론트엔드 (TypeScript, Vite)
│   └── src/
│       ├── components/     # 기능별 컴포넌트
│       ├── generated-sources/ # OpenAPI로부터 자동 생성된 TypeScript 클라이언트
│       ├── lib/            # 유틸리티, 훅, 에러 처리
│       ├── widgets/        # 복합 위젯
│       ├── contexts/       # React Context (사용자 권한, 테마 등)
│       └── theme/          # styled-components 테마 토큰 (라이트/다크)
│
├── kafka-ui-e2e-checks/    # E2E 자동화 테스트
│
├── documentation/
│   └── compose/            # 20+ Docker Compose 예제
│
├── etc/checkstyle/         # Java 코드 품질 규칙
├── .github/workflows/      # 25+ CI/CD GitHub Actions 워크플로우
└── pom.xml                 # 루트 Maven POM (4개 모듈 부모)
```

---

## 4. 모듈 상세

### 4.1 kafka-ui-contract

**역할**: API 계약(Contract) 정의 및 클라이언트/서버 코드 자동 생성

OpenAPI Generator를 통해 빌드 시점에 다음을 생성합니다:
- Spring WebFlux 컨트롤러 인터페이스 → `kafka-ui-api` 모듈에서 구현
- Java WebClient 스텁 → Kafka Connect, Schema Registry 연동용
- TypeScript API 클라이언트 → React 앱의 `src/generated-sources/`로 복사

세 가지 API 스펙 파일:
| 파일 | 용도 |
|---|---|
| `kafka-ui-api.yaml` | 메인 REST API (토픽, 브로커, 컨슈머 등 전체) |
| `kafka-connect-api.yaml` | Kafka Connect REST API 클라이언트 생성용 |
| `kafka-sr-api.yaml` | Schema Registry REST API 클라이언트 생성용 |

---

### 4.2 kafka-ui-serde-api

**역할**: 써드파티 직렬화/역직렬화 플러그인을 위한 공개 API JAR

별도 배포되는 경량 JAR(`kafka-ui-serde-api:1.0.0`)로, 다음을 포함합니다:
- `Serde` 인터페이스 — 커스텀 직렬화기 구현의 진입점
- `DeserializeResult`, `SchemaDescription`, `RecordHeaders`, `PropertyResolver` 지원 타입

외부 개발자는 이 인터페이스를 구현해 AWS Glue Schema Registry, Smile 등 커스텀 포맷을 지원할 수 있습니다.

---

### 4.3 kafka-ui-api (백엔드)

**역할**: Spring Boot WebFlux 기반 메인 백엔드 애플리케이션

#### 컨트롤러 목록

| 컨트롤러 | 담당 도메인 |
|---|---|
| `BrokersController` | 브로커 목록, 설정, 메트릭, 로그 디렉토리 |
| `TopicsController` | 토픽 CRUD, 파티션, 설정 |
| `MessagesController` | 메시지 조회(SSE 스트리밍), 메시지 발행, 삭제 |
| `ConsumerGroupsController` | 컨슈머 그룹 목록, 상세, 오프셋 리셋 |
| `SchemasController` | Schema Registry CRUD, 호환성, 버전 비교 |
| `KafkaConnectController` | 커넥터 목록, 생성, 시작/중지/재시작, 태스크 관리 |
| `KsqlController` | ksqlDB 쿼리 실행 |
| `AclsController` | ACL 조회 및 관리 |
| `ClustersController` | 클러스터 목록, 메트릭, 통계 |
| `AuthController` | 현재 사용자 정보 |
| `AccessController` | 접근 권한 확인 |
| `ApplicationConfigController` | 동적 클러스터 설정 CRUD |

#### 주요 서비스

| 서비스 | 역할 |
|---|---|
| `ReactiveAdminClient` | Kafka AdminClient 비동기 래퍼 |
| `MessagesService` + emitter 패키지 | 스트리밍 메시지 소비 (Forward/Backward/Tailing/RangePolling) |
| `StatisticsService` + `ClustersStatisticsScheduler` | 주기적 클러스터 통계 갱신 |
| `SchemaRegistryService` | Schema Registry CRUD |
| `KafkaConnectService` | 커넥터 생명주기 관리 |
| `AccessControlService` | RBAC 권한 평가 |
| `DataMasking` | 필드 수준 마스킹 파이프라인 |
| `DeserializationService` | 플러그형 Serde 디스패치 |
| `AuditService` | 감사 이벤트 Kafka 토픽 기록 |

#### config 하위 패키지

```
config/
├── auth/           # OAuth2, LDAP, Basic, Disabled 보안 설정
│   ├── OAuthSecurityConfig
│   ├── LdapSecurityConfig
│   ├── BasicAuthSecurityConfig
│   └── RbacUserModel
├── CorsConfig
├── ReactiveWebClientConfig
└── ReadOnlyModeFilter
```

---

### 4.4 kafka-ui-react-app (프론트엔드)

**역할**: React 18 SPA, Vite로 빌드

#### 컴포넌트 구조 (기능별)

```
components/
├── Dashboard/          # 다중 클러스터 개요 테이블
├── Brokers/            # 브로커 목록, 상세, 메트릭, 로그 디렉토리, 설정
├── Topics/             # 토픽 목록, 메시지 뷰어, 발행, 편집, 개요, 통계
├── Schemas/            # Schema Registry 목록, 상세, diff, 편집, 생성
├── Connect/            # 커넥터 목록, 상세, 태스크, 생성
├── ConsumerGroups/     # 컨슈머 그룹 목록, 상세, 오프셋 리셋
├── KsqlDb/             # ksqlDB 쿼리 인터페이스
├── ACLPage/            # ACL 관리
├── Nav/                # 사이드바 네비게이션 (클러스터별 메뉴)
├── NavBar/             # 상단 바 (사용자 정보, 테마 전환)
└── common/             # 공용 UI 컴포넌트 (Button, Modal, Table 등)
```

#### 상태 관리 패턴

- **서버 상태**: TanStack React Query — API 캐싱, 자동 갱신, 낙관적 업데이트
- **전역 상태**: Redux Toolkit — UI 상태, 알림, 설정
- **React Context**: 사용자 권한(`UserInfoRoles`), 전역 설정(`GlobalSettings`), 테마(`ThemeMode`), 확인 다이얼로그(`Confirm`)

#### 자동 생성 API 클라이언트

`src/generated-sources/`에 OpenAPI 스펙으로부터 자동 생성된 타입 정의 및 API 함수가 위치합니다. 빌드 시 `kafka-ui-contract` 모듈이 생성을 담당합니다.

---

### 4.5 kafka-ui-e2e-checks (E2E 테스트)

**역할**: Selenide 기반 브라우저 자동화 E2E 테스트

- 테스트 분류: `smoke`, `sanity`, `regression`, `manual`
- Selenoid 브라우저 그리드로 병렬 실행 지원
- Allure 2로 HTML 테스트 리포트 생성
- Qase.io 연동으로 테스트 케이스 관리

---

## 5. 주요 기능

### 5.1 다중 클러스터 관리

단일 UI에서 여러 Kafka 클러스터를 동시에 관리합니다. 대시보드에서 모든 클러스터의 브로커 수, 토픽 수, 파티션 수, 오프셋 지연 등을 한눈에 볼 수 있습니다.

### 5.2 브로커 관리

- 브로커 목록 및 컨트롤러 상태 확인
- JMX 메트릭 조회
- 브로커별 설정 조회 및 수정
- 로그 디렉토리 상태 및 파티션 재할당

### 5.3 토픽 관리

- 토픽 CRUD (생성, 조회, 수정, 삭제)
- 파티션 및 레플리카 상태 확인
- 동적 설정 변경 (보존 기간, 압축 방식 등)
- 토픽 통계 분석 (메시지 크기 분포, 키 카디널리티 등)

### 5.4 메시지 조회 및 발행

**조회 기능:**
- 오프셋 기반, 타임스탬프 기반, 최신(Tailing) 모드
- 키/값/헤더 기준 필터링
- Groovy 스크립트를 이용한 고급 필터
- SSE(Server-Sent Events) 기반 실시간 스트리밍

**발행 기능:**
- Avro, JSON Schema, Protobuf, 평문 텍스트 인코딩 지원
- 특정 파티션으로 발행
- 커스텀 헤더 설정

### 5.5 컨슈머 그룹 관리

- 그룹별 파티션 오프셋 및 지연(lag) 확인
- 오프셋 리셋 (earliest, latest, 특정 오프셋/타임스탬프로)
- 컨슈머 멤버 및 할당 상태 확인

### 5.6 Schema Registry

- Avro, JSON Schema, Protobuf 스키마 CRUD
- 스키마 버전 간 diff 비교
- 호환성 수준 관리 (BACKWARD, FORWARD, FULL 등)
- 스키마 검증

### 5.7 Kafka Connect

- 다수의 Kafka Connect 클러스터 연동
- 커넥터 목록, 상태, 태스크 확인
- 커넥터 생성, 수정, 삭제
- 커넥터/태스크 시작, 중지, 재시작

### 5.8 ksqlDB

- 브라우저 내 쿼리 에디터
- ksqlDB 쿼리 실행 및 결과 확인
- 스트림/테이블 목록 조회

### 5.9 ACL 관리

- Kafka ACL 목록 조회
- 리소스별 접근 권한 확인

### 5.10 데이터 마스킹

메시지 내 민감한 필드를 정책 기반으로 처리합니다:
- **Mask**: 값을 마스킹 문자로 대체 (e.g., `***`)
- **Replace**: 다른 값으로 대체
- **Remove**: 필드 제거

### 5.11 다크 모드

UI 상단의 테마 전환 버튼으로 라이트/다크 모드를 즉시 전환할 수 있습니다.

### 5.12 감사 로깅 (Audit Logging)

모든 관리 작업을 지정된 Kafka 토픽에 이벤트로 기록합니다. 규정 준수 및 변경 이력 추적에 활용됩니다.

### 5.13 ODD(OpenDataDiscovery) 연동

클러스터 메타데이터를 OpenDataDiscovery 플랫폼으로 내보내 데이터 카탈로그 구축을 지원합니다.

---

## 6. REST API 구조

모든 클러스터 관련 API는 `/api/clusters/{clusterName}/...` 경로로 네임스페이스가 지정됩니다.

### 주요 엔드포인트

| 태그 | 주요 엔드포인트 |
|---|---|
| **Clusters** | `GET /api/clusters` — 클러스터 목록 |
| | `GET /api/clusters/{name}/metrics` — 클러스터 메트릭 |
| | `GET /api/clusters/{name}/stats` — 클러스터 통계 |
| **Brokers** | `GET .../brokers` — 브로커 목록 |
| | `GET/PUT .../brokers/{id}/configs` — 브로커 설정 |
| | `GET .../brokers/{id}/metrics` — JMX 메트릭 |
| | `GET .../brokers/logdirs` — 로그 디렉토리 |
| **Topics** | `GET/POST .../topics` — 토픽 목록/생성 |
| | `GET/PUT/DELETE .../topics/{name}` — 토픽 CRUD |
| **Messages** | `GET .../topics/{name}/messages` — 메시지 스트리밍 (SSE) |
| | `POST .../topics/{name}/messages` — 메시지 발행 |
| **ConsumerGroups** | `GET .../consumer-groups` — 컨슈머 그룹 목록 |
| | `PATCH .../consumer-groups/{id}/offsets` — 오프셋 리셋 |
| **Schemas** | `GET/POST .../schemas` — 스키마 목록/생성 |
| | `GET/PUT/DELETE .../schemas/{subject}` — 스키마 CRUD |
| **KafkaConnect** | `GET .../connects` — Connect 클러스터 목록 |
| | `GET/POST .../connects/{connect}/connectors` — 커넥터 목록/생성 |
| | `PUT .../connects/{connect}/connectors/{name}/action/{action}` — 상태 변경 |
| **Ksql** | `POST .../ksql/v2` — ksqlDB 쿼리 실행 |
| **ACL** | `GET .../acl` — ACL 목록 |
| **Auth** | `GET /api/me` — 현재 사용자 및 역할 |
| **Config** | `GET/POST/PUT/DELETE /api/config/clusters` — 동적 클러스터 설정 |

---

## 7. 설정 및 환경변수

### 핵심 설정 파일

| 파일 | 용도 |
|---|---|
| `kafka-ui-api/src/main/resources/application.yml` | 기본 런타임 설정 |
| `kafka-ui-api/src/main/resources/application-local.yml` | 로컬 개발용 전체 설정 템플릿 |
| `kafka-ui-api/src/main/resources/logback-spring.xml` | 로깅 설정 |

### 주요 설정 항목 (application-local.yml 기준)

```yaml
kafka:
  clusters:
    - name: local              # 클러스터 표시 이름
      bootstrapServers: localhost:9092  # Kafka 브로커 주소
      schemaRegistry: http://localhost:8085  # Schema Registry URL
      ksqldbServer: http://localhost:8088   # ksqlDB 서버 URL
      kafkaConnect:
        - name: first
          address: http://localhost:8083   # Kafka Connect URL

auth:
  type: LOGIN_FORM             # DISABLED | LOGIN_FORM | OAUTH2 | LDAP | ACTIVE_DIRECTORY

rbac:
  roles:
    - name: admin
      clusters: [local]
      subjects:
        - provider: OAUTH2
          type: user
          value: admin@example.com
      permissions:
        - resource: TOPIC
          actions: [VIEW, CREATE, EDIT, DELETE, MESSAGES_READ, MESSAGES_PRODUCE]
```

### Docker Compose로 빠른 시작

```yaml
version: '2'
services:
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8085
```

`documentation/compose/` 디렉토리에 SASL, SSL, LDAP, OAuth, MSK IAM 등 15개 이상의 Docker Compose 예제가 있습니다.

---

## 8. 인증 및 보안

### 인증 방식

| 방식 | 설명 |
|---|---|
| `DISABLED` | 인증 없음 (개발/테스트용) |
| `LOGIN_FORM` | 내장 로그인 폼 (Basic Auth) |
| `OAUTH2` | OAuth2/OIDC — GitHub, Google, GitLab, Amazon Cognito 지원 |
| `LDAP` | LDAP 디렉토리 서버 연동 |
| `ACTIVE_DIRECTORY` | Microsoft AD 연동 |

### RBAC (역할 기반 접근 제어)

리소스별 세밀한 권한 제어를 지원합니다:

**리소스 타입**: `TOPIC`, `CONSUMER`, `SCHEMA`, `CONNECT`, `KSQL`, `ACL`, `AUDIT`, `CLUSTER_CONFIG`

**액션 타입**: `VIEW`, `CREATE`, `EDIT`, `DELETE`, `MESSAGES_READ`, `MESSAGES_PRODUCE`, `RESET_OFFSETS`

**Subject 타입**: `USER` (특정 사용자), `GROUP` (그룹/역할)

---

## 9. 빌드 및 실행

### 개발 환경 (분리 실행)

```bash
# 백엔드
./mvnw spring-boot:run -pl kafka-ui-api

# 프론트엔드 (별도 터미널)
cd kafka-ui-react-app
pnpm install
pnpm dev   # Vite HMR 서버 (API는 백엔드로 프록시)
```

### 프로덕션 빌드

```bash
# 전체 빌드 (백엔드 + 프론트엔드 통합)
./mvnw package -Pprod

# 실행
java -jar kafka-ui-api/target/kafka-ui-api-*.jar
```

**프로덕션 빌드 순서:**

1. `kafka-ui-contract` — OpenAPI Generator로 Java 인터페이스 + TypeScript 클라이언트 생성
2. `kafka-ui-api` (`prod` 프로파일) — `frontend-maven-plugin`으로 Node 18 + pnpm 8 설치 후 `pnpm build` 실행
3. `maven-resources-plugin` — React 빌드 결과물을 `target/classes/static/`으로 복사
4. `spring-boot-maven-plugin` — 단일 fat JAR로 리패키징
5. (선택) `fabric8 docker-maven-plugin` — Docker 이미지 빌드 (`provectuslabs/kafka-ui:{revision}`)

### Docker로 실행

```bash
docker pull provectuslabs/kafka-ui:latest
docker run -p 8080:8080 \
  -e KAFKA_CLUSTERS_0_NAME=local \
  -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092 \
  provectuslabs/kafka-ui:latest
```

---

## 10. CI/CD 파이프라인

`.github/workflows/`에 25개 이상의 GitHub Actions 워크플로우가 있습니다:

| 워크플로우 | 트리거 | 내용 |
|---|---|---|
| `backend.yml` | PR | Java 단위/통합 테스트 |
| `frontend.yaml` | PR | pnpm lint + Jest 테스트 |
| `master.yaml` | master 병합 | 전체 빌드 + Docker 이미지 push |
| `release.yaml` | 태그 생성 | 버전 릴리즈 파이프라인 |
| `e2e-checks.yaml` | PR/스케줄 | E2E 자동화 테스트 |
| `e2e-weekly.yml` | 주간 스케줄 | 전체 E2E 회귀 테스트 |

---

*이 문서는 kafka-ui 프로젝트 코드베이스를 분석하여 작성되었습니다.*
*최종 업데이트: 2026-02-20*
