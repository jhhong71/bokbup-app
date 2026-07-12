// 오늘의 복붙 — Cloudtype 종료 안내 서버 (cloudtype-sunset 브랜치 전용)
// 모든 요청에 이전 안내 페이지를 응답합니다.
const http = require('http');

const NEW_URL = 'https://bokbup-app.pages.dev/';
const PORT = process.env.PORT || 3456;

const PAGE = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>오늘의 복붙 — 주소가 이사했어요</title>
<meta http-equiv="refresh" content="6;url=${NEW_URL}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap" rel="stylesheet">
<style>
html,body{margin:0;height:100%;background:#FBF3E5;font-family:'Gowun Dodum',sans-serif;-webkit-tap-highlight-color:transparent}
.wrap{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;box-sizing:border-box}
.glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(360px 260px at 80% 6%, rgba(244,183,110,.28), transparent 70%),radial-gradient(320px 300px at 10% 80%, rgba(247,210,157,.30), transparent 70%)}
.bear{width:120px;height:120px;border-radius:34px;border:2px solid #F2D8B5;background:#FFFAF0;overflow:hidden;box-shadow:0 8px 24px rgba(196,148,90,.18);animation:float 3.5s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
h1{font-family:'Jua',sans-serif;font-size:26px;color:#4E3A2B;margin:22px 0 6px}
p{font-size:15px;color:#8A6B4F;line-height:1.7;margin:6px 0}
.muted{font-size:13px;color:#B99B7C}
.btn{margin-top:22px;display:inline-block;background:#EF8F3D;color:#fff;text-decoration:none;border-radius:999px;padding:15px 34px;font-family:'Jua',sans-serif;font-size:17px;box-shadow:0 4px 14px rgba(224,127,43,.4)}
.link{margin-top:14px;font-size:13px;color:#C4762A;word-break:break-all}
</style>
</head>
<body>
<div class="wrap">
  <div class="glow"></div>
  <div class="bear">
    <svg viewBox="0 0 64 64" width="100%" height="100%" style="display:block">
      <circle cx="18" cy="16" r="9" fill="#F2C894"/><circle cx="46" cy="16" r="9" fill="#F2C894"/>
      <circle cx="18" cy="17" r="4.5" fill="#FBE3C4"/><circle cx="46" cy="17" r="4.5" fill="#FBE3C4"/>
      <circle cx="32" cy="36" r="22" fill="#F2C894"/><ellipse cx="32" cy="43" rx="10" ry="8" fill="#FBE3C4"/>
      <circle cx="24" cy="32" r="2.4" fill="#5C4531"/><circle cx="40" cy="32" r="2.4" fill="#5C4531"/>
      <ellipse cx="32" cy="40" rx="3" ry="2.4" fill="#5C4531"/>
      <path d="M32 42.5v2.5 M32 45c-1.5 2-4 2-5 .5 M32 45c1.5 2 4 2 5 .5" stroke="#5C4531" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="19" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/><circle cx="45" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/>
    </svg>
  </div>
  <h1>오늘의 복붙이 이사했어요 ⸜(｡˃ ᵕ ˂ )⸝♡</h1>
  <p>이 주소는 더 이상 운영하지 않아요.<br>새 주소에서 만나요!</p>
  <a class="btn" href="${NEW_URL}">새 주소로 이동하기 ✦</a>
  <div class="link">${NEW_URL}</div>
  <p class="muted" style="margin-top:20px">잠시 후 자동으로 이동해요…</p>
</div>
<script>setTimeout(function(){ location.replace('${NEW_URL}'); }, 6000);</script>
</body>
</html>`;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(PAGE);
}).listen(PORT, () => {
  console.log('Cloudtype 종료 안내 서버 실행 → 포트 ' + PORT);
});
