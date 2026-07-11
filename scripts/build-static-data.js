// data/emoticons.js → public/data/curated.json 변환
// (Cloudflare Pages Functions가 정적 자산으로 데이터를 읽기 위함)
const fs = require('fs');
const path = require('path');
const { CATS, MBTI_ALL, MBTI_DESCS, DATA } = require('../data/emoticons');

const outDir = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'curated.json'), JSON.stringify({ CATS, MBTI_ALL, MBTI_DESCS, DATA }));

console.log('생성: public/data/curated.json (imported.json은 import-kaomoji.js가 public/data에 직접 생성)');
