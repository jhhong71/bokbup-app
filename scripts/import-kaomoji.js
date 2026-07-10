// kaomoji-collection (MIT, https://github.com/kaomojiya-collection/kaomoji-collection)
// 원본 kaomoji.json → 앱 스키마(data/imported.json)로 변환
// 사용: node scripts/import-kaomoji.js <kaomoji.json 경로>

const fs = require('fs');
const path = require('path');
const { DATA, MBTI_ALL } = require('../data/emoticons');

const src = process.argv[2];
if (!src) { console.error('사용법: node scripts/import-kaomoji.js <kaomoji.json 경로>'); process.exit(1); }
const RAW = JSON.parse(fs.readFileSync(src, 'utf8'));

// 원본에 HTML 엔티티로 이스케이프된 항목이 섞여 있어 디코딩 필요 (&amp;는 마지막에)
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// ── 원본 카테고리(로마자) → [앱 카테고리, 한국어 태그] 매핑 ──
const M = {
  // 기쁨
  smile:['happy','웃음,스마일'], happy:['happy','행복'], yorokobu:['happy','기쁨,신남'], yatta:['happy','해냈다,만세'],
  waai:['happy','와아,신남'], tanoshii:['happy','즐거움'], tanoshimi:['happy','기대,설렘'], ukiuki:['happy','들뜸,룰루'],
  wakuwaku:['happy','설렘,두근'], wakuteka:['happy','설렘,기대'], niconico:['happy','방긋,미소'], nikkori:['happy','방긋'],
  sumairu:['happy','스마일'], ehehe:['happy','헤헤'], ahaha:['happy','아하하,웃음'], bakushou:['happy','폭소,빵터짐'],
  kerakera:['happy','깔깔,웃음'], kusukusu:['happy','킥킥'], kusa:['happy','ㅋㅋㅋ,풀'], nakiwarai:['happy','웃픈,눈물웃음'],
  'happy-tears':['happy','기쁨눈물,감격'], genki:['happy','활기,쌩쌩'], norinori:['happy','신남,흥'], runrun:['happy','룰루랄라'],
  'tension-takai':['happy','하이텐션'], hyahha:['happy','히얏하,신남'], yeay:['happy','예이'], weei:['happy','웨이,신남'],
  saikou:['happy','최고,엄지척'], omoshiroi:['happy','재밌음'], uhuhu:['happy','우후후'], fufufu:['happy','후후'],
  muhuhu:['happy','음흉웃음,흐흐'], pupupu:['happy','푸풉'], herahera:['happy','헤헤,실실'], tehe:['happy','테헤'],
  tehepero:['happy','테헷,메롱'], banzai:['happy','만세'], 'gutts-pose':['happy','승리,주먹불끈'], peace:['happy','브이,피스'],
  applause:['happy','박수,짝짝'], pachipachi:['happy','박수'], yossha:['happy','좋았어,의욕'], kita:['happy','왔다,드디어'],
  erai:['happy','장하다,칭찬'], 'good-job':['happy','굿잡,칭찬'], iine:['happy','좋아요'], sugoi:['happy','대단해,감탄'],
  kando:['happy','감동'], yokatta:['happy','다행,안도'], koufun:['happy','흥분,들썩'], dance:['happy','춤,댄스'],
  utau:['happy','노래,랄라'], karaoke:['happy','노래방'], kuchibue:['happy','휘파람'], tobu:['happy','점프,폴짝'],
  doya:['happy','도야,으스댐'], ehhen:['happy','에헴,으쓱'], ninmari:['happy','씨익,흐뭇'], hokkori:['happy','훈훈,포근'],
  mabushii:['happy','눈부심,반짝'], nakayoshi:['greet','사이좋게,단짝'],
  // 슬픔
  cry:['sad','울음,눈물'], sad:['sad','슬픔'], uwaan:['sad','엉엉,으앙'], pien:['sad','피엔,글썽'],
  uruuru:['sad','글썽,촉촉'], shonbori:['sad','시무룩'], shobon:['sad','시무룩,풀죽음'], shun:['sad','풀죽음'],
  gakkari:['sad','실망'], ochikkomu:['sad','우울,침울'], tohoho:['sad','토호호,울상'], zannen:['sad','아쉬움'],
  tsurai:['sad','힘듦'], shindoi:['sad','지침,힘듦'], tired:['sad','피곤'], guttari:['sad','축처짐,방전'],
  tameiki:['sad','한숨'], haa:['sad','하아,한숨'], sabishii:['sad','외로움,쓸쓸'], fuan:['sad','불안'],
  shinpai:['sad','걱정'], nayamu:['sad','고민'], komaru:['sad','곤란,난감'], gaan:['sad','충격,가안'],
  shock:['sad','충격'], zusaa:['sad','털썩,좌절'], owata:['sad','망했다'], shinmiri:['sad','숙연,잔잔'],
  hankachi:['sad','손수건,눈물닦기'], buwaa:['sad','부왁,울음'], ijikeru:['sad','주눅,꽁함'], menhera:['sad','멘붕,싱숭'],
  tobotobo:['sad','터덜터덜'], yoboyobo:['sad','기진맥진,비틀'], gessori:['sad','핼쑥,수척'],
  atamakakaeru:['sad','머리싸매기,절망'], oteage:['sad','포기,손들었다'], chiin:['sad','칭,멘붕'],
  // 사랑
  love:['love','러브,사랑'], heart:['love','하트'], kiss:['love','키스,뽀뽀'], chu:['love','쪽,뽀뽀'],
  meromero:['love','메로메로,헤롱'], kyun:['love','심쿵,큥'], zukyun:['love','심쿵,화살'], dokidoki:['love','두근두근'],
  ichaicha:['love','꽁냥꽁냥,커플'], dakitsuku:['love','와락,포옹'], hug:['love','포옹,안기'], gyu:['love','꼬옥,포옹'],
  nadenade:['love','쓰담쓰담'], naderu:['love','쓰담'], yoshiyoshi:['love','토닥토닥,착하지'], iikoiiko:['love','착하지,쓰담'],
  surisuri:['love','부비부비'], toutoi:['love','소중해,존귀'], uttori:['love','황홀,꿈결'], moeshinu:['love','모에,심장폭발'],
  // 삐짐·화남
  angry:['stern','화남'], oko:['stern','화남,분노'], punpun:['stern','뿔남,푼푼'], mukatsuku:['stern','짜증,열받음'],
  iraira:['stern','짜증,초조'], fuman:['stern','불만'], buu:['stern','부우,불만'], fukurettsura:['stern','볼빵빵,삐짐'],
  suneru:['stern','삐짐,꽁함'], tsuntsun:['stern','새침,츤츤'], pui:['stern','흥,획'], muu:['stern','무우,뾰로통'],
  gorua:['stern','고라,호통'], ikaku:['stern','위협,으르렁'], meramera:['stern','활활,불타오름'], bikibiki:['stern','핏대'],
  pikipiki:['stern','핏대,부들'], gununu:['stern','끄응,분함'], jitome:['stern','반쯤뜬눈,시선'], shirome:['stern','흰자위,어이없음'],
  donbiki:['stern','질색,흠칫'], akireru:['stern','어이없음,황당'], yareyare:['stern','어휴,야레야레'], dame:['stern','안돼,금지'],
  muri:['stern','무리,절레절레'], irane:['stern','필요없어,거절'], uzai:['stern','짜증나'], mendokusai:['stern','귀찮아'],
  nandato:['stern','뭐라고,발끈'], funsu:['stern','콧김,분발'], oraora:['stern','오라오라,윽박'], aori:['stern','도발,약올리기'],
  shitauchi:['stern','쯧,혀차기'], shikametsura:['stern','찌푸림'], 'miken-shiwa':['stern','미간주름'], magao:['stern','무표정,정색'],
  gaman:['stern','꾹참기,인내'], bakuhatsu:['stern','폭발,펑'], kuyashii:['stern','분함,억울'],
  // 귀여움
  cute:['cute','귀염,카와이'], mojimoji:['cute','쭈뼛쭈뼛,머뭇'], shy:['cute','수줍,부끄'], hazukashii:['cute','부끄부끄,홍조'],
  iyan:['cute','이잉,애교'], amaeru:['cute','응석,애교'], mofumofu:['cute','복슬복슬'], fuwafuwa:['cute','몽실몽실,폭신'],
  mochimochi:['cute','말랑말랑,쫀득'], munimuni:['cute','몰랑몰랑'], momimomi:['cute','주물주물'], kyururun:['cute','큐룽,눈망울'],
  yumekawa:['cute','꿈꾸는,파스텔'], tsuinteeru:['cute','트윈테일'], matsuge:['cute','속눈썹'], peek:['cute','빼꼼,훔쳐보기'],
  kakureru:['cute','숨기,빼꼼'], chirachira:['cute','흘끔흘끔'], jii:['cute','뚫어져라,응시'], kocchiminina:['cute','쳐다봐,시선'],
  hanya:['cute','하냥,나른'], pokaan:['cute','머엉,멍때림'], kubiwokashigeru:['cute','갸웃,갸우뚱'], wink:['cute','윙크'],
  akachan:['cute','아기,베이비'], nemui:['cute','졸림,잠'], neru:['cute','잠,취침'], suyaa:['cute','쿨쿨,새근새근'],
  futon:['cute','이불,꿀잠'], akubi:['cute','하품'], gorogoro:['cute','뒹굴뒹굴'], goron:['cute','벌러덩'],
  relax:['cute','휴식,여유'], iyashi:['cute','힐링,치유'], yurui:['cute','느긋,여유'], angel:['cute','천사,날개'],
  chokon:['cute','쪼그리,얌전'], chiikawa:['cute','치이카와,캐릭터'], gyaru:['cute','갸루,포즈'],
  // 동물
  cat:['animal','고양이,냥'], nyaa:['animal','냐옹,고양이'], kitty:['animal','고양이'], dog:['animal','강아지,멍멍'],
  kuma:['animal','곰,곰돌이'], rabbit:['animal','토끼'], hamusutaa:['animal','햄스터'], hiyoko:['animal','병아리'],
  tori:['animal','새'], karasu:['animal','까마귀'], kamome:['animal','갈매기'], pengin:['animal','펭귄'],
  azarashi:['animal','물개,물범'], same:['animal','상어'], fish:['animal','물고기'], unagi:['animal','장어'],
  ika:['animal','오징어'], tako:['animal','문어'], kani:['animal','게'], kurage:['animal','해파리'],
  kaeru:['animal','개구리'], buta:['animal','돼지'], horse:['animal','말'], lion:['animal','사자'],
  tora:['animal','호랑이'], gorira:['animal','고릴라'], kitsune:['animal','여우'], tanuki:['animal','너구리'],
  momonga:['animal','날다람쥐'], ahiru:['animal','오리'], uupaaruupaa:['animal','우파루파'], gao:['animal','어흥,울부짖기'],
  nikukyuu:['animal','발바닥,젤리'], bufo:['animal','개구리,부포'], animal:['animal','동물'],
  // 인사·소통
  aisatsu:['greet','인사'], 'good-morning':['greet','좋은아침,굿모닝'], 'good-night':['greet','잘자,굿나잇'],
  konbanwa:['greet','저녁인사'], hai:['greet','네,대답'], ok:['greet','오케이'], bow:['greet','꾸벅,절'],
  byebye:['greet','빠이빠이,작별'], matane:['greet','또봐,다음에'], sayounara:['greet','작별,안녕'],
  tewofuru:['greet','손흔들기'], yobu:['greet','부르기,어이'], ooi:['greet','어이,부르기'], oide:['greet','이리와'],
  kamoon:['greet','컴온,이리와'], douzo:['greet','여기요,드세요'], watasu:['greet','건네기,전달'], sashidasu:['greet','내밀기'],
  tadaima:['greet','다녀왔습니다'], okaeri:['greet','어서와'], ittekimasu:['greet','다녀오겠습니다'], itterasshai:['greet','잘다녀와'],
  otsukaresama:['greet','수고했어'], thanks:['greet','고마워,감사'], orei:['greet','감사,답례'], azasu:['greet','앗쓰,감사'],
  yoroshiku:['greet','잘부탁해'], sorry:['greet','미안,사과'], sumimasen:['greet','죄송,사과'], ayamaru:['greet','사과,꾸벅'],
  dogeza:['greet','넙죽,사죄'], moushiwakenai:['greet','죄송,사죄'], please:['greet','부탁,플리즈'], ogamu:['greet','기도,빌기'],
  pray:['greet','기도'], salute:['greet','경례,충성'], kyoshu:['greet','손들기,저요'], haitacchi:['greet','하이파이브,짝'],
  nakama:['greet','친구,동료'], hisohiso:['greet','속닥속닥,귓속말'], naisho:['greet','비밀,쉿'], nee:['greet','있잖아,말걸기'],
  odaijini:['greet','몸조심,쾌유'], ouen:['greet','응원'], fight:['greet','화이팅,파이팅'], ganbaru:['greet','힘내,분발'],
  furefure:['greet','응원,후레후레'], understand:['greet','알겠어,이해'], naruhodo:['greet','그렇구나,납득'],
  nodding:['greet','끄덕끄덕'], sorena:['greet','그니까,맞아'], fumufumu:['greet','흠흠,경청'], safe:['greet','세이프'],
  sefusefu:['greet','세이프,아슬'],
  // 음식
  taberu:['food','먹방,냠냠'], mogumogu:['food','오물오물'], mushamusha:['food','냠냠,와구와구'], delicious:['food','맛있다'],
  umai:['food','맛있다,꿀맛'], jururi:['food','군침'], drooling:['food','침흘림,군침'], gokugoku:['food','꿀꺽꿀꺽'],
  nomu:['food','마시기'], gokuri:['food','꿀꺽'], beer:['food','맥주,치얼스'], kanpai:['food','건배'],
  ocha:['food','차,티타임'], cafe:['food','카페,커피'], raamen:['food','라면'], rice:['food','밥,주먹밥'],
  banana:['food','바나나'], takoyaki:['food','타코야키'], itadakimasu:['food','잘먹겠습니다'], gochisousama:['food','잘먹었습니다'],
  peropero:['food','낼름,핥기'],
  // 이벤트·계절
  birthday:['event','생일,축하'], congratulations:['event','축하'], cracker:['event','폭죽,팡파레'],
  kurisumasu:['event','크리스마스,산타'], halloween:['event','할로윈'], oshogatsu:['event','새해,설날'],
  matsuri:['event','축제'], hanabi:['event','불꽃놀이'], camp:['event','캠핑'], haru:['event','봄,벚꽃'],
  natsu:['event','여름'], aki:['event','가을'], yuki:['event','눈,겨울'], samui:['event','추워,겨울'],
  atsui:['event','더워,여름'], ame:['event','비,우산'], taiyou:['event','해,맑음'], sun:['event','태양'],
  kaze:['event','바람,감기'], obake:['event','유령,오바케'], majo:['event','마녀,할로윈'], kabocha:['event','호박,할로윈'],
  oni:['event','도깨비,오니'], eiga:['event','영화'], yakyuu:['event','야구,스포츠'], wasshoi:['event','영차,축제'],
  valentine:['event','발렌타인,초콜릿'],
  // 액션
  run:['action','달리기,전력질주'], dash:['action','대시,슝'], aruku:['action','걷기,산책'], tokotoko:['action','총총,아장아장'],
  nigeru:['action','도망,줄행랑'], catch:['action','캐치,붙잡기'], tsukamaeru:['action','붙잡기'], throw:['action','던지기,휙'],
  poi:['action','휙,버리기'], suteru:['action','버리기'], tataku:['action','두드리기,탕탕'], banban:['action','탕탕,책상치기'],
  naguru:['action','펀치,때리기'], punch:['action','펀치'], binta:['action','따귀,찰싹'], chabudaigaeshi:['action','밥상엎기,뒤집기'],
  kieru:['action','사라지기,증발'], ninja:['action','닌자,은신'], shuriken:['action','수리검,슉'], beam:['action','빔,발사'],
  juu:['action','총,빵야'], magic:['action','마법,요술'], kamera:['action','찰칵,카메라'], memo:['action','메모,필기'],
  benkyou:['action','공부,열공'], pasokon:['action','컴퓨터,타닥타닥'], sentaku:['action','빨래,집안일'],
  goshigoshi:['action','쓱싹,문지르기'], sagasu:['action','찾기,수색'], kyorokyoro:['action','두리번'],
  mukimuki:['action','근육,머슬'], power:['action','파워,힘'], morimori:['action','불끈불끈,의욕'], ude:['action','팔근육,알통'],
  yubisashi:['action','손가락질,지목'], bishi:['action','척,비시'], shakiin:['action','샤킨,번쩍'], gu:['action','주먹,바위'],
  goo:['action','주먹'], paa:['action','보자기,쫙'], pochipochi:['action','타닥타닥,폭풍타자'], zuizui:['action','쓱쓱,접근'],
  tsukkomi:['action','츳코미,태클'], check:['action','체크,확인'], eieio:['action','영차영차'], hipparu:['action','잡아당기기'],
  jitabata:['action','바둥바둥,발버둥'], basu:['action','버스,드라이브'],
  // 데코
  line:['deco','구분선,라인'], kirakira:['deco','반짝반짝'], pikapika:['deco','반짝,광'], star:['deco','별'],
  kiraan:['deco','번쩍,빛남'], ribbon:['deco','리본'], hana:['deco','꽃'], bara:['deco','장미'],
  happa:['deco','잎,새싹'], shabondama:['deco','비눗방울'], tsuki:['deco','달'], nagareboshi:['deco','별똥별,유성'],
  'speech-bubble':['deco','말풍선'], kigou:['deco','기호,무늬'], alphabet:['deco','알파벳,레터링'], wing:['deco','날개'],
  hane:['deco','깃털,날개'],
  // 기타 (놀람·리액션·캐릭터 등)
  surprise:['etc','놀람,깜짝'], e:['etc','엥,어리둥절'], hah:['etc','헉'], gyaa:['etc','꺄악,비명'],
  gyapi:['etc','갸피,경악'], hawawa:['etc','하와와,당황'], awateru:['etc','허둥지둥'], aseru:['etc','초조,조급'],
  asease:['etc','진땀,땀삐질'], sweat:['etc','식은땀'], gakuburu:['etc','덜덜,벌벌'], obieru:['etc','겁먹음,움찔'],
  scary:['etc','무서워,오싹'], kizetsu:['etc','기절,실신'], zawazawa:['etc','수군수군,술렁'], guruguru:['etc','빙글빙글,어질'],
  biyoon:['etc','뾰용,통통'], yureru:['etc','흔들흔들'], tokeru:['etc','흐물흐물,녹음'], hirameku:['etc','번뜩,아이디어'],
  kangaeru:['etc','생각중,고민'], omou:['etc','생각,상상'], gimon:['etc','의문,물음표'], hatena:['etc','물음표,갸우뚱'],
  wakaranai:['etc','모르겠어,갸웃'], uun:['etc','으음,고민'], konwaku:['etc','혼란,당황'], shingichuu:['etc','심의중,판단중'],
  kinchou:['etc','긴장,떨림'], sowasowa:['etc','안절부절'], doraemon:['etc','도라에몽,캐릭터'], kirby:['etc','커비,캐릭터'],
  baymax:['etc','베이맥스,캐릭터'], miffy:['etc','미피,캐릭터'], 'my-melody':['etc','마이멜로디,캐릭터'],
  anpanman:['etc','호빵맨,캐릭터'], character:['etc','캐릭터'], piero:['etc','삐에로,광대'], tengu:['etc','텐구,요괴'],
  glasses:['etc','안경,척척'], sunglasses:['etc','선글라스,시크'], hage:['etc','반들,머리'], debu:['etc','통통,포동'],
  yaseru:['etc','다이어트,홀쭉'], hengao:['etc','얼굴개그,익살'], nosebleed:['etc','코피,헉'], kimochiwarui:['etc','찝찝,으엑'],
  kusai:['etc','냄새,코막힘'], onara:['etc','방귀,뿡'], oshiri:['etc','엉덩이,힙'], hanahoji:['etc','코파기,심드렁'],
  deppa:['etc','이빨,뻐드렁니'], seki:['etc','기침,콜록'], kushami:['etc','재채기,에취'], guaiwarui:['etc','아픔,골골'],
  okane:['etc','돈,부자'], tegami:['etc','편지,쪽지'], raritteru:['etc','몽롱,헤롱'], otaku:['etc','오타쿠,덕질'],
  gokiburi:['etc','바퀴벌레,꺅'], ka:['etc','모기,앵앵'], juujika:['etc','십자가'], namunamu:['etc','합장,나무나무'],
  noroi:['etc','저주,으스스'], yabai:['etc','야바이,대박'], nichaa:['etc','씨익,니챠'], niyaniya:['etc','히죽히죽,음흉'],
  waruikao:['etc','악당미소,음모'], sneaky:['etc','살금살금,몰래'], kosokoso:['etc','살금살금'], fuun:['etc','후웅,흐음'],
  ho:['etc','안도,휴'], su:['etc','스윽'], suu:['etc','스으,숨고르기'], sarasara:['etc','사락사락,찰랑'],
  grave:['etc','성불,무덤'], 'vomit-blood':['etc','피토,격함'], urayamashii:['etc','부러움,샘'], tasukete:['etc','도와줘,구조'],
  itai:['etc','아야,아픔'], fall:['etc','넘어짐,꽈당'], zuko:['etc','자빠짐,꽈당'], yarareta:['etc','당했다,털썩'],
  komaru2:['etc','곤란'],
};

const POOLS = {
  happy: ['ENFP','ESFP','ENFJ','ESFJ','ESTP','ENTP'],
  sad: ['INFP','ISFJ','INFJ','ISFP','INTP'],
  love: ['ENFJ','ESFJ','INFP','ISFJ','ENFP','ESFP'],
  stern: ['ENTJ','ESTJ','INTJ','ISTP','ESTP'],
  cute: ['ISFP','INFP','ISFJ','ESFP','INFJ'],
  deco: ['INFP','ISFP','INFJ','INTP','ISTJ'],
  animal: ['ISFP','ISFJ','INFP','ENFP','INTP'],
  greet: ['ESFJ','ENFJ','ISFJ','ISTJ','ENFP'],
  food: ['ESFJ','ESFP','ISFJ','ISTP','ENFP'],
  event: ['ESFP','ENFP','ESFJ','ESTP','ENFJ'],
  action: ['ESTP','ENTP','ESTJ','ENTJ','ISTP'],
  etc: MBTI_ALL,
};

const seen = new Set(DATA.map(d => d.content.trim()));
const out = [];
let skippedDup = 0, skippedBad = 0, n = 0;

for (const srcCat of Object.keys(RAW)) {
  const map = M[srcCat];
  const cat = map ? map[0] : 'etc';
  const tags = map ? map[1].split(',') : [srcCat, '기타'];
  const pool = POOLS[cat] || MBTI_ALL;
  const desc = (map ? tags[0] : '컬렉션') + ' 카오모지';
  for (const raw of RAW[srcCat]) {
    const content = decodeEntities(decodeEntities(String(raw))).trim(); // 이중 이스케이프 항목 대응
    if (content.length < 2 || content.length > 44 || /[\n\r\t]/.test(content)) { skippedBad++; continue; }
    if (seen.has(content)) { skippedDup++; continue; }
    seen.add(content);
    n++;
    const m1 = pool[n % pool.length];
    let m2 = pool[(n + 3) % pool.length];
    if (m2 === m1) m2 = pool[(n + 1) % pool.length];
    out.push({ id: 'x' + n, content, cat, tags, mbti: m2 === m1 ? [m1] : [m1, m2], desc });
  }
}

const dest = path.join(__dirname, '..', 'data', 'imported.json');
fs.writeFileSync(dest, JSON.stringify(out), 'utf8');
console.log('가져옴: ' + out.length + '개  (중복 제외: ' + skippedDup + ', 필터 제외: ' + skippedBad + ')');
const byCat = {};
for (const it of out) byCat[it.cat] = (byCat[it.cat] || 0) + 1;
console.log(JSON.stringify(byCat, null, 1));
