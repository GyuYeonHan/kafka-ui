# Kafka Connect 유지보수용 테스트 환경 가이드

이 문서는 Kafka Connect 관련 회귀를 빠르게 검증하기 위한 **Docker 기반 테스트 환경**을 정의합니다.

## 목표

- 기능 회귀를 3단계로 분리해 빠르게 감지
- 로컬/CI에서 동일한 실행 절차 유지
- 사내 환경 기준으로 Connect 장애/지연 시나리오 검증 강화

## 1) 단위/정적 검증 (가장 빠른 단계)

### Backend (Java)

Docker 이미지의 Maven을 직접 사용해서 wrapper 다운로드 의존성을 제거합니다.

```bash
docker run --rm \
  -v "$PWD":/workspace \
  -w /workspace \
  maven:3.9.9-eclipse-temurin-17 \
  mvn -B -ntp -pl kafka-ui-api test
```

### Frontend (TypeScript/Jest)

```bash
docker run --rm \
  -v "$PWD":/workspace \
  -w /workspace/kafka-ui-react-app \
  node:18-bullseye \
  bash -lc "corepack enable && corepack prepare pnpm@8.6.12 --activate && pnpm install --frozen-lockfile && pnpm gen:sources && pnpm lint:CI && pnpm test:CI"
```

## 2) Backend 통합 검증 (Testcontainers 포함)

`kafka-ui-api` 통합 테스트는 Docker 데몬 접근이 필요할 수 있으므로 Docker socket을 마운트합니다.

```bash
docker run --rm \
  -v "$PWD":/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  maven:3.9.9-eclipse-temurin-17 \
  mvn -B -ntp -pl kafka-ui-api verify
```

## 3) E2E 검증 (기존 리포 자산 재사용)

이미 저장소에 있는 조합을 그대로 사용합니다.

- Selenoid: `kafka-ui-e2e-checks/docker/selenoid-local.yaml`
- 테스트 대상 스택: `documentation/compose/e2e-tests.yaml`
- 테스트 코드: `kafka-ui-e2e-checks`

### 실행 순서

```bash
docker pull selenoid/vnc_chrome:103.0
docker compose -f kafka-ui-e2e-checks/docker/selenoid-local.yaml up -d
docker compose -f documentation/compose/e2e-tests.yaml up -d
```

헬스체크 확인:

```bash
until [ "$(docker exec kafka-ui wget --spider --server-response http://localhost:8080/actuator/health 2>&1 | grep -c 'HTTP/1.1 200 OK')" = "1" ]; do
  echo "Waiting for kafka-ui ..."
  sleep 1
done
```

스모크 테스트 실행:

```bash
./mvnw -B -ntp -Dsurefire.suiteXmlFiles='src/test/resources/smoke.xml' -f 'kafka-ui-e2e-checks' test -Pprod
```

## 4) 권장 CI 파이프라인

1. `frontend` 잡: lint + unit test  
2. `backend-unit` 잡: `kafka-ui-api` 단위 테스트  
3. `backend-integration` 잡: `verify` (Testcontainers)  
4. `e2e-smoke` 잡: PR 머지 전 최소 스모크

병렬 실행 후 `e2e-smoke`만 required 체크로 두고, 나머지는 필수/권장 정책에 맞춰 조정합니다.

## 5) Kafka Connect 유지보수 시 필수 시나리오

- 커넥터 생성 실패 시 에러 메시지 노출 확인
- 특정 Connect 장애 시 목록/메뉴 전체 동작 유지 확인
- FAILED/TASK_FAILED 상태 집계 정확성 확인
- 상세 화면(Task/Config/Overview)에서 실패/로딩 상태 문구 확인

## 6) 운영 반영 전 체크리스트

- `kafka.connect.names-timeout-ms`, `kafka.connect.details-timeout-ms` 값을 환경별로 조정
- Connect 응답 지연이 큰 클러스터는 타임아웃 값을 더 높게 설정
- E2E에서 Connect 장애 시나리오를 smoke 또는 sanity 세트에 최소 1개 포함
