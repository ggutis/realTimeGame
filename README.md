# realTimeGame

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

## 📁 프로젝트 구조

```
.
├── public/             # 프론트엔드 정적 파일 (HTML, CSS, JS, 이미지)
├── src/                # 백엔드 TypeScript 소스 코드
│   ├── assets/         # 게임 데이터 (JSON)
│   ├── handlers/       # Socket.IO 이벤트 핸들러, 게임로직
│   ├── init/           # 서버 초기화 로직 (에셋 로딩, 소켓 설정)
│   ├── models/         # 데이터 모델
│   ├── routers/        # API 라우터
│   ├── types/          # 타입 정의
│   └── app.ts          # 메인 애플리케이션 진입점
├── package.json        # 프로젝트 메타데이터 및 의존성
└── tsconfig.json       # TypeScript 컴파일러 설정
```
