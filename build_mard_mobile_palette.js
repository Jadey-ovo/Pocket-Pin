const fs = require('fs');
const path = require('path');

const TARGET = __dirname;
const SOURCE_URL = 'https://www.pindou.online/colors';

const GROUPS = {
  A: { zh: '黄・橙', en: 'Yellow · Orange', count: 26 },
  B: { zh: '绿', en: 'Green', count: 32 },
  C: { zh: '青・蓝', en: 'Cyan · Blue', count: 29 },
  D: { zh: '蓝紫・紫', en: 'Blue Purple · Purple', count: 26 },
  E: { zh: '粉・洋红', en: 'Pink · Magenta', count: 24 },
  F: { zh: '红・珊瑚', en: 'Red · Coral', count: 25 },
  G: { zh: '肤・棕', en: 'Skin · Brown', count: 21 },
  H: { zh: '黑白灰・中性', en: 'Neutral', count: 23 },
  M: { zh: '低饱和中性色', en: 'Muted Neutrals', count: 5 },
};

const SEARCH_ALIASES = {
  A: '黄 黄色 橙 橙色 金 金色 暖色 yellow orange gold warm',
  B: '绿 绿色 草绿 深绿 浅绿 green lime olive',
  C: '青 蓝 蓝色 天蓝 湖蓝 水蓝 cyan blue azure sky teal',
  D: '紫 蓝紫 紫色 violet purple lavender indigo',
  E: '粉 粉色 洋红 桃粉 玫红 pink magenta rose',
  F: '红 红色 珊瑚 西瓜红 red coral scarlet',
  G: '肤 肤色 肉色 棕 棕色 咖啡 brown tan beige skin nude coffee',
  H: '黑 白 灰 灰色 中性 透明 black white gray grey neutral clear',
  M: '低饱和 莫兰迪 中性 奶茶 灰调 muted neutral morandi soft',
};

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function colorsFromPublicHtml(html) {
  const map = new Map();
  const pattern = /(#[0-9A-Fa-f]{6})[\s\S]{0,260}?Mard_([A-Z]+\d+)/g;
  for (const match of html.matchAll(pattern)) {
    map.set(match[2], match[1].toUpperCase());
  }

  const colors = [];
  for (const [group, info] of Object.entries(GROUPS)) {
    for (let i = 1; i <= info.count; i += 1) {
      const code = `${group}${i}`;
      const hex = map.get(code);
      if (!hex) throw new Error(`Missing ${code}`);
      colors.push({ code, group, family: info.zh, hex, valueStatus: '第三方显示值' });
    }
  }
  return colors;
}

function colorsFromExistingHtml() {
  const file = path.join(TARGET, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/const COLORS=(\[.*?\]);\s*const GROUPS=/s);
  if (!match) throw new Error('Cannot recover COLORS from existing index.html');
  return JSON.parse(match[1]);
}

async function loadColors() {
  try {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return colorsFromPublicHtml(await response.text());
  } catch (error) {
    return colorsFromExistingHtml();
  }
}

function renderHtml(colors) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f8f8f0">
  <meta name="description" content="MARD 拼豆 211 色移动端参考色板。">
  <title>POCKET PIN · MARD 211</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vant@4/lib/index.css">
  <style>
    :root{--animal-font:Nunito,'Noto Sans SC',-apple-system,'PingFang SC','Hiragino Sans GB',sans-serif;--animal-primary:#19c8b9;--animal-text:#794f27;--animal-text-body:#725d42;--animal-text-secondary:#9f927d;--animal-text-disabled:#c4b89e;--animal-bg:#f8f8f0;--animal-border:#c4b89e;--animal-radius-pill:50px;--animal-focus-yellow:#ffcc00;--animal-focus-yellow-d:#e0b800;--animal-ease:cubic-bezier(.4,0,.2,1);--animal-duration-fast:.15s;--animal-duration:.25s;--van-primary-color:var(--animal-primary);--van-text-color:var(--animal-text);--van-text-color-2:var(--animal-text-body);--van-text-color-3:var(--animal-text-secondary);--van-background:var(--animal-bg);--van-background-2:#f7f3df;--van-cell-background:transparent;--van-cell-horizontal-padding:0;--van-field-input-text-color:var(--animal-text-body)}
    *{box-sizing:border-box}html,body,#app{min-height:100%;margin:0}body{background:#e7e0e2;color:var(--animal-text-body);font-family:var(--animal-font);font-weight:500;-webkit-font-smoothing:antialiased}.app-shell{width:min(100%,640px);margin:auto;min-height:100vh;background:var(--animal-bg);overflow:hidden;border-left:1px solid rgba(196,184,158,.55);border-right:1px solid rgba(196,184,158,.55)}
    .hero{position:relative;padding:calc(20px + env(safe-area-inset-top)) 28px 34px;background:linear-gradient(165deg,#fffbe7 0%,#f7f3df 57%,#e6f9f6 100%);border-bottom:1.5px solid var(--animal-border)}.hero:before,.hero:after{content:'';position:absolute;border-radius:999px;opacity:.55;pointer-events:none}.hero:before{width:118px;height:118px;right:-26px;top:26px;background:#f7cd67}.hero:after{width:58px;height:58px;right:76px;top:72px;background:#82d5bb}
    .hero-top{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto;align-items:start;gap:14px}.ribbon{display:inline-flex;align-items:center;justify-self:start;min-height:36px;padding:0 26px 0 38px;background:var(--animal-primary);color:#fff;border:2px solid #11a89b;clip-path:polygon(0 0,100% 0,92% 50%,100% 100%,0 100%,8% 50%);filter:drop-shadow(0 3px 0 #0d978d);font-size:12px;font-weight:900;letter-spacing:.08em;white-space:nowrap}.ribbon-number{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;margin-left:8px;padding:0 7px;border-radius:999px;background:#fff8e1;color:#168f84;font-size:11px;letter-spacing:0}
    .hero-actions{display:flex;align-items:center;justify-self:end;align-self:start;gap:10px;margin-top:6px}.icon-link{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:2px solid var(--animal-border);border-radius:999px;background:#fffbe7;color:var(--animal-text-body);font:inherit;text-decoration:none;box-shadow:0 2px 4px rgba(61,52,40,.06);cursor:pointer}.icon-link svg{width:22px;height:22px;display:block;fill:currentColor}.icon-link:focus-visible{outline:3px solid var(--animal-focus-yellow);outline-offset:2px}
    .language-switch{position:relative;display:inline-flex;align-items:center;width:112px;height:44px;padding:4px;border:2px solid var(--animal-border);border-radius:999px;background:#fffbe7;color:var(--animal-text-body);font-family:var(--animal-font);font-size:15px;font-weight:900;box-shadow:0 2px 4px rgba(61,52,40,.06)}.language-switch:focus-within{outline:3px solid var(--animal-focus-yellow);outline-offset:2px}.language-switch .switch-thumb{position:absolute;top:4px;left:4px;width:50px;height:36px;border-radius:999px;background:var(--animal-primary);box-shadow:0 3px 0 #0d978d;transition:transform var(--animal-duration-fast) var(--animal-ease)}.language-switch.is-en .switch-thumb{transform:translateX(54px)}.language-switch button{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;flex:1;height:36px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--animal-text-body);font:inherit;line-height:1;text-align:center}.language-switch button:first-of-type{color:#fff}.language-switch.is-en button:first-of-type{color:var(--animal-text-body)}.language-switch.is-en button:last-of-type{color:#fff}
    h1{position:relative;z-index:1;margin:28px 0 10px;color:var(--animal-text);font-size:clamp(30px,8.6vw,44px);line-height:1.06;font-weight:900;letter-spacing:.01em}.subtitle{position:relative;z-index:1;margin:0;max-width:460px;color:var(--animal-text-body);font-size:15px;line-height:1.65}
    .toolbar{position:sticky;top:0;z-index:10;padding:18px 22px 14px;background:rgba(248,248,240,.94);backdrop-filter:blur(12px);border-bottom:1px solid rgba(196,184,158,.55)}.search-field{overflow:hidden;border:2px solid #e8dcc8;border-radius:999px;background:#fffbe7;transition:box-shadow var(--animal-duration) var(--animal-ease),border-color var(--animal-duration) var(--animal-ease)}.search-field:focus-within{border-color:var(--animal-focus-yellow-d);box-shadow:0 3px 0 var(--animal-focus-yellow-d),0 0 0 3px rgba(255,204,0,.15)}.search-field .van-field{padding:0 16px;background:transparent}.search-field .van-field__control{height:44px;color:var(--animal-text-body);font-family:var(--animal-font);font-size:14px;font-weight:500}.search-field .van-field__control::placeholder{color:var(--animal-text-disabled);font-weight:400}
    .series-tabs{display:flex;align-items:flex-start;gap:10px;overflow-x:auto;overflow-y:visible;padding:14px 0 9px;scrollbar-width:none}.series-tabs::-webkit-scrollbar{display:none}.series-tabs .van-button{flex:0 0 auto;height:32px;min-width:62px;padding:0 14px;border:1.5px solid var(--animal-border);border-radius:999px;background:#fffbe7;color:var(--animal-text-body);font-family:var(--animal-font);font-size:12px;font-weight:800;box-shadow:0 2px 4px rgba(61,52,40,.06);transition:all var(--animal-duration-fast) var(--animal-ease)}.series-tabs .van-button--primary{border-color:var(--animal-primary);background:var(--animal-primary);color:#fff;box-shadow:0 3px 0 #0d978d}
    .content{padding:18px 22px 48px}.result-bar{display:flex;justify-content:space-between;align-items:center;margin:4px 2px 26px;color:var(--animal-text-secondary);font-size:13px}.result-bar strong{color:var(--animal-text);font-weight:900}.group{margin-top:24px;scroll-margin-top:126px}.group-title{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 2px 12px}.group-title h2{margin:0;color:var(--animal-text);font-size:24px;font-weight:900}.group-title span{color:var(--animal-text-secondary);font-size:12px;font-weight:800;text-align:right}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .bead-card{overflow:hidden;min-width:0;border:1.5px solid var(--animal-border);border-radius:18px;background:#fffdf7;transition:border-color var(--animal-duration) var(--animal-ease);-webkit-tap-highlight-color:transparent}.bead-card:hover{border-color:var(--animal-primary)}.bead-swatch{height:104px;border-bottom:1.5px solid rgba(114,93,66,.16)}.bead-info{padding:12px 14px 13px}.bead-code{color:var(--animal-text);font-size:22px;font-weight:900}.bead-hex{margin-top:6px;color:var(--animal-text-body);font-size:14px;font-weight:900;letter-spacing:.025em}.bead-family{margin-top:4px;color:var(--animal-text-secondary);font-size:12px;font-weight:800}.empty{padding:64px 20px;text-align:center;color:var(--animal-text-secondary);font-size:14px}
    .accuracy-dialog,.repo-dialog{width:min(calc(100vw - 44px),370px);padding:24px 20px 20px;border:1.5px solid var(--animal-border);border-radius:28px;background:#fffdf7}.accuracy-dialog h2,.repo-dialog h2{margin:0 0 16px;color:var(--animal-text);font-size:20px;font-weight:900;line-height:1.28}.accuracy-dialog ol{display:grid;gap:12px;margin:0;padding:0;list-style:none;color:var(--animal-text-body);font-size:14px;line-height:1.62;font-weight:800;counter-reset:accuracy}.accuracy-dialog li{display:grid;grid-template-columns:24px minmax(0,1fr);column-gap:10px;align-items:start;color:#7f6a4d}.accuracy-dialog li:before{counter-increment:accuracy;content:counter(accuracy);display:grid;place-items:center;width:22px;height:22px;margin-top:1px;border-radius:999px;background:var(--animal-primary);color:#fff;font-size:12px;font-weight:900;box-shadow:0 2px 0 #0d978d}.repo-dialog p{margin:0;color:#7f6a4d;font-size:14px;line-height:1.7;font-weight:800}.dialog-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;margin-top:20px}.accuracy-dialog .van-button,.repo-dialog .van-button{height:48px;border-radius:999px;font-family:var(--animal-font);font-weight:900}.accuracy-dialog .van-button,.repo-confirm{width:100%;border:2px solid var(--animal-primary)!important;background:var(--animal-primary)!important;color:#fff!important;box-shadow:0 3px 0 #0d978d!important}.repo-cancel{width:100%;border:2px solid var(--animal-border)!important;background:#fffbe7!important;color:var(--animal-text-body)!important;box-shadow:0 2px 4px rgba(61,52,40,.06)!important}
    .van-toast{display:flex!important;align-items:center!important;width:auto!important;max-width:min(calc(100vw - 40px),300px)!important;min-width:0!important;min-height:44px!important;padding:8px 14px!important;border:2px solid var(--animal-border)!important;border-radius:20px!important;background:#fffbe7!important;color:var(--animal-text)!important;box-shadow:0 3px 0 #d6c48f,0 10px 22px rgba(61,52,40,.16)!important;font-family:var(--animal-font)!important;font-weight:900!important}.van-toast:before{content:'';flex:0 0 auto;width:12px;height:12px;margin-right:12px;border-radius:999px;background:var(--animal-primary);box-shadow:0 2px 0 #0d978d}.van-toast__text{font-size:13px!important;line-height:1.32!important;white-space:nowrap!important}.van-toast--text{padding:8px 14px!important}.van-popup{background:transparent}.footer{padding:8px 0 0;color:var(--animal-text-disabled);font-size:11px;text-align:center}
    @media(max-width:520px){body{background:var(--animal-bg)}.app-shell{border:0}.hero{padding:18px 16px 24px}.hero-top{grid-template-columns:1fr auto;gap:10px}.hero-actions{margin-top:2px}.ribbon{font-size:11px;min-height:34px;padding-left:32px;padding-right:24px}.ribbon-number{height:26px;min-width:26px}.icon-link{width:42px;height:42px}.language-switch{width:108px;height:42px;font-size:14px}.language-switch .switch-thumb{width:48px;height:34px}.language-switch.is-en .switch-thumb{transform:translateX(52px)}.language-switch button{height:34px}h1{margin-top:22px;font-size:36px}.subtitle{font-size:14px}.toolbar{padding:14px 14px 12px}.content{padding:16px 14px 44px}.cards{gap:10px}.bead-swatch{height:84px}.bead-info{padding:10px 11px 11px}.bead-code{font-size:19px}.bead-hex{font-size:13px}.group-title h2{font-size:22px}.group-title span{font-size:11px}.series-tabs{gap:8px}.series-tabs .van-button{min-width:52px}}
    @media(min-width:560px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:0s!important}}
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vant@4/lib/vant.min.js"></script>
  <script>
    const COLORS=${safeJson(colors)};
    const GROUPS=${safeJson(GROUPS)};
    const SEARCH_ALIASES=${safeJson(SEARCH_ALIASES)};
    const {createApp,ref,computed,nextTick,onMounted}=Vue;
    createApp({setup(){const query=ref('');const active=ref('all');const locale=ref('zh');const accuracyOpen=ref(true);const repoOpen=ref(false);const repoUrl='https://github.com/Jadey-ovo/Pocket-Pin';const groupKeys=Object.keys(GROUPS);const lang=computed(()=>locale.value==='zh'?{searchRegion:'色板检索',searchPlaceholder:'搜色号、HEX、色系或颜色描述，如 C8 / 蓝 / 粉',filter:'筛选色系',all:'All',showing:'Showing',colors:'colors',series:'series',empty:'没有找到匹配颜色，换个词试试。',noteTitle:'使用前，小 PO 有几句话要说：',noteItems:['POCKET PIN 色号基于 MARD 品牌拼豆色系编号进行归类','页面内 HEX 为第三方色卡的屏幕显示参考，非官方公布的数字色彩标准','实物制作请以同批次实体产品与实体色卡为准哦'],noteOk:'我知豆了',repoTitle:'要去代码小屋看看吗？',repoText:'这里会打开 POCKET PIN 的 GitHub 仓库。小 PO 先帮你扶好门，确认一下再出发。',repoCancel:'先不去',repoConfirm:'去看看',footer:'POCKET PIN · 版本 0.1.0 · 核验日 2026-08-14'}:{searchRegion:'Palette search',searchPlaceholder:'Search code, HEX, family or color words, e.g. C8 / blue',filter:'Filter family',all:'All',showing:'Showing',colors:'colors',series:'series',empty:'No matching colors. Try another keyword.',noteTitle:'Before using, little PO has a few notes:',noteItems:['POCKET PIN groups color codes based on the MARD bead color numbering system.','The HEX values on this page are third-party screen display references, not an official digital color standard.','For physical making, please use same-batch products and a physical color card as the final reference.'],noteOk:'Got it',repoTitle:'Open the code nook?',repoText:'This will open the POCKET PIN GitHub repository. Little PO is holding the door, just confirm before hopping over.',repoCancel:'Stay here',repoConfirm:'Open GitHub',footer:'POCKET PIN · Version 0.1.0 · Checked 2026-08-14'});onMounted(()=>{accuracyOpen.value=true});function searchText(color){const g=GROUPS[color.group];return [color.code,color.hex,color.hex.replace('#',''),color.group,color.family,g.zh,g.en,SEARCH_ALIASES[color.group]].join(' ').toUpperCase()}const visible=computed(()=>{const raw=query.value.trim();const q=raw.toUpperCase();const pool=COLORS.filter(c=>active.value==='all'||c.group===active.value);const exact=q?pool.filter(c=>c.code===q||c.hex===q||c.hex.replace('#','')===q):[];return exact.length?exact:pool.filter(c=>!q||searchText(c).includes(q))});const grouped=computed(()=>groupKeys.map(group=>({group,label:GROUPS[group][locale.value],items:visible.value.filter(c=>c.group===group)})).filter(s=>s.items.length));function selectGroup(group){active.value=group;nextTick(()=>{if(group!=='all')document.getElementById('group-'+group)?.scrollIntoView({behavior:'smooth',block:'start'})})}function closeAccuracy(){accuracyOpen.value=false}function openRepo(){repoOpen.value=true}function confirmRepo(){repoOpen.value=false;window.open(repoUrl,'_blank','noopener,noreferrer')}return{query,active,accuracyOpen,repoOpen,locale,lang,groupKeys,visible,grouped,selectGroup,closeAccuracy,openRepo,confirmRepo,GROUPS}},template:\`<main class="app-shell"><header class="hero"><div class="hero-top"><div class="ribbon">POCKET PALETTE <span class="ribbon-number">211</span></div><div class="hero-actions"><button class="icon-link" type="button" aria-label="GitHub" @click="openRepo"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.77.4.08.55-.18.55-.4v-1.4c-2.23.49-2.7-1.1-2.7-1.1-.36-.95-.89-1.2-.89-1.2-.73-.51.06-.5.06-.5.8.06 1.23.85 1.23.85.72 1.26 1.88.9 2.34.69.07-.54.28-.9.51-1.11-1.78-.21-3.64-.91-3.64-4.05 0-.9.31-1.63.82-2.2-.08-.21-.36-1.05.08-2.18 0 0 .67-.22 2.2.84A7.45 7.45 0 0 1 8 3.93c.68 0 1.36.09 2 .28 1.52-1.06 2.19-.84 2.19-.84.44 1.13.16 1.97.08 2.18.51.57.82 1.3.82 2.2 0 3.15-1.87 3.84-3.65 4.04.29.26.54.76.54 1.53v2.26c0 .22.14.48.55.4A8.14 8.14 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"/></svg></button><div class="language-switch" :class="{'is-en':locale==='en'}" role="group" aria-label="Language"><i class="switch-thumb" aria-hidden="true"></i><button type="button" :aria-pressed="locale==='zh'" @click="locale='zh'">中</button><button type="button" :aria-pressed="locale==='en'" @click="locale='en'">EN</button></div></div></div><h1>POCKET PIN</h1><p class="subtitle">{{locale==='zh'?'随手查色，轻松拼豆。':'Find a color, make a pin.'}}</p></header><section class="toolbar" :aria-label="lang.searchRegion"><div class="search-field"><van-field v-model="query" clearable :placeholder="lang.searchPlaceholder" :aria-label="lang.searchPlaceholder" /></div><div class="series-tabs" :aria-label="lang.filter"><van-button size="small" :type="active==='all'?'primary':'default'" @click="selectGroup('all')">{{lang.all}}</van-button><van-button v-for="key in groupKeys" :key="key" size="small" :type="active===key?'primary':'default'" @click="selectGroup(key)">{{key}}</van-button></div></section><section class="content"><div class="result-bar"><span>{{lang.showing}}</span><strong>{{visible.length}} / 211 {{lang.colors}}</strong></div><div v-if="!visible.length" class="empty">{{lang.empty}}</div><section v-for="section in grouped" :id="'group-'+section.group" :key="section.group" class="group"><div class="group-title"><h2>{{section.group}} {{lang.series}}</h2><span>{{section.label}} · {{section.items.length}} {{lang.colors}}</span></div><div class="cards"><div v-for="color in section.items" :key="color.code" class="bead-card"><div class="bead-swatch" :style="{backgroundColor:color.hex}"></div><div class="bead-info"><span class="bead-code">{{color.code}}</span><div class="bead-hex">{{color.hex}}</div><div class="bead-family">{{section.label}}</div></div></div></div></section><div class="footer">{{lang.footer}}</div></section><van-popup v-model:show="accuracyOpen" :style="{background:'transparent'}" :close-on-click-overlay="false"><section class="accuracy-dialog" role="dialog" aria-modal="true" :aria-label="lang.noteTitle"><h2>{{lang.noteTitle}}</h2><ol><li v-for="item in lang.noteItems" :key="item">{{item}}</li></ol><van-button @click="closeAccuracy">{{lang.noteOk}}</van-button></section></van-popup><van-popup v-model:show="repoOpen" :style="{background:'transparent'}"><section class="repo-dialog" role="dialog" aria-modal="true" :aria-label="lang.repoTitle"><h2>{{lang.repoTitle}}</h2><p>{{lang.repoText}}</p><div class="dialog-actions"><van-button class="repo-cancel" @click="repoOpen=false">{{lang.repoCancel}}</van-button><van-button class="repo-confirm" @click="confirmRepo">{{lang.repoConfirm}}</van-button></div></section></van-popup></main>\`}).use(vant).mount('#app');
  </script>
</body>
</html>`;
}

function readme() {
  return `# POCKET PIN MARD 211 Palette

Mobile-first static palette page for the MARD 211 color-code reference.

## Files

- \`index.html\` - main GitHub Pages entry.
- \`MARD_211_移动端色板.html\` - same mobile page with a descriptive filename.
- \`build_mard_mobile_palette.js\` - rebuilds this folder from the public reference page, with local fallback.

## Rebuild

\`\`\`bash
node build_mard_mobile_palette.js
\`\`\`

Accuracy note: color codes are based on the MARD numbering system. HEX values are third-party screen display references, not official manufacturer-published digital color standards.
`;
}

async function main() {
  const colors = await loadColors();
  if (colors.length !== 211) throw new Error(`Expected 211 colors, got ${colors.length}`);

  const html = renderHtml(colors);
  fs.writeFileSync(path.join(TARGET, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(TARGET, 'MARD_211_移动端色板.html'), html, 'utf8');
  fs.writeFileSync(path.join(TARGET, 'README.md'), readme(), 'utf8');

  console.log(JSON.stringify({ target: TARGET, colors: colors.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
