# SmartCart — 프로젝트 빠른 시작 가이드

SmartCart는 Amazon, Target, Walmart 세 곳의 상품 가격을 비교할 수 있는 장보기 비교 웹사이트입니다. 프론트엔드는 React, 백엔드는 Flask + PyMySQL(raw SQL), 데이터베이스는 원격 MySQL을 사용합니다.

## 환경 설치

### 사전 요구사항

- Python 3.10+
- Node.js 16+
- npm

### 백엔드 설치

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

`.env` 파일 생성 (`.env.example` 참고):

```bash
cp .env.example .env
# .env를 편집하여 DB_PASSWORD 입력
```

### 프론트엔드 설치

```bash
cd front-end
npm install
```

---

## Demo 실행 (3단계)

### 1. 백엔드 실행

```bash
cd backend
source venv/bin/activate
python app.py            # 기본 port 5000
```

**포트 변경 (3가지 방법 중 택1):**

```bash
# 방법 1: 명령줄 인수
python app.py 5001

# 방법 2: 환경변수 (일회성)
FLASK_PORT=5001 python app.py

# 방법 3: .env 파일에 작성 (영구 적용)
# backend/.env에 FLASK_PORT=5001 추가
```

> **macOS 참고:** AirPlay Receiver가 기본적으로 port 5000을 사용합니다. 위 방법으로 포트를 변경하거나,
> "시스템 설정 → 일반 → AirDrop 및 Handoff"에서 AirPlay 수신기를 끄세요.

### 2. 프론트엔드 실행

```bash
cd front-end
npm install    # 처음만 필요
npm start      # 개발 서버: http://localhost:3000
```

백엔드가 5000이 아닌 경우, `front-end/package.json`에서 proxy 수정:

```json
"proxy": "http://localhost:5001"
```

### 3. 실제 API로 전환

`front-end/src/api/index.js` 15번째 줄을 수정:

```javascript
const USE_MOCK = false;
```

변경 후 프론트엔드는 mock data 대신 백엔드 API를 호출하여 실제 데이터베이스 데이터를 사용합니다.

## 테스트 계정

모든 demo 사용자의 비밀번호는 `password123`:

| 이메일 | 이름 |
|--------|------|
| alex.lee@example.com | Alex Lee |
| maria.chen@example.com | Maria Chen |
| sam.patel@example.com | Sam Patel |
| jordan.kim@example.com | Jordan Kim |
| taylor.nguyen@example.com | Taylor Nguyen |

## 테스트 실행

```bash
cd backend
venv/bin/python -m pytest tests/ -v
```

- `tests/test_unit_*.py` — Unit test (비밀번호 해싱, JWT, Flask 앱 설정, 401 보호)
- `tests/test_integration.py` — Integration test (Flask test client로 실제 DB 연결, 전체 23개 endpoint 커버)

Unit test만 실행:

```bash
venv/bin/python -m pytest tests/test_unit_auth.py tests/test_unit_config.py tests/test_unit_app.py -v
```

Integration test만 실행:

```bash
venv/bin/python -m pytest tests/test_integration.py -v
```

## 수동 API 테스트

```bash
# 로그인 불필요 endpoint
curl http://localhost:5001/api/retailers
curl http://localhost:5001/api/products
curl http://localhost:5001/api/compare/1

# 로그인하여 token 획득
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex.lee@example.com","password":"password123"}'

# token으로 인증 필요 endpoint 호출
curl http://localhost:5001/api/user/favorites \
  -H "Authorization: Bearer <위에서 받은 token>"
```

## 프로젝트 구조

```
Basket-Optimiser/
├── front-end/                  # React 프론트엔드 (프론트엔드 담당)
│   ├── src/
│   │   ├── pages/              # 10개 페이지 컴포넌트
│   │   ├── components/         # 공용 컴포넌트 (Nav, Icons)
│   │   ├── api/index.js        # API 레이어 (USE_MOCK 스위치)
│   │   └── data/               # Mock 데이터
│   └── package.json
│
├── backend/                    # Flask 백엔드 (백엔드 담당)
│   ├── app.py                  # 진입점, 10개 blueprint 등록
│   ├── config.py               # .env 읽기 (DB 연결, JWT, port)
│   ├── db.py                   # PyMySQL 연결
│   ├── auth.py                 # bcrypt + JWT + @require_auth
│   ├── sql_loader.py           # db/queries/*.sql 읽기 로더
│   ├── .env                    # 민감 설정 (git에 포함 안 됨)
│   ├── routes/                 # 10개 라우트 파일, 23개 endpoint
│   └── tests/                  # Unit + Integration 테스트 (52개)
│
├── db/                         # 데이터베이스 관련 (DB 담당)
│   ├── schema.sql              # CREATE TABLE (15개 테이블 + 2개 VIEW)
│   ├── migration.sql           # ALTER TABLE 컬럼 추가 + user_favorites 테이블
│   ├── seed_data.sql           # placeholder — DB 담당이 INSERT 완성
│   └── queries/                # 모든 SQL 쿼리 (백엔드 + DB 공동 관리)
│       ├── retailers.sql       # 1 query
│       ├── products.sql        # 1 query
│       ├── compare.sql         # 1 query (핵심 가격 비교)
│       ├── trends.sql          # 2 queries
│       ├── auth.sql            # 3 queries
│       ├── favorites.sql       # 3 queries
│       ├── lists.sql           # 11 queries (Transaction 포함)
│       ├── inventory.sql       # 6 queries
│       ├── alerts.sql          # 12 queries (smart alert Transaction 포함)
│       ├── insight.sql         # 5 queries (spending_cte 서브쿼리 포함)
│       └── scrape.sql          # 6 queries — 전부 TODO, 크롤링 기능 구현 대기
│
└── docs/                       # API 스펙, Use Cases, 테이블 속성
```

## 데이터베이스

- Host: `167.71.90.83` / Database: `smartcart` / User: `joj161`
- 비밀번호는 `backend/.env`에 저장, git에 commit하지 마세요
- Schema: 15개 테이블, `db/schema.sql`에 정의
- Migration: `db/migration.sql` (color, icon, user_favorites, dismissed 추가)

---

## 3인 역할 분담 개요

### 데이터 흐름

```
사용자가 프론트엔드 조작 → Frontend가 API 호출 → Backend가 db/queries/*.sql 읽어 실행 → MySQL 결과 반환
```

### 각 역할 담당 범위

| 역할 | 담당 폴더 | 주요 작업 |
|------|----------|----------|
| **Frontend** | `front-end/` | React 페이지, API 호출, UI 렌더링 |
| **Backend** | `backend/` | Flask 라우트, JWT 인증, SQL 호출, JSON 반환 |
| **DB** | `db/` | 스키마 설계, SQL 쿼리 작성, seed data, 크롤링 스크립트 |

---

## SQL Query 관리 구조

### SQL을 왜 Python 안에 안 쓰나요?

모든 SQL 쿼리는 `db/queries/`의 `.sql` 파일에 있고, Backend Python 코드는 `sql_loader.py`로 읽어서 실행합니다. 장점:

- **역할 분리**: DB 담당은 SQL만 수정, Backend 담당은 Python만 수정
- **평가 용이**: 교수님이 `.sql` 파일로 직접 SQL 품질 확인 가능
- **집중 관리**: 같은 기능의 SQL이 한 파일에 모여 있어 찾고 수정하기 편함

### 하나의 `.sql` 파일에 여러 쿼리를 어떻게 넣나요?

각 쿼리를 `-- name: 쿼리명`으로 표시하면, `sql_loader.py`가 이 표시를 기준으로 파일을 여러 조각으로 분리합니다.

`db/queries/auth.sql` 예시 (3개 쿼리):

```sql
-- name: check_email_exists
SELECT user_id FROM users WHERE email = %s;

-- name: insert_user
INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s);

-- name: get_user_by_email
SELECT user_id, email, password_hash, display_name FROM users WHERE email = %s;
```

### Backend에서 특정 쿼리를 어떻게 호출하나요?

`get_query("파일명", "name 표시")`를 사용합니다:

```python
from sql_loader import get_query

# get_query("auth", "check_email_exists") → 위의 SELECT user_id ... 반환
cur.execute(get_query("auth", "check_email_exists"), (email,))
cur.execute(get_query("auth", "insert_user"), (email, hashed, display_name))
```

### 새 쿼리를 추가하려면?

해당 `.sql` 파일에 `-- name: 새이름` 블록을 추가하고, Python 코드에서 `get_query("파일명", "새이름")`으로 호출하면 됩니다.

### 현재 상태

- **45개 쿼리 구현 완료**, 52개 테스트 전부 통과
- **6개 쿼리 TODO** (`db/queries/scrape.sql`), 크롤링 기능 구현 시 완성 예정
- **1개 동적 UPDATE** (`lists.py`의 PATCH endpoint)는 SET 컬럼이 가변적이라 Python에 유지

---

## Backend Endpoint × DB Query 완전 대조표

각 endpoint가 어떤 SQL 쿼리(파일.쿼리명)를 호출하고, 어떤 DB 테이블을 읽고 쓰는지 정리합니다.

### 공개 Endpoint (로그인 불필요)

| # | Endpoint | SQL query (db/queries/) | 읽는 테이블 | 쓰는 테이블 |
|---|----------|------------------------|-----------|-----------|
| 1 | `GET /api/retailers` | `retailers.get_all` | retailers | — |
| 2 | `GET /api/products` | `products.get_all_with_category` | products, categories | — |
| 3 | `GET /api/compare/{id}` | `compare.get_top5_cheapest` | price_records, product_variants, products, retailers, units, brands | — |
| 4 | `POST /api/compare/summary` | `compare.get_top5_cheapest` ×N | 위와 동일 | — |
| 5 | `GET /api/trends/{id}` | `trends.get_monthly_avg_by_retailer`, `trends.get_seasonal_patterns` | price_records, product_variants, retailers, seasonal_patterns | — |
| 6 | `POST /api/auth/register` | `auth.check_email_exists`, `auth.insert_user` | users | users |
| 7 | `POST /api/auth/login` | `auth.get_user_by_email` | users | — |

### 인증 필요 Endpoint (JWT)

| # | Endpoint | SQL query (db/queries/) | 읽는 테이블 | 쓰는 테이블 | Transaction |
|---|----------|------------------------|-----------|-----------|-------------|
| 8 | `GET /api/user/favorites` | `favorites.get_by_user` | user_favorites | — | — |
| 9 | `PUT /api/user/favorites` | `favorites.delete_all_by_user`, `favorites.insert_one` ×N | — | user_favorites | — |
| 10 | `GET /api/lists` | `lists.get_user_lists` | shopping_lists, list_items | — | — |
| 11 | `GET /api/lists/{id}` | `lists.verify_ownership`, `lists.get_items_with_product_info`, `lists.get_best_prices_for_products`, `lists.get_store_prices_for_products` | shopping_lists, list_items, product_variants, products, price_records, retailers, units | — | — |
| 12 | `POST /api/lists` | `lists.insert_list` | — | shopping_lists | — |
| 13 | `POST /api/lists/{id}/items` | `lists.verify_ownership`, `lists.insert_item`, `lists.update_estimated_total`, `lists.get_estimated_total` | price_records | list_items, shopping_lists | **YES** |
| 14 | `PATCH /api/lists/{id}/items/{id}` | `lists.verify_item_ownership`, (동적 UPDATE), `lists.get_item_after_update` | list_items, shopping_lists | list_items | — |
| 15 | `GET /api/inventory` | `inventory.get_user_inventory`, `inventory.get_unit_abbreviation` | inventory_items, products, product_variants, units | — | — |
| 16 | `POST /api/inventory` | `inventory.check_existing`, `inventory.update_existing` 또는 `inventory.insert_new` | inventory_items | inventory_items | — |
| 17 | `PATCH /api/inventory/{id}/dismiss` | `inventory.dismiss` | — | inventory_items | — |
| 18 | `GET /api/alerts` | `alerts.get_user_alerts`, `alerts.get_cheapest_current_price`, `alerts.get_tracked_product_ids`, `alerts.get_latest_cheapest_with_date`, `alerts.get_avg_price`, `alerts.check_existing_todo`, `alerts.get_variant_for_product`, `alerts.insert_smart_todo`, `alerts.get_product_name_icon` | price_alerts, products, price_records, product_variants, retailers, user_favorites, todos | todos | **YES** |
| 19 | `POST /api/alerts` | `alerts.check_product_exists`, `alerts.insert_alert` | products | price_alerts | — |
| 20 | `DELETE /api/alerts/{id}` | `alerts.delete_alert` | — | price_alerts | — |
| 22 | `GET /api/insight/monthly` | `insight.spending_cte` + `insight.get_monthly` | list_items, shopping_lists, product_variants, products, categories, price_records | — | — |
| 23 | `GET /api/insight/categories` | `insight.spending_cte` + `insight.get_by_category` | 위와 동일 | — | — |
| 24 | `GET /api/insight/summary` | `insight.spending_cte` + `insight.get_summary_months`, `insight.spending_cte` + `insight.get_top_category` | 위와 동일 | — | — |

### 미구현 (placeholder: `db/queries/scrape.sql`)

| 기능 | SQL query | 상태 |
|------|-----------|------|
| 크롤링 job 생성 | `scrape.insert_job` | TODO |
| job 성공 업데이트 | `scrape.update_job_success` | TODO |
| job 실패 업데이트 | `scrape.update_job_failed` | TODO |
| 새 가격 기록 삽입 | `scrape.insert_price_record` | TODO |
| 트리거된 알림 확인 | `scrape.check_triggered_alerts` | TODO |
| 알림 트리거 표시 | `scrape.trigger_alert` | TODO |

---

## DB 담당 가이드

### 파일 위치

모든 DB 관련 파일은 `db/` 폴더에 있습니다:

| 파일 | 용도 | 상태 |
|------|------|------|
| `db/schema.sql` | CREATE TABLE (15개 테이블 + 2개 VIEW) | 완료 |
| `db/migration.sql` | ALTER TABLE 컬럼 추가 + user_favorites | 완료 |
| `db/seed_data.sql` | INSERT 테스트 데이터 | **placeholder — 완성 필요** |
| `db/queries/*.sql` | 모든 SQL 쿼리 | 45개 완료, 6개 TODO |

### SQL 쿼리 추가/수정 방법

각 `.sql` 파일은 `-- name: 쿼리명`으로 구분합니다:

```sql
-- name: get_all
SELECT retailer_id AS id, name, color, logo_url, base_url
FROM retailers
ORDER BY retailer_id;
```

Backend는 `sql_loader.py`로 자동 읽습니다:
```python
from sql_loader import get_query
cur.execute(get_query("retailers", "get_all"))
#                      ↑ 파일명      ↑ -- name: 뒤의 이름
```

### DB 담당이 해야 할 일

1. **`db/seed_data.sql`** — 전체 INSERT 문 완성 (또는 mock data 스크립트 배치)
2. **`db/queries/scrape.sql`** — 6개 TODO 쿼리, 크롤링 기능 설계 후 주석 해제 및 수정
3. 새 쿼리 추가 시 해당 `.sql` 파일에 `-- name: 새이름` 블록 추가
4. 기존 쿼리 수정 시 `.sql` 파일의 SQL만 변경 — Backend Python 코드 수정 불필요

---

## 프론트엔드 담당 가이드

### API 전환

`front-end/src/api/index.js` 15번째 줄:
- `USE_MOCK = true` → `src/data/mockData.js`의 가짜 데이터 사용
- `USE_MOCK = false` → Backend API 호출, 실제 DB 데이터 사용

### product_id는 정수

Mock data와 Backend API 모두 정수 `product_id` 사용 (예: `1`, `2`, `3`), 문자열 아님.

### 상품 목록은 동적

프론트엔드는 `GET /api/products`로 상품 목록을 가져옵니다. 하드코딩하지 마세요. Backend가 새 상품을 크롤링하면 프론트엔드에 자동 표시됩니다.

---

## 기능 소개 및 사용 가이드

아래에서 SmartCart의 각 기능, 사용 방법, 예상 결과, 그리고 영향받는 데이터베이스 테이블을 설명합니다.

---

### UC1 — 상품 가격 비교

**사용 방법:**
1. Compare 페이지에서 비교할 상품 선택 (예: Whole Milk)
2. 시스템이 Amazon, Target, Walmart의 가격을 "단위당 가격" 기준으로 오름차순 정렬, 최대 5개 표시

**예상 결과:**
- 각 결과에 표시: 상품명, 브랜드, 소매점, 포장 크기, 총 가격, 단위 가격 (예: $0.059/fl oz)
- 1위가 가장 저렴한 옵션

**호출 API:**
- `GET /api/compare/{product_id}` — 단일 상품의 최저가 상위 5개

**영향받는 DB 테이블 (읽기 전용):**

| 테이블 | 용도 |
|--------|------|
| `products` | 상품명, 카테고리 |
| `product_variants` | 각 소매점의 포장 규격 |
| `price_records` | 최신 가격으로 unit_price 계산 |
| `retailers` | 소매점 이름, 색상 |
| `units` | 단위 라벨 (per oz, per lb 등) |

**관찰 방법:**
```sql
-- 특정 상품의 최신 비교 결과 조회
SELECT pv.variant_id, r.name AS store, pr.price, pr.unit_price
FROM price_records pr
INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
  ON pr.record_id = l.latest
INNER JOIN product_variants pv ON pr.variant_id = pv.variant_id
INNER JOIN retailers r ON pv.retailer_id = r.retailer_id
WHERE pv.product_id = 1
ORDER BY pr.unit_price ASC;
```

---

### UC2 — 장보기 목록 관리

**사용 방법:**
1. 로그인 후 Shopping Lists 페이지 이동
2. "새 목록 만들기" 클릭, 이름 입력 (예: "주간 장보기")
3. 목록에 상품 추가, 규격과 수량 선택
4. 시스템이 자동으로 각 매장별 총 가격 계산
5. 구매 완료 시 "구매 완료" 체크

**예상 결과:**
- 목록 상세 페이지에 `store_totals` (각 매장 총 가격) 표시
- `cheapest_store`로 가장 저렴한 매장 표시
- `savings_vs_expensive`로 최저가와 최고가 차이 표시

**호출 API:**
- `POST /api/lists` — 새 목록 생성
- `POST /api/lists/{list_id}/items` — 항목 추가 (**Transaction 포함**)
- `GET /api/lists/{list_id}` — 목록 상세 및 매장별 총 가격
- `PATCH /api/lists/{list_id}/items/{item_id}` — 구매 완료 체크

**영향받는 DB 테이블:**

| 작업 | 기록 테이블 | 설명 |
|------|------------|------|
| 목록 생성 | `shopping_lists` | 새 row 추가 |
| 항목 추가 | `list_items` + `shopping_lists` | **Transaction**: 항목 삽입 + estimated_total 업데이트, 실패 시 ROLLBACK |
| 구매 체크 | `list_items` | is_purchased = TRUE, purchased_at = NOW() 업데이트 |

**관찰 방법:**
```sql
-- 사용자의 장보기 목록 조회
SELECT * FROM shopping_lists WHERE user_id = 1;

-- 목록 내 항목 조회
SELECT li.*, pv.product_id, p.name
FROM list_items li
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE li.list_id = 1;

-- Transaction 검증: 항목 추가 후 estimated_total 정확히 업데이트됐는지 확인
SELECT list_id, name, estimated_total FROM shopping_lists WHERE list_id = 1;
```

---

### UC3 — 가격 알림

**사용 방법:**
1. 로그인 후 Alerts 페이지 이동
2. "알림 추가" 클릭, 상품과 목표 가격 선택 (예: Milk가 $3.00 이하일 때 알림)
3. 시스템이 현재 최저가와 목표 가격을 자동 비교

**예상 결과:**
- 현재 최저가 ≤ 목표 가격 → `is_triggered: true`, 어느 매장에서 트리거됐는지 표시
- 아직 목표 미달 → `is_triggered: false`

**호출 API:**
- `POST /api/alerts` — 알림 생성
- `GET /api/alerts` — 모든 알림 조회 (스마트 알림 포함)
- `DELETE /api/alerts/{alert_id}` — 알림 삭제

**영향받는 DB 테이블:**

| 작업 | 기록 테이블 | 설명 |
|------|------------|------|
| 알림 생성 | `price_alerts` | 새 row: user_id, product_id, target_price |
| 알림 삭제 | `price_alerts` | 해당 row 삭제 |

**관찰 방법:**
```sql
-- 사용자의 알림 조회
SELECT pa.*, p.name FROM price_alerts pa
INNER JOIN products p ON pa.product_id = p.product_id
WHERE pa.user_id = 1;
```

---

### UC4 — 스마트 알림 (Smart Alerts)

**사용 방법:**
- 수동 조작 불필요, 시스템이 자동 감지
- `GET /api/alerts` 호출 시 백엔드가 추적 중인 상품 (favorites + alerts)의 가격을 자동 검사
- 현재 최저가가 과거 평균보다 20% 이상 하락하면 자동으로 smart alert 생성

**예상 결과:**
- Smart Alerts 섹션에 표시: 상품명, 현재 가격, 과거 평균, 하락률, 매장
- 예: "Protein Bar가 Amazon에서 33% 할인 (현재 $1.10, 평균 $1.65)"

**영향받는 DB 테이블:**

| 작업 | 기록 테이블 | 설명 |
|------|------------|------|
| 가격 하락 감지 | `todos` | **Transaction**: 동일 상품의 기존 todo 확인 후 없으면 INSERT, 중복 방지 |

**관찰 방법:**
```sql
-- 시스템이 자동 생성한 smart alert todos 조회
SELECT t.*, p.name
FROM todos t
INNER JOIN product_variants pv ON t.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE t.user_id = 1 AND t.todo_type = 'buy_now';
```

---

### UC5 — 소비 분석

**사용 방법:**
1. 로그인 후 Insight 페이지 이동
2. 시스템이 자동 표시: 월별 소비 추이, 카테고리별 소비 비율, 소비 요약 및 인사이트

**예상 결과:**
- **월별 차트**: 최근 6개월 매월 소비 금액
- **카테고리 비율**: Dairy 34%, Meat 26%...
- **요약**: 6개월 총 소비, 월 평균, 이번 달 vs 지난달 변화율
- **인사이트 텍스트**: "이번 달 소비가 15% 감소했습니다", "Dairy가 가장 큰 소비 카테고리입니다"

**호출 API:**
- `GET /api/insight/monthly` — 월별 소비
- `GET /api/insight/categories` — 카테고리별 소비
- `GET /api/insight/summary` — 요약 + 인사이트

**영향받는 DB 테이블 (읽기 전용):**
- `list_items` (is_purchased = TRUE인 데이터)
- `shopping_lists` (user_id 필터)
- `price_records` (가격)
- `products` + `categories` (카테고리명)

**관찰 방법:**
```sql
-- 사용자의 구매 기록 조회 (insight 데이터 소스)
SELECT li.purchased_at, p.name, c.name AS category, pr.price, li.quantity
FROM list_items li
INNER JOIN shopping_lists sl ON li.list_id = sl.list_id
INNER JOIN product_variants pv ON li.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
INNER JOIN (SELECT variant_id, MAX(record_id) AS latest FROM price_records GROUP BY variant_id) l
  ON pv.variant_id = l.variant_id
INNER JOIN price_records pr ON pr.record_id = l.latest
WHERE sl.user_id = 1 AND li.is_purchased = TRUE
ORDER BY li.purchased_at DESC;
```

---

### UC6 — 가정 재고 관리

**사용 방법:**
1. 로그인 후 Inventory 페이지 이동
2. 재고 항목 추가: 상품 선택, 수량 입력, 예상 소비 일수 입력 (예: 우유 1갤런, 7일)
3. 시스템이 자동으로 소진 예정일 계산 (purchase_date + consumption_days)
4. 곧 소진될 항목 (≤ 2일)은 `status: "low"`로 표시
5. 알림을 끄고 싶으면 dismiss 클릭

**예상 결과:**
- "곧 소진" 섹션: days_left ≤ 2인 항목, 장보기 목록에 추가 권장
- "재고 있음" 섹션: 아직 여유 있는 항목
- Dismiss한 항목은 "곧 소진"에서 사라지지만 재고 목록에는 유지

**호출 API:**
- `GET /api/inventory` — 재고 조회 (소진 상태 포함)
- `POST /api/inventory` — 재고 추가/업데이트
- `PATCH /api/inventory/{id}/dismiss` — 알림 끄기

**영향받는 DB 테이블:**

| 작업 | 기록 테이블 | 설명 |
|------|------------|------|
| 재고 추가 | `inventory_items` | INSERT 또는 UPDATE (같은 사용자+같은 상품은 덮어쓰기) |
| Dismiss | `inventory_items` | dismissed = TRUE 설정 |

**관찰 방법:**
```sql
-- 사용자의 재고를 소진일 기준으로 조회
SELECT ii.*, p.name, DATEDIFF(ii.depletion_date, CURDATE()) AS days_left
FROM inventory_items ii
INNER JOIN products p ON ii.product_id = p.product_id
WHERE ii.user_id = 1
ORDER BY ii.depletion_date ASC;
```

---

### UC7 — 사용자 계정

**사용 방법:**
1. Sign In 페이지에서 새 계정 등록 (이메일 + 비밀번호 + 표시 이름)
2. 또는 기존 계정으로 로그인
3. 로그인 후 모든 인증 필요 기능 사용 가능 (목록, 재고, 알림, 분석)

**예상 결과:**
- 등록/로그인 성공 시 JWT token 반환
- 프론트엔드가 token을 저장, 이후 API 요청 시 `Authorization: Bearer <token>` 헤더에 포함
- token 없음 또는 만료 → 모든 protected endpoint에서 401 반환

**호출 API:**
- `POST /api/auth/register` — 등록
- `POST /api/auth/login` — 로그인

**영향받는 DB 테이블:**

| 작업 | 기록 테이블 | 설명 |
|------|------------|------|
| 등록 | `users` | INSERT: email, password_hash (bcrypt), display_name |

**관찰 방법:**
```sql
-- 모든 사용자 조회 (password_hash는 SELECT하지 마세요)
SELECT user_id, email, display_name, created_at FROM users;
```

---

### UC8 — 시즌별 할인 예측

**사용 방법:**
1. Trends 페이지에서 상품 선택
2. 시스템이 최근 몇 개월의 소매점별 가격 추이 차트 표시
3. 데이터베이스에 해당 상품의 시즌 패턴이 있으면 (예: Black Friday 평균 25% 할인), 미래 월에 예측 가격 표시 (점선)

**예상 결과:**
- 과거 월: 각 소매점의 평균 단위 가격
- 미래 월: `predicted` 예측 가격 (seasonal_patterns 기반 계산)
- 프론트엔드가 실선 (과거) + 점선 (예측)으로 표시

**호출 API:**
- `GET /api/trends/{product_id}`

**영향받는 DB 테이블 (읽기 전용):**

| 테이블 | 용도 |
|--------|------|
| `price_records` | 과거 가격, 월별 평균 |
| `product_variants` | 상품과 소매점 연결 |
| `seasonal_patterns` | 시즌 할인 패턴 (event_name, typical_month, avg_discount_pct) |
| `retailers` | 소매점 이름 |

**관찰 방법:**
```sql
-- 특정 상품의 시즌 패턴 조회
SELECT sp.*, r.name AS retailer
FROM seasonal_patterns sp
INNER JOIN retailers r ON sp.retailer_id = r.retailer_id
WHERE sp.product_id = 1;
```

---

### 기능 vs DB 테이블 대조표

| 기능 | 읽는 테이블 | 쓰는 테이블 | Transaction |
|------|-----------|-----------|-------------|
| UC1 가격 비교 | products, product_variants, price_records, retailers, units | — | — |
| UC2 장보기 목록 | shopping_lists, list_items, products, price_records | shopping_lists, list_items | 항목 추가 시 INSERT + UPDATE 원자적 작업 |
| UC3 가격 알림 | price_alerts, products, price_records | price_alerts | — |
| UC4 스마트 알림 | price_records, todos, products, user_favorites | todos | 감지 + 중복 확인 + INSERT 원자적 작업 |
| UC5 소비 분석 | list_items, shopping_lists, price_records, categories | — | — |
| UC6 재고 관리 | inventory_items, products | inventory_items | — |
| UC7 계정 | users | users | — |
| UC8 추세 예측 | price_records, seasonal_patterns, retailers | — | — |

---

## 중요 설계 노트

- **product_id는 정수**, 문자열 아님 (API 스펙의 `"milk"`는 구버전, 무시)
- **2개의 Transaction** (수업 요구사항):
  1. `POST /api/lists/{id}/items` — 항목 추가 + 예상 총액 업데이트, 실패 시 ROLLBACK
  2. `GET /api/alerts` — 가격 20% 이상 하락 감지 시 smart alert를 todos 테이블에 자동 생성
- **Endpoint #21 (Receipt OCR)** 미구현
- 총 23개 endpoint: 7개 공개 + 16개 JWT 인증 필요
- 모든 SQL 직접 작성 (PyMySQL raw SQL), SQLAlchemy 미사용 (수업에서 SQL 쿼리 평가)

## 수정 필요 / 주의 사항

- **`front-end/node_modules/`** — 이전에 클라우드 git에 commit됨, GitHub에서 삭제 필요
- **프론트엔드 product_id 타입 갱신 완료** — mock data의 문자열 ID를 정수로 변경 완료, 실제 API 전환 시 `GET /api/products`에서 동적으로 상품 목록 취득
- **자동 크롤링 프로세스 미구현** — 현재 백엔드는 프론트엔드 요청에 응답하는 API만 존재하며, 새로운 가격 데이터를 자동 수집하는 기능 없음. 구현 예정:
  1. scrape endpoint 또는 CLI 명령어 추가 (예: `python scrape.py`)
  2. 실행 시 `scrape_jobs` 테이블에 새 job 생성 (status = running)
  3. DB 팀의 mock data script 호출하여 새 가격 데이터 생성
  4. 생성된 데이터를 `price_records` (및 새 `product_variants`)에 저장
  5. `scrape_jobs` 상태를 success/failed로 업데이트
  6. `price_alerts` 확인 — 목표가 이하로 하락한 상품이 있으면 triggered_at 업데이트
  7. 관련 DB 테이블: `scrape_jobs`(쓰기), `price_records`(쓰기), `product_variants`(쓰기 가능), `price_alerts`(업데이트 가능)
