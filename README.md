# 오늘의 복붙 v2.0

감성 이모티콘을 터치 한 번으로 복사하는 모바일 웹앱. REST API 서버와 연동됩니다.

## 실행

```
node server.js
```

브라우저에서 http://localhost:3456 접속. (의존성 없음 — npm install 불필요)

## 구조

- `server.js` — 순수 Node.js REST API 서버 + 정적 파일 서빙
- `data/emoticons.js` — 큐레이션 이모티콘 DB (카테고리·MBTI·태그)
- `data/imported.json` — 오픈소스 컬렉션 임포트 (약 3.6만 개)
- `data/stats.json` — 서버에 누적되는 실제 복붙 횟수 (자동 생성)
- `scripts/import-kaomoji.js` — 오픈소스 컬렉션 → 앱 스키마 변환 스크립트
- `public/index.html`, `public/app.js` — 프론트엔드

## 데이터 출처 / 라이선스

- 임포트 데이터: [kaomoji-collection](https://github.com/kaomojiya-collection/kaomoji-collection)
  (MIT License, © Kaomojiya — 전문은 `data/LICENSE-kaomoji-collection.txt`)
- 535개 원본 카테고리를 앱의 13개 카테고리로 매핑하고 한국어 태그를 부여함

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/meta` | 카테고리, MBTI 목록·설명 |
| GET | `/api/emoticons` | 전체 이모티콘 (`?cat=` `?q=` `?mbti=` 필터) |
| GET | `/api/emoticons/trend` | 트렌드 랭킹 (실제 복붙 횟수 반영) |
| GET | `/api/picks?n=8` | 오늘의 추천 (매일 자동 로테이션) |
| POST | `/api/emoticons/:id/copy` | 복붙 이벤트 집계 → 트렌드 hot에 실시간 반영 |

프론트 개인 데이터(하트·최근 복사·MBTI·설정)는 localStorage(`bokbup.v2.*`)에 저장됩니다.
