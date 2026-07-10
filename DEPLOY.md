# 오늘의 복붙 — 0원 출시 가이드 (PWA)

이 앱은 PWA(설치형 웹앱)로 준비돼 있어요. 아래 순서대로 하면 **총비용 0원**으로
폰 홈화면에 설치되는 앱을 출시할 수 있습니다.

## 1. GitHub에 올리기 (5분)

1. https://github.com 가입 (무료)
2. 우측 상단 **+** → **New repository** → 이름 `bokbup-app` → **Create**
3. 이 폴더에서 터미널 열고:

```
git remote add origin https://github.com/<내아이디>/bokbup-app.git
git push -u origin main
```

(로컬 커밋은 이미 준비돼 있어요)

## 2. Cloudtype에 배포 (10분, 무료)

1. https://cloudtype.io 가입 → GitHub 계정으로 로그인
2. **새 프로젝트** → **GitHub 저장소 연결** → `bokbup-app` 선택
3. 템플릿: **Node.js** 선택 후 설정:
   - Start command: `node server.js`
   - Port: `3456` (또는 비워두기 — 서버가 `PORT` 환경변수를 자동 인식)
4. **배포** 클릭 → 1~2분 뒤 `https://????.cloudtype.app` 주소가 생김

> 대안: https://render.com 무료 플랜도 같은 방식 (Web Service → `node server.js`).
> 15분 미사용 시 잠들었다 첫 접속이 느린 점만 감안하세요.

## 3. 폰에 설치 (앱처럼 사용)

배포된 주소를 폰에서 열면:

- **Android (Chrome)**: 자동으로 "앱 설치" 배너가 뜨거나, 메뉴(⋮) → **홈 화면에 추가**
- **iPhone (Safari)**: 공유 버튼 → **홈 화면에 추가**

홈화면의 곰돌이 아이콘을 누르면 주소창 없는 전체화면 앱으로 실행됩니다.
오프라인에서도 마지막에 본 데이터로 열려요 (서비스워커 캐시).

## 4. 나중에 스토어에 올리고 싶다면

- **Google Play** ($25 1회): https://pwabuilder.com 에 배포 주소를 넣으면
  Play 스토어용 Android 패키지(AAB)를 무료로 만들어줌 → Play Console에 업로드
- **iOS App Store** ($99/년): Mac 필요, 웹 래핑 앱은 심사 거절 위험이 있어 비추천

## 주의사항

- 클립보드 복사·서비스워커는 **HTTPS에서만** 동작해요. Cloudtype/Render는 자동으로 HTTPS를 제공하니 신경 쓸 것 없음.
- `data/stats.json`(복붙 집계)은 서버 파일이라 무료 티어에서 재배포하면 초기화될 수 있어요. 집계를 영구 보존하려면 나중에 DB(예: 무료 Turso/Supabase)로 옮기면 됩니다.
