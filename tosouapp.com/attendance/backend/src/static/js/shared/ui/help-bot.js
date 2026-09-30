/*
 * 勤怠ヘルプ チャットボット（社員画面の右下に出るキャラクター）
 * - 質問と回答はこのアプリの実際の画面・ボタン名に合わせてある
 * - 「よくある質問」(/api/faq) に登録された内容も検索対象にする
 * - 見つからないときは、その質問を管理者へ送れる（/api/faq/questions → 管理者の質問一覧に届く）
 * - 読み込み: <script src="/static/js/shared/ui/help-bot.js?v=..." defer></script>
 */
(function () {
  if (window.__helpBotLoaded) return;
  window.__helpBotLoaded = true;

  /* ========== 1. 設定 ========== */
  var CONFIG = {
    botName: '勤怠ヘルプ',
    color: '#1e40af',
    threeUrl: 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', // CSP で許可済みの CDN
    greetings: [
      { from: 5,  to: 11, text: 'おはようございます！' },
      { from: 11, to: 13, text: 'お昼ですね。お疲れさまです！' },
      { from: 13, to: 17, text: 'こんにちは！午後もよろしくお願いします。' },
      { from: 17, to: 22, text: 'お疲れさまです！' },
      { from: 22, to: 29, text: '遅くまでお疲れさまです。無理しないでくださいね。' }
    ],
    greetingsIn: [
      { from: 5,  to: 11, text: 'おはようございます！今日も一日よろしくお願いします。' },
      { from: 11, to: 17, text: '出勤ありがとうございます！今日もよろしくお願いします。' },
      { from: 17, to: 29, text: '出勤お疲れさまです！よろしくお願いします。' }
    ],
    greetingsOut: [
      { from: 5,  to: 17, text: 'お疲れさまでした！ゆっくり休んでくださいね。' },
      { from: 17, to: 22, text: 'お疲れさまでした！気をつけて帰ってくださいね。' },
      { from: 22, to: 29, text: '遅くまでお疲れさまでした！ゆっくり休んでください。' }
    ],
    fallback: '該当する回答が見つかりませんでした。\nこの質問を管理者へ送るか、お問い合わせ先をご確認ください。'
  };

  // 「○○画面を開く」ボタンの行き先（アプリの実際の URL）
  var SCREENS = {
    '勤怠入力': '/ui/attendance/simple',
    '勤怠記録': '/ui/attendance-records',
    '調整申請': '/ui/adjust?type=time_adjust',
    '残業申請': '/ui/adjust?type=overtime',
    '申請': '/ui/requests',
    '交通費申請': { href: '/ui/expenses', newTab: true },
    'シフト登録': '/ui/shifts',
    '給与明細': '/ui/salary',
    'お知らせ': '/ui/notices',
    'パスワード変更': '/ui/change-password',
    'よくある質問': '/ui/faq',
    'お問い合わせ先': '/ui/contact'
  };

  /* ========== 2. 質問と回答（アプリの画面に合わせた内容） ========== */
  var FAQ = [
    { cat: '打刻', items: [
      { q: '出勤・退勤の打刻のしかたは？',
        a: 'ホームの「勤怠入力」を開き、出勤時は「開始打刻」、退勤時は「終了打刻」を押してください。\n勤務区分（出社・在宅・現場）と作業内容を入れて「登録」を押すと保存されます。',
        k: ['出勤', '退勤', '打刻', '開始', '終了', '押し方', 'やり方', '勤怠入力'], go: '勤怠入力' },
      { q: '打刻を忘れた・時刻を間違えた',
        a: '「調整申請」から、修正対象日・正しい出勤/退勤時刻・修正理由（必須）を入力して「勤怠を修正」を押してください。\n管理者が承認すると勤怠に反映されます。「勤怠入力」画面に「打刻が未完了です」と出ている日は、そこの「調整申請」リンクからも申請できます。',
        k: ['忘れ', '押し忘れ', '未打刻', '未完了', '修正', '間違', '訂正'], go: '調整申請' },
      { q: '遅刻・早退の理由はどこに書く？',
        a: '「勤怠入力」画面の「詳細入力」を開き、遅刻・早退の欄と備考に理由を入力して「登録」を押してください。',
        k: ['遅刻', '早退', '理由', '備考', '遅れ'], go: '勤怠入力' },
      { q: '休憩時間はどうなる？',
        a: '労働時間が6時間を超えると45分、8時間を超えると60分の休憩が自動で入ります。\n実際と違う場合は「勤怠入力」画面の休憩時間を変更してから「登録」してください。',
        k: ['休憩', '昼休み', '45分', '60分'], go: '勤怠入力' },
      { q: '打刻ボタンが押せない・エラーが出る',
        a: '画面の「再読込」を押すか、アプリを一度閉じて開き直してください。\nそれでも直らない場合は、発生日時・操作内容・画面キャプチャを添えて、お問い合わせ先へご連絡ください。',
        k: ['押せない', 'エラー', 'できない', '反映', '動かない', '表示されない'], go: 'お問い合わせ先' },
      { q: '自分の勤怠記録を確認したい',
        a: 'ホームの「勤怠記録」から、日ごとの出勤・退勤時刻や実働時間を確認できます。',
        k: ['勤怠記録', '確認', '履歴', '実働', '勤務時間', '見たい'], go: '勤怠記録' }
    ]},
    { cat: '外出打刻', items: [
      { q: '外出打刻とは？いつ使う？',
        a: '勤務中に銀行・郵便局・顧客訪問などで一時的に外出するときに使う打刻です。\n出るときに「外出する」、戻ったときに「帰社」を押します。',
        k: ['外出', '外出打刻', '中抜け', '戻り', '帰社'], go: '勤怠入力' },
      { q: '外出打刻のしかたは？',
        a: '「勤怠入力」画面の「外出打刻」を押し、区分（業務 / 私用）と理由を選んで「外出する」を押してください。\n戻ったら「帰社」を押します。外出中は画面に「現在外出中」と経過時間が表示されます。\n※私用の外出は給与控除の対象になる場合があります。',
        k: ['外出', 'やり方', '帰社', '私用', '業務', '銀行', '郵便局', '病院'], go: '勤怠入力' }
    ]},
    { cat: '申請', items: [
      { q: '残業申請のしかたは？',
        a: 'ホームの「残業申請」を開き、日付・時刻・理由を入力して申請してください。管理者が承認すると反映されます。',
        k: ['残業', '時間外', '延長'], go: '残業申請' },
      { q: '有給休暇を申請したい',
        a: 'ホームの「有給休暇」（申請画面）を開き、「新規」から「年次有給休暇申請」を選んで内容を入力し「保存」してください。\nシフト登録画面で休暇の種類（有給休暇・半休など）を選ぶこともできます。',
        k: ['有給', '有休', '休暇', '休み', '年休', '半休'], go: '申請' },
      { q: '交通費の申請は？',
        a: 'ホームの「交通費申請」から申請できます（別のタブで開きます）。',
        k: ['交通費', '経費', '通勤', '電車代'], go: '交通費申請' },
      { q: '申請の結果はどこで分かる？',
        a: '承認・差戻しの結果は「お知らせ」に届きます。\n調整申請の状況は、調整申請画面の「申請履歴」で「承認待ち / 承認済み / 差戻し / 却下」を確認できます。',
        k: ['承認', '結果', '状況', '差戻し', '却下', '反映されない', 'まだ'], go: 'お知らせ' },
      { q: '差戻しされた申請を直したい',
        a: '調整申請画面に「差戻しされた申請があります」と表示されます。差戻し理由を確認して内容を修正し、「再提出する」を押してください。',
        k: ['差戻し', '差し戻し', '再提出', '再申請', '戻された'], go: '調整申請' },
      { q: '申請を取り消したい',
        a: '調整申請画面の「調整申請を取り消す」から、承認前の申請を取り消せます。承認済みのものは管理者へご相談ください。',
        k: ['取り消', 'キャンセル', '取消', 'やめたい'], go: '調整申請' }
    ]},
    { cat: 'シフト', items: [
      { q: 'シフト登録のしかたは？',
        a: 'メニューの「シフト登録」を開き、日ごとに「出勤」または「休み」（休暇の種類）を選んで提出してください。\n提出後は「承認待ち」になり、管理者が承認すると「承認済」になります。',
        k: ['シフト', '登録', '提出', '希望', 'やり方'], go: 'シフト登録' },
      { q: '提出したシフトを変更したい',
        a: '承認前であれば「シフト登録」画面から修正できます。差戻しされた場合は修正して再提出してください。\n承認済みの月は変更できないため、管理者へご連絡ください。',
        k: ['シフト', '変更', '修正', '間違', '承認済'], go: 'シフト登録' },
      { q: '休日に出勤する（振替）',
        a: '「シフト登録」画面で対象の日を開き、「振替出勤（代替休日を指定）」から代わりに休む日を選んで「振替を確定」してください。',
        k: ['振替', '代休', '休日出勤', '代替'], go: 'シフト登録' }
    ]},
    { cat: '給与明細', items: [
      { q: '給与明細はどこで見る？',
        a: 'ホームの「給与明細」から、公開済みの明細を選んで表示できます（PDF）。',
        k: ['給与', '給料', '明細', '給与明細', 'PDF'], go: '給与明細' },
      { q: '給与明細が表示されない',
        a: '会社から公開される前の明細は表示されません。公開予定日を過ぎても出ない場合は、お問い合わせ先へご連絡ください。',
        k: ['給与', '明細', '表示されない', '見れない', 'ない', '公開'], go: '給与明細' }
    ]},
    { cat: 'その他', items: [
      { q: 'パスワードを変更したい',
        a: 'メニューの「パスワード変更」から変更できます。\n8文字以上で、大文字・小文字・数字をすべて含めてください。',
        k: ['パスワード', '変更', 'PW'], go: 'パスワード変更' },
      { q: 'ログインできない・パスワードを忘れた',
        a: 'ログイン画面の「パスワードをお忘れの方はこちら」から再設定してください。メールに届いた仮パスワードでログインできます。\n分からない場合は、お問い合わせ先へご連絡ください。',
        k: ['ログイン', 'パスワード', '忘れ', 'ID', '入れない'] },
      { q: 'お知らせはどこで見る？',
        a: 'メニューの「お知らせ」から、会社からの連絡や申請結果を確認できます。',
        k: ['お知らせ', '連絡', '通知'], go: 'お知らせ' },
      { q: '問い合わせ先を知りたい',
        a: '「お問い合わせ先」に担当窓口と受付時間が載っています。',
        k: ['問い合わせ', '連絡先', '電話', '担当', '窓口'], go: 'お問い合わせ先' }
    ]}
  ];

  /* ========== 3. アプリとの連携 ========== */
  function readUser() {
    try { return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}') || {}; } catch (e) { return {}; }
  }
  var user = readUser();
  var userName = String(user.username || '').trim();

  function navigate(name) {
    var s = SCREENS[name]; if (!s) return;
    if (typeof s === 'object') { window.open(s.href, '_blank'); return; }
    location.href = s;
  }

  // 今日の打刻状態（'in' / 'out' / null）を取得
  var botStatus = null;
  function hasCheckOut(v, depth) {
    if (!v || typeof v !== 'object' || depth > 5) return false;
    for (var key in v) {
      if (!Object.prototype.hasOwnProperty.call(v, key)) continue;
      if ((key === 'checkOut' || key === 'check_out') && v[key]) return true;
      if (hasCheckOut(v[key], depth + 1)) return true;
    }
    return false;
  }
  function loadStatus() {
    try {
      fetch('/api/attendance/status', { credentials: 'include', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          var st = d.open ? 'in' : (hasCheckOut(d.timesheet, 0) ? 'out' : null);
          if (st !== botStatus) { botStatus = st; refreshTip(); }
        })
        .catch(function () {});
    } catch (e) {}
  }

  // 管理者が「よくある質問」に登録した内容も検索対象に入れる
  var faqLoaded = false;
  function loadCompanyFaq() {
    if (faqLoaded) return; faqLoaded = true;
    try {
      fetch('/api/faq', { credentials: 'include', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var rows = (d && d.data) || [];
          if (!rows.length) return;
          var items = rows.filter(function (x) { return x && x.question && x.answer; }).map(function (x) {
            return { q: String(x.question), a: String(x.answer), k: [], go: null };
          });
          if (items.length) FAQ.push({ cat: 'よくある質問', items: items });
        })
        .catch(function () {});
    } catch (e) {}
  }

  // 解決しない質問を管理者へ送る（よくある質問画面の「質問する」と同じ API）
  function sendQuestion(text) {
    return import('/static/js/api/http.api.js').then(function (m) {
      return m.fetchJSONAuth('/api/faq/questions', {
        method: 'POST',
        body: JSON.stringify({ question: text.slice(0, 500), category: 'チャットボット' })
      });
    });
  }

  /* ========== 4. 見た目 ========== */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = CONFIG.color;
  function mixHex(a, b, t) {
    function p(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var x = p(a), y = p(b);
    return '#' + x.map(function (v, i) { var n = Math.round(v + (y[i] - v) * t); return (n < 16 ? '0' : '') + n.toString(16); }).join('');
  }
  var FUR = mixHex(C, '#ffffff', 0.42), FUR_L = mixHex(FUR, '#ffffff', 0.4), FUR_D = mixHex(FUR, '#0b2a55', 0.3),
      PATCH = mixHex(C, '#000000', 0.08), PATCH_L = mixHex(PATCH, '#ffffff', 0.25), OUT = mixHex(FUR, '#0b2a55', 0.55);

  // 画面下に固定のボタンバー（勤怠入力画面など）があれば、その上に出す
  function bottomOffset() {
    var h = 0;
    try {
      document.querySelectorAll('.simple-bottom').forEach(function (b) {
        if (b.offsetParent !== null || getComputedStyle(b).position === 'fixed') {
          if (getComputedStyle(b).display !== 'none') h = Math.max(h, b.getBoundingClientRect().height);
        }
      });
    } catch (e) {}
    return h ? Math.round(h + 8) : 12;
  }

  var FONT = 'system-ui,-apple-system,"Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
  var css = '' +
  ':root{--igb-off:12px}' +
  '.igb-wrap{position:fixed;right:10px;bottom:calc(var(--igb-off) + env(safe-area-inset-bottom,0px));width:96px;height:124px;z-index:2147483000}' +
  '.igb-fab{position:relative;width:100%;height:100%;border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;-webkit-tap-highlight-color:transparent}' +
  '.igb-dis{position:absolute;top:0;right:-4px;width:24px;height:24px;border:0;border-radius:50%;background:rgba(28,39,51,.55);color:#fff;font-size:15px;line-height:24px;padding:0;cursor:pointer}' +
  '.igb-mascot{display:block;transform-origin:50% 100%;filter:drop-shadow(0 3px 4px rgba(15,40,60,.25))}' +
  '.igb-shadow{width:44px;height:7px;margin-top:2px;border-radius:50%;background:rgba(15,40,60,.22)}' +
  '.igb-eye{transform-box:fill-box;transform-origin:center;animation:igb-blink 4s infinite}' +
  '@keyframes igb-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
  '.igb-drop{animation:igb-bob 2.4s ease-in-out infinite}' +
  '.igb-shadow.igb-s2{animation:igb-sh2 2.4s ease-in-out infinite}' +
  '@keyframes igb-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-11px) rotate(2deg)}}' +
  '@keyframes igb-sh2{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.55}}' +
  '.igb-sp{transform-box:fill-box;transform-origin:center;animation:igb-tw 2.4s ease-in-out infinite}' +
  '.igb-sp2{animation-delay:1.2s}' +
  '@keyframes igb-tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}' +
  '.igb-paw{transform-box:fill-box;transform-origin:0% 100%;animation:igb-paw 1.4s ease-in-out infinite}' +
  '@keyframes igb-paw{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(16deg)}}' +
  '.igb-fab.igb-on .igb-mascot,.igb-fab.igb-on .igb-shadow,.igb-fab.igb-on .igb-paw{animation:none}.igb-fab.igb-on .igb-sp{display:none}' +
  '.igb-tip{position:fixed;right:12px;bottom:calc(var(--igb-off) + 128px + env(safe-area-inset-bottom,0px));max-width:190px;background:#fff;color:#1c2733;border-radius:12px;padding:9px 12px;font:600 13px/1.5 ' + FONT + ';white-space:pre-line;box-shadow:0 4px 16px rgba(15,40,60,.22);z-index:2147483000;opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .3s,transform .3s;cursor:pointer}' +
  '.igb-tip::after{content:"";position:absolute;right:40px;bottom:-6px;width:12px;height:12px;background:#fff;transform:rotate(45deg)}' +
  '.igb-tip.igb-show{opacity:1;transform:none;pointer-events:auto;animation:igb-tipbob 2.6s ease-in-out infinite}' +
  '@keyframes igb-tipbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
  '.igb-fab:focus-visible,.igb-dis:focus-visible,.igb-chip:focus-visible,.igb-x:focus-visible,.igb-send:focus-visible{outline:3px solid #f2b705;outline-offset:2px}' +
  '.igb-panel{position:fixed;right:12px;bottom:calc(var(--igb-off) + 128px + env(safe-area-inset-bottom,0px));width:min(360px,calc(100vw - 24px));height:min(540px,calc(100dvh - var(--igb-off) - 170px));min-height:320px;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(15,40,60,.28);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;font-family:' + FONT + ';color:#1c2733}' +
  '.igb-panel.igb-open{display:flex}' +
  '.igb-h{background:' + C + ';color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:700}' +
  '.igb-x{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:2px 6px}' +
  '.igb-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f4f6f8}' +
  '.igb-m{max-width:86%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.65;white-space:pre-wrap;word-break:break-word}' +
  '.igb-bot{background:#fff;border:1px solid #dde3e8;align-self:flex-start;border-bottom-left-radius:4px}' +
  '.igb-user{background:' + C + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
  '.igb-typing{display:flex;gap:4px;padding:12px}' +
  '.igb-typing i{width:6px;height:6px;border-radius:50%;background:#9aa7b2;animation:igb-b 1s infinite}' +
  '.igb-typing i:nth-child(2){animation-delay:.15s}.igb-typing i:nth-child(3){animation-delay:.3s}' +
  '@keyframes igb-b{0%,60%,100%{opacity:.3}30%{opacity:1}}' +
  '.igb-ch{display:flex;flex-direction:column;align-items:flex-start;gap:7px}' +
  '.igb-chip{background:#fff;color:' + C + ';border:1.5px solid ' + C + ';border-radius:18px;padding:8px 14px;font-size:14px;text-align:left;cursor:pointer;font-family:inherit}' +
  '.igb-chip:active{background:#e6edf8}' +
  '.igb-alt{border-color:#b6c0c9;color:#4a5763}' +
  '.igb-f{display:flex;gap:8px;padding:10px;border-top:1px solid #dde3e8;background:#fff}' +
  '.igb-in{flex:1;min-width:0;border:1px solid #b6c0c9;border-radius:8px;padding:9px 10px;font-size:16px;font-family:inherit}' +
  '.igb-send{border:0;background:' + C + ';color:#fff;border-radius:8px;padding:0 14px;font-size:14px;cursor:pointer;font-family:inherit}' +
  '@media print{.igb-wrap,.igb-tip,.igb-panel{display:none!important}}' +
  '@media (prefers-reduced-motion:reduce){.igb-typing i,.igb-eye,.igb-drop,.igb-shadow.igb-s2,.igb-paw{animation:none}.igb-typing i{opacity:.6}.igb-tip{transition:none}.igb-tip.igb-show{animation:none}.igb-sp{display:none}}';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var CAT =
    '<svg class="igb-mascot igb-drop" width="84" height="88" viewBox="0 0 100 104" style="overflow:visible" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="igbf" cx="0.35" cy="0.28" r="0.9"><stop offset="0" stop-color="' + FUR_L + '"/><stop offset=".55" stop-color="' + FUR + '"/><stop offset="1" stop-color="' + FUR_D + '"/></radialGradient>' +
        '<radialGradient id="igbo" cx="0.3" cy="0.25" r="0.9"><stop offset="0" stop-color="' + PATCH_L + '"/><stop offset="1" stop-color="' + PATCH + '"/></radialGradient>' +
        '<linearGradient id="igbc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7d86"/><stop offset="1" stop-color="#c1272d"/></linearGradient>' +
        '<radialGradient id="igbb" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff6b8"/><stop offset="1" stop-color="#e0a300"/></radialGradient>' +
        '<radialGradient id="igbk" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff8fa3" stop-opacity=".85"/><stop offset="1" stop-color="#ff8fa3" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="igbe" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#7a5341"/><stop offset="1" stop-color="#22140e"/></radialGradient>' +
        '<clipPath id="igbh"><ellipse cx="50" cy="50" rx="36" ry="30"/></clipPath>' +
      '</defs>' +
      '<g stroke="' + OUT + '" stroke-width="2.2" stroke-linejoin="round" fill="url(#igbf)">' +
        '<path d="M17 42L19 13Q20 9 24 11L45 25z"/><path d="M83 42L81 13Q80 9 76 11L55 25z"/>' +
      '</g>' +
      '<path d="M23 34L24 19L37 27z" fill="#ffb3c1"/><path d="M77 34L76 19L63 27z" fill="#ffb3c1"/>' +
      '<ellipse cx="50" cy="84" rx="24" ry="18" fill="url(#igbf)" stroke="' + OUT + '" stroke-width="2.2"/>' +
      '<ellipse cx="50" cy="80" rx="27" ry="6" fill="#7a5a44" opacity=".14"/>' +
      '<ellipse cx="50" cy="50" rx="36" ry="30" fill="url(#igbf)"/>' +
      '<ellipse cx="72" cy="30" rx="17" ry="12" transform="rotate(20 72 30)" fill="url(#igbo)" clip-path="url(#igbh)"/>' +
      '<ellipse cx="50" cy="50" rx="36" ry="30" fill="none" stroke="' + OUT + '" stroke-width="2.2"/>' +
      '<ellipse cx="34" cy="31" rx="12" ry="4.5" transform="rotate(-25 34 31)" fill="#fff" opacity=".75"/>' +
      '<g class="igb-eye"><ellipse cx="36" cy="52" rx="4.8" ry="5.8" fill="url(#igbe)"/><circle cx="37.8" cy="49.8" r="1.9" fill="#fff"/><circle cx="34.6" cy="54.6" r=".9" fill="#fff" opacity=".8"/></g>' +
      '<g class="igb-eye"><ellipse cx="64" cy="52" rx="4.8" ry="5.8" fill="url(#igbe)"/><circle cx="65.8" cy="49.8" r="1.9" fill="#fff"/><circle cx="62.6" cy="54.6" r=".9" fill="#fff" opacity=".8"/></g>' +
      '<ellipse cx="26" cy="62" rx="6.5" ry="4.2" fill="url(#igbk)"/><ellipse cx="74" cy="62" rx="6.5" ry="4.2" fill="url(#igbk)"/>' +
      '<ellipse cx="50" cy="61" rx="11" ry="8" fill="#fff3e0" opacity=".9"/>' +
      '<path d="M47.5 59h5l-2.5 3.2z" fill="#ff8fa3"/><circle cx="49" cy="59.9" r=".7" fill="#fff" opacity=".8"/>' +
      '<path d="M50 62.2q-3 4-7 2M50 62.2q3 4 7 2" stroke="#7a5341" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M31 79Q50 91 69 79" stroke="url(#igbc)" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="50" cy="90" r="4.8" fill="url(#igbb)" stroke="' + OUT + '" stroke-width="1.6"/><circle cx="48.6" cy="88.4" r="1.3" fill="#fff" opacity=".85"/><path d="M47 91h6" stroke="#8a6a1a" stroke-width="1.2"/>' +
      '<g stroke="' + OUT + '" stroke-width="2.2" fill="url(#igbf)"><ellipse cx="38" cy="100" rx="9" ry="4.5"/><ellipse cx="62" cy="100" rx="9" ry="4.5"/></g>' +
      '<g class="igb-paw">' +
        '<path d="M69 87L89 60" stroke="' + OUT + '" stroke-width="13" stroke-linecap="round" fill="none"/>' +
        '<path d="M69 87L89 60" stroke="' + FUR + '" stroke-width="9.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="90" cy="57" r="8.6" fill="url(#igbf)" stroke="' + OUT + '" stroke-width="2.2"/>' +
        '<ellipse cx="90" cy="60" rx="3.6" ry="3" fill="#ff9fb0"/><circle cx="85.6" cy="55.4" r="1.7" fill="#ff9fb0"/><circle cx="90" cy="53.6" r="1.7" fill="#ff9fb0"/><circle cx="94.4" cy="55.4" r="1.7" fill="#ff9fb0"/>' +
      '</g>' +
      '<path class="igb-sp" d="M88 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd54a"/>' +
      '<path class="igb-sp igb-sp2" d="M46 4l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#ffd54a"/>' +
    '</svg><span class="igb-shadow igb-s2"></span>';

  /* ========== 5. 本体 ========== */
  var HIDDEN_KEY = 'igb-hidden';
  function boot() {
    try { if (localStorage.getItem(HIDDEN_KEY) === '1') return; } catch (e) {}   // ×で消した人には出さない
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    function applyOffset() { document.documentElement.style.setProperty('--igb-off', bottomOffset() + 'px'); }
    applyOffset();
    window.addEventListener('resize', applyOffset);
    setTimeout(applyOffset, 1500);

    var fab = el('button', 'igb-fab'); fab.type = 'button';
    fab.setAttribute('aria-label', 'ヘルプを開く'); fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = CAT;

    var panel = el('div', 'igb-panel');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', CONFIG.botName);
    var head = el('div', 'igb-h');
    head.appendChild(el('span', '', CONFIG.botName));
    var closeBtn = el('button', 'igb-x', '×'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', '閉じる');
    head.appendChild(closeBtn);
    var log = el('div', 'igb-log'); log.setAttribute('aria-live', 'polite');
    var form = el('div', 'igb-f');
    var input = el('input', 'igb-in'); input.type = 'text'; input.placeholder = '知りたいことを入力（例: 打刻 忘れ）'; input.setAttribute('aria-label', '質問を入力');
    var send = el('button', 'igb-send', '送信'); send.type = 'button';
    form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
    var wrap = el('div', 'igb-wrap'); wrap.appendChild(fab);
    var dis = el('button', 'igb-dis', '×'); dis.type = 'button'; dis.setAttribute('aria-label', 'ヘルプを隠す'); wrap.appendChild(dis);
    var tip = el('div', 'igb-tip', '');
    document.body.appendChild(wrap); document.body.appendChild(panel); document.body.appendChild(tip);

    function pickGreet(list, h) {
      var t = '';
      (list || []).forEach(function (g) { if (h >= g.from && h < g.to) t = g.text; });
      return t;
    }
    function greeting() {
      var h = new Date().getHours(); if (h < 5) h += 24;
      var list = botStatus === 'in' ? CONFIG.greetingsIn : (botStatus === 'out' ? CONFIG.greetingsOut : CONFIG.greetings);
      var t = pickGreet(list, h) || pickGreet(CONFIG.greetings, h) || 'こんにちは！';
      return (userName ? userName + 'さん、' : '') + t;
    }

    var hidden = false;


    function hideTip() { tip.classList.remove('igb-show'); }
    function showTip() {
      if (panel.classList.contains('igb-open') || hidden) return;
      tip.textContent = greeting();
      tip.classList.add('igb-show');
    }
    refreshTip = function () { if (tip.classList.contains('igb-show')) tip.textContent = greeting(); };
    setTimeout(showTip, 800);
    setTimeout(hideTip, 10800);   // あいさつは10秒で引っ込める（画面の邪魔にならないように）
    setInterval(refreshTip, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loadStatus(); });
    tip.addEventListener('click', function () { open(); });
    // 打刻した直後に画面側から呼べる:  kintaiBot.setStatus('in' / 'out')
    window.kintaiBot = { setStatus: function (s) { botStatus = s; refreshTip(); } };

    var choices = null, started = false, lastUnanswered = '';

    function toEnd() { log.scrollTop = log.scrollHeight; }
    function clearChoices() { if (choices) { choices.remove(); choices = null; } }
    function say(text, who) { log.appendChild(el('div', 'igb-m igb-' + who, text)); toEnd(); }
    function botSay(text, then) {
      clearChoices();
      var t = el('div', 'igb-m igb-bot igb-typing'); t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t); toEnd();
      setTimeout(function () { t.remove(); say(text, 'bot'); if (then) then(); }, reduce ? 0 : 450);
    }
    function showChoices(list) {
      clearChoices();
      choices = el('div', 'igb-ch');
      list.forEach(function (o) {
        var b = el('button', 'igb-chip' + (o.alt ? ' igb-alt' : ''), o.label);
        b.type = 'button'; b.onclick = o.fn; choices.appendChild(b);
      });
      log.appendChild(choices); toEnd();
    }
    function pick(label, fn) { clearChoices(); say(label, 'user'); fn(); }
    function backToMenu() { return { label: '← 項目にもどる', alt: true, fn: function () { pick('項目にもどる', function () { menu('項目を選んでください。'); }); } }; }

    function menu(msg) {
      botSay(msg, function () {
        showChoices(FAQ.map(function (c) {
          return { label: c.cat, fn: function () { pick(c.cat, function () { showCat(c); }); } };
        }));
      });
    }
    function showCat(c) {
      botSay(c.cat + 'について、知りたいものを選んでください。', function () {
        var list = c.items.map(function (it) {
          return { label: it.q, fn: function () { pick(it.q, function () { answer(it); }); } };
        });
        list.push(backToMenu());
        showChoices(list);
      });
    }
    function answer(it) {
      botSay(it.a, function () {
        var list = [];
        if (it.go && SCREENS[it.go]) list.push({ label: '「' + it.go + '」画面を開く', fn: function () { navigate(it.go); } });
        list.push({ label: '他の質問を見る', fn: function () { pick('他の質問を見る', function () { menu('ほかに知りたいことはありますか？'); }); } });
        list.push({ label: '解決しなかった', alt: true, fn: function () { pick('解決しなかった', function () { contact(); }); } });
        showChoices(list);
      });
    }
    function contact(msg) {
      botSay(msg || '解決しない場合は、管理者へ質問を送るか、お問い合わせ先から担当者へご連絡ください。', function () {
        var list = [];
        if (lastUnanswered.length >= 5) {
          list.push({ label: 'この質問を管理者へ送る', fn: function () { pick('この質問を管理者へ送る', askAdmin); } });
        } else {
          list.push({ label: '管理者へ質問する', fn: function () { navigate('よくある質問'); } });
        }
        list.push({ label: 'お問い合わせ先を見る', fn: function () { navigate('お問い合わせ先'); } });
        list.push(backToMenu());
        showChoices(list);
      });
    }
    function askAdmin() {
      var text = lastUnanswered;
      botSay('送信しています…', function () {
        sendQuestion(text).then(function () {
          lastUnanswered = '';
          botSay('管理者へ送りました。回答は「よくある質問」画面の「あなたの質問」で確認できます。', function () {
            showChoices([
              { label: '「よくある質問」画面を開く', fn: function () { navigate('よくある質問'); } },
              backToMenu()
            ]);
          });
        }).catch(function (e) {
          botSay('送信できませんでした。' + (e && e.message ? '（' + e.message + '）' : '') + '\nお問い合わせ先へご連絡ください。', function () {
            showChoices([{ label: 'お問い合わせ先を見る', fn: function () { navigate('お問い合わせ先'); } }, backToMenu()]);
          });
        });
      });
    }

    // 自由入力：キーワードと文字の一致で一番近い質問を探す
    function norm(s) { return (s.normalize ? s.normalize('NFKC') : s).toLowerCase().replace(/\s+/g, ''); }
    function bigrams(s) { var r = []; for (var i = 0; i < s.length - 1; i++) r.push(s.substr(i, 2)); return r; }
    function search(text) {
      var t = norm(text), tb = bigrams(t), best = null, top = 0;
      FAQ.forEach(function (c) { c.items.forEach(function (it) {
        var score = 0, q = norm(it.q);
        (it.k || []).forEach(function (w) { if (t.indexOf(norm(w)) > -1) score += 3; });
        tb.forEach(function (g) { if (q.indexOf(g) > -1) score += 1; });
        if (score > top) { top = score; best = it; }
      }); });
      return top >= 3 ? best : null;
    }
    function submit() {
      var text = input.value.trim(); if (!text) return;
      input.value = ''; clearChoices(); say(text, 'user');
      var hit = search(text);
      if (hit) { answer(hit); return; }
      lastUnanswered = text;
      contact(CONFIG.fallback);
    }

    function open() {
      panel.classList.add('igb-open'); fab.setAttribute('aria-expanded', 'true'); fab.classList.add('igb-on'); hideTip();
      loadCompanyFaq();
      if (!started) { started = true; menu(greeting() + '\n勤怠アプリの使い方について、知りたい項目を選んでください。'); }
      setTimeout(function () { input.focus(); }, 50);
    }
    function close() {
      panel.classList.remove('igb-open'); fab.classList.remove('igb-on'); fab.setAttribute('aria-expanded', 'false'); fab.focus();
      if (mascot3d) mascot3d.wake();
    }

    // ×で完全に消す。次にログインするまで（ログイン画面で HIDDEN_KEY を消す）どの画面にも出さない
    dis.addEventListener('click', function () {
      hidden = true;
      try { localStorage.setItem(HIDDEN_KEY, '1'); } catch (e) {}
      [wrap, panel, tip].forEach(function (n) { n.remove(); });
    });

    fab.addEventListener('click', function () {
      if (mascot3d && mascot3d.wasDragged()) return;
      panel.classList.contains('igb-open') ? close() : open();
    });
    closeBtn.addEventListener('click', close);
    send.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) submit(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('igb-open')) close(); });

    /* ----- 3Dの猫（three.js）。使えない端末は2Dの猫のまま ----- */
    var mascot3d = null;
    function make3D(T) {
      var W = 96, H = 110;
      var renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H);
      var cv = renderer.domElement;
      cv.style.cssText = 'display:block;width:' + W + 'px;height:' + H + 'px;touch-action:none;cursor:grab;filter:drop-shadow(0 4px 5px rgba(15,40,60,.22))';
      var scene = new T.Scene();
      var cam = new T.PerspectiveCamera(32, W / H, 0.1, 60);
      cam.position.set(0, 1.3, 9.8); cam.lookAt(0, 1.0, 0);
      scene.add(new T.HemisphereLight(0xffffff, 0xb89c86, 0.7));
      var key = new T.DirectionalLight(0xffffff, 0.75); key.position.set(3, 5, 6); scene.add(key);
      var rim = new T.DirectionalLight(0xbfe6ff, 0.35); rim.position.set(-4, 2, -5); scene.add(rim);

      function hex(c) { return parseInt(String(c).replace('#', ''), 16); }
      function mat(c, r, m) { return new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0 }); }
      var fur = mat(hex(FUR), 0.7), orange = mat(hex(PATCH), 0.7), cream = mat(0xfff3e0, 0.7), pink = mat(0xffb3c1, 0.8), padPink = mat(0xff9fb0, 0.8),
          dark = mat(0x22140e, 0.25), white = mat(0xffffff, 0.3), brown = mat(0x7a5341, 0.6), red = mat(0xd7333a, 0.45), gold = mat(0xf2c230, 0.3, 0.6),
          blush = new T.MeshStandardMaterial({ color: 0xff9fb0, roughness: 0.9, transparent: true, opacity: 0.75 });
      function S(r) { return new T.SphereGeometry(r, 32, 24); }
      function M(g, m, x, y, z, sx, sy, sz) {
        var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0);
        if (sx) o.scale.set(sx, sy, sz); return o;
      }
      var root = new T.Group(), hero = new T.Group(); root.add(hero); scene.add(root);

      hero.add(M(S(1), fur, 0, -0.05, 0, 0.95, 1.05, 0.9));
      hero.add(M(S(1), fur, 0, 1.5, 0, 1.15, 0.95, 1));
      hero.add(M(S(1), cream, 0, 1.2, 0.68, 0.36, 0.24, 0.3));
      hero.add(M(S(1), cream, 0, -0.1, 0.42, 0.6, 0.75, 0.5));
      var patch = new T.Mesh(new T.SphereGeometry(1.012, 32, 20, Math.PI * 0.5, Math.PI * 0.65, 0.2, 0.85), orange);
      patch.position.set(0, 1.5, 0); patch.scale.set(1.15, 0.95, 1); hero.add(patch);
      [-1, 1].forEach(function (d) {
        var ear = M(new T.ConeGeometry(0.42, 0.78, 24), fur, d * 0.8, 2.36, 0); ear.rotation.z = -d * 0.38; hero.add(ear);
        var inn = M(new T.ConeGeometry(0.27, 0.55, 24), pink, d * 0.8, 2.3, 0.12); inn.rotation.z = -d * 0.38; hero.add(inn);
      });
      var eyes = [];
      [-1, 1].forEach(function (d) {
        var g = new T.Group(); g.position.set(d * 0.42, 1.55, 0.9);
        g.add(M(S(0.14), dark, 0, 0, 0, 1, 1.3, 0.55));
        g.add(M(S(0.05), white, 0.045, 0.07, 0.07));
        g.add(M(S(0.025), white, -0.04, -0.06, 0.07));
        eyes.push(g); hero.add(g);
        var mo = new T.Mesh(new T.TorusGeometry(0.08, 0.016, 8, 20, Math.PI), brown);
        mo.position.set(d * 0.08, 1.18, 1.0); mo.rotation.z = Math.PI; hero.add(mo);
        var ck = M(S(0.17), blush, d * 0.7, 1.2, 0.72, 1, 0.65, 0.35); ck.rotation.y = d * 0.7; hero.add(ck);
        hero.add(M(S(0.3), fur, d * 0.42, -0.98, 0.5, 1, 0.6, 1.25));
      });
      hero.add(M(S(0.075), padPink, 0, 1.3, 1.02, 1.25, 0.8, 0.8));
      var collar = new T.Mesh(new T.TorusGeometry(0.68, 0.09, 12, 40), red);
      collar.position.set(0, 0.64, 0); collar.rotation.x = Math.PI / 2; hero.add(collar);
      hero.add(M(S(0.16), gold, 0, 0.5, 0.68));
      [[0, -0.55, -0.85, 0.22], [0, -0.4, -1.05, 0.2], [0, -0.15, -1.17, 0.18], [0, 0.1, -1.15, 0.16]].forEach(function (p) {
        hero.add(M(S(p[3]), fur, p[0], p[1], p[2]));
      });
      hero.add(M(S(0.25), fur, -0.5, -0.3, 0.72, 1, 0.9, 0.9));
      var arm = new T.Group(); arm.position.set(0.7, 0.45, 0.25); arm.rotation.z = -0.55; hero.add(arm);
      arm.add(M(new T.CylinderGeometry(0.19, 0.21, 0.95, 20), fur, 0, 0.475, 0));
      arm.add(M(S(0.3), fur, 0, 1.02, 0, 1, 1.05, 0.92));
      arm.add(M(S(0.13), padPink, 0, 0.98, 0.25, 1.1, 0.9, 0.35));
      [[-0.13, 1.17], [0, 1.22], [0.13, 1.17]].forEach(function (p) { arm.add(M(S(0.06), padPink, p[0], p[1], 0.24, 1, 1, 0.7)); });

      var shadow = document.createElement('span');
      shadow.className = 'igb-shadow';

      var ry = 0, vel = 0, drag = false, dragged = false, sx = 0, lx = 0, animating = false, t0 = performance.now();
      function frame(now) {
        animating = false;
        var idle = document.hidden || hidden || panel.classList.contains('igb-open');
        if (idle && !drag && Math.abs(vel) < 0.002) { renderer.render(scene, cam); return; }
        var t = (now - t0) / 1000, k = reduce ? 0 : 1;
        var a = ((ry + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        if (!drag) { ry += vel; vel *= 0.92; if (!idle) ry += (Math.sin(t * 0.7) * 0.5 * k - a) * 0.035; }
        root.rotation.y = ry;
        var b = Math.sin(t * 2.6);
        hero.position.y = b * 0.12 * k; hero.rotation.z = Math.sin(t * 1.3) * 0.03 * k;
        arm.rotation.z = -0.55 + Math.sin(t * 5.2) * 0.3 * k;
        var bl = (t % 3.6) > 3.5 ? 0.1 : 1; eyes.forEach(function (g) { g.scale.y = bl; });
        shadow.style.transform = 'scale(' + (1 - (b * k + 1) * 0.14).toFixed(3) + ')';
        renderer.render(scene, cam);
        animating = true; requestAnimationFrame(frame);
      }
      function wake() { if (!animating) { animating = true; requestAnimationFrame(frame); } }
      cv.addEventListener('pointerdown', function (e) {
        drag = true; dragged = false; sx = lx = e.clientX; vel = 0;
        try { cv.setPointerCapture(e.pointerId); } catch (x) {}
        cv.style.cursor = 'grabbing'; wake();
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - lx; lx = e.clientX;
        if (Math.abs(e.clientX - sx) > 5) dragged = true;
        ry += dx * 0.025; vel = dx * 0.025;
      });
      function up() { drag = false; cv.style.cursor = 'grab'; }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      return { canvas: cv, shadow: shadow, wake: wake, wasDragged: function () { return dragged; } };
    }
    function upgrade3D() {
      function go() {
        var m;
        try { m = make3D(window.THREE); } catch (e) { return; }
        mascot3d = m; fab.innerHTML = ''; fab.appendChild(m.canvas); fab.appendChild(m.shadow); m.wake();
      }
      if (window.THREE) { go(); return; }
      var sc = document.createElement('script');
      sc.src = CONFIG.threeUrl; sc.async = true; sc.onload = go; document.head.appendChild(sc);
      document.addEventListener('visibilitychange', function () { if (mascot3d) mascot3d.wake(); });
    }
    upgrade3D();
    loadStatus();
  }

  var refreshTip = function () {};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
