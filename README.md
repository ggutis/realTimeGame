# realTimeGame: 동물 수비대

"동물 수비대"는 실시간 타워 디펜스 웹 게임입니다. 플레이어는 몰려오는 몬스터로부터 기지를 방어하기 위해 다양한 동물 유닛을 소환해야 합니다.

## ✨ 주요 기능

-   **실시간 게임 플레이**: Socket.io를 사용하여 모든 플레이어의 게임 상태가 실시간으로 동기화됩니다.
-   **다양한 유닛과 몬스터**: 각각 고유한 능력치를 가진 여러 종류의 동물 유닛과 몬스터가 등장합니다.
-   **스테이지 진행**: 몬스터 웨이브를 클리어하여 다음 스테이지로 진행하고 더 강력한 적들과 맞서 싸웁니다.
-   **랭킹 시스템**: Redis를 활용한 실시간 랭킹 보드를 통해 다른 플레이어와 점수를 경쟁할 수 있습니다.
-   **자원 관리**: 게임 내 재화(골드)를 사용하여 유닛을 전략적으로 소환하고 업그레이드합니다.

## 🛠️ 사용 기술

-   **Frontend**: HTML, CSS, JavaScript (ESM)
-   **Backend**: Node.js, Express, TypeScript
-   **Real-time Communication**: Socket.IO
-   **Database**: Redis (랭킹 시스템용)
-   **Build/Execution**: tsx, tsc

## 🚀 설치 및 실행 방법

1.  **저장소 복제**:
    ```bash
    git clone https://github.com/ggutis/realTimeGame.git
    cd realTimeGame
    ```

2.  **의존성 설치**:
    ```bash
    npm install
    ```

3.  **애플리케이션 빌드**:
    ```bash
    npm run build
    ```

4.  **개발 서버 실행**:
    ```bash
    npm run dev
    ```
    서버가 실행되면 웹 브라우저에서 `http://localhost:3000`으로 접속하여 게임을 즐길 수 있습니다.

5.  **프로덕션 서버 실행**:
    ```bash
    npm start
    ```

## 📜 주요 스크립트

-   `npm run start`: 컴파일된 JavaScript 파일(`dist/app.js`)로 프로덕션 서버를 실행합니다.
-   `npm run build`: TypeScript 소스 코드를 JavaScript로 컴파일합니다.
-   `npm run dev`: `tsx`를 사용하여 TypeScript 파일을 직접 실행하여 개발 서버를 시작합니다.
-   `npm run copy-assets`: `src/assets`의 JSON 파일들을 `dist/assets`로 복사합니다.

## 📁 프로젝트 구조 및 상세 설명

### `public/` - 프론트엔드

클라이언트 측의 정적 파일들을 담고 있습니다.

-   **`index.html`**: 게임의 기본 HTML 구조입니다. Canvas 엘리먼트와 게임 스크립트를 포함합니다.
-   **`style.css`**: 게임의 전반적인 스타일과 UI 레이아웃을 정의합니다.
-   **`game.js`**: 핵심 프론트엔드 게임 로직입니다. 서버와의 소켓 통신, Canvas 렌더링, 사용자 입력 처리를 담당합니다.
-   **`images/`**: 게임에 사용되는 모든 이미지 애셋(배경, 유닛, 몬스터 등)이 저장되어 있습니다.
-   **`modules/`**: 프론트엔드 로직을 모듈화하여 관리합니다.
    -   `renderer.js`: Canvas에 게임 상태를 그리는 렌더링 로직을 담당합니다.
    -   `socket.js`: 서버와의 Socket.IO 통신 설정을 담당합니다.
    -   `ui.js`: 점수, 골드 등 UI 요소를 업데이트하는 로직을 담당합니다.

### `src/` - 백엔드

TypeScript로 작성된 서버 측 소스 코드입니다.

-   **`app.ts`**: 애플리케이션의 메인 진입점입니다. Express 서버를 생성하고, 미들웨어를 설정하며, Socket.IO 서버를 초기화하고 HTTP 서버에 연결합니다.

-   **`constants.ts`**: 게임 전반에서 사용되는 상수(예: 게임 맵 크기, 초기 골드 등)를 정의합니다.

-   **`assets/`**: 게임의 기본 데이터가 JSON 형식으로 저장되어 있습니다. 이 데이터는 서버 시작 시 메모리에 로드됩니다.
    -   `animal.json`, `monster.json`: 유닛과 몬스터의 기본 능력치(체력, 공격력 등)를 정의합니다.
    -   `animal_unlock.json`: 유닛 해금 조건을 정의합니다.
    -   `stage.json`: 각 스테이지에 등장하는 몬스터의 종류와 수를 정의합니다.

-   **`handlers/`**: Socket.IO를 통해 클라이언트로부터 받은 이벤트를 처리하는 핵심 로직입니다.
    -   `handlerMapping.ts`: 클라이언트로부터 받은 이벤트 ID를 적절한 핸들러 함수에 매핑하는 라우팅 역할을 합니다.
    -   `game.handler.ts`: 사용자의 게임 접속 및 초기화 처리를 담당합니다.
    -   `unit.handler.ts`: 유닛 소환 및 업그레이드 요청을 처리합니다.
    -   `stage.handler.ts`: 스테이지 시작, 클리어, 실패 등 스테이지 전환 로직을 담당합니다.
    -   `ranking.handler.ts`: 게임 종료 시 점수를 기록하고 랭킹을 조회하는 로직을 담당합니다.
    -   `gameLoop.handler.ts`: 게임의 메인 루프를 관리하며, 주기적으로 게임 상태를 업데이트하고 클라이언트에 전송합니다.
    -   **`gameLoop/`**: 게임 루프의 각 단계를 처리하는 하위 핸들러들입니다.
        -   `monster.handler.ts`: 몬스터의 이동과 생성을 처리합니다.
        -   `animal.handler.ts`: 동물의 공격 및 타겟팅을 처리합니다.
        -   `battle.handler.ts`: 유닛과 몬스터 간의 전투 결과를 계산합니다.
        -   `stage.handler.ts`: 스테이지의 몬스터가 모두 소진되었는지 확인하고 다음 스테이지로 전환하는 로직을 처리합니다.

-   **`init/`**: 서버 시작 시 필요한 초기화 작업을 수행합니다.
    -   `assets.ts`: `src/assets`에 있는 JSON 파일들을 읽어와 메모리에 로드합니다.
    -   `socket.ts`: Socket.IO 서버를 설정하고, 클라이언트 연결 시 `handlerMapping`을 통해 이벤트를 처리하도록 설정합니다.

-   **`models/`**: 게임의 데이터 구조를 클래스로 정의합니다.
    -   `game.session.ts`: 각 사용자의 게임 세션 정보를 담는 `GameSession` 클래스를 정의합니다. 여기에는 유저 정보, 유닛, 몬스터 상태 등이 포함됩니다.

-   **`routers/`**: Express를 사용한 API 라우팅을 정의합니다.
    -   `cache.router.ts`: Redis와 상호작용하는 API 엔드포인트를 정의합니다. (예: 랭킹 정보 조회)

-   **`types/`**: 프로젝트 전반에서 사용되는 TypeScript 타입 정의를 담고 있습니다.
    -   `data.d.ts`: 게임 데이터(유닛, 몬스터, 스테이지 등)의 타입을 정의합니다.
    -   `payloads.d.ts`: 클라이언트와 서버 간에 주고받는 Socket.IO 이벤트 페이로드의 타입을 정의합니다.

## 🔧 트러블슈팅


### 1. `import` 경로에서 `.js` 확장자 누락 문제

-   **문제점**: TypeScript에서는 `import` 시 파일 확장자를 생략할 수 있지만, `tsc`로 컴파일된 JavaScript 파일에는 확장자가 자동으로 추가되지 않았습니다. Node.js의 ESM(ECMAScript Modules) 환경은 명시적인 파일 확장자를 요구하므로, `module not found` 오류가 발생했습니다.
-   **해결책**: 개발 환경의 실행 스크립트를 `tsx`를 사용하도록 변경했습니다 (`"dev": "tsx src/app.ts"`). `tsx`는 TypeScript 파일을 메모리 상에서 직접 변환하고 실행하여, 별도의 빌드 과정 없이도 확장자 문제를 해결해 주었습니다.

### 2. `assets` 파일 경로 문제 (`ENOENT` 오류)

-   **문제점**: `tsx`로 개발 서버를 실행했을 때, `src` 디렉토리에서 코드가 직접 실행되면서 애셋 파일(`*.json`)을 찾지 못하는 `ENOENT: no such file or directory` 오류가 발생했습니다.
-   **해결책**: 프로젝트 루트에 있던 `assets` 폴더를 `src` 폴더 내부로 이동시켰습니다. 이를 통해 개발 환경(`tsx`)과 프로덕션 환경(`tsc`로 빌드 후 `dist` 폴더에서 실행) 모두에서 일관된 상대 경로로 애셋 파일을 참조할 수 있게 되어 문제가 해결되었습니다.
