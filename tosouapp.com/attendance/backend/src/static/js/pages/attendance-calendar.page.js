/**
 * 個人カレンダー登録画面 (/ui/attendance) — 1年分のカレンダー
 *
 * 表示するもの（1日ごと）:
 *   - 会社カレンダーの休日・祝日（部署ごとの休日設定を反映済み: /api/attendance/calendar）
 *   - 有給などの休暇申請（承認済・申請中: /api/leave/my）
 *   - シフト登録の内容（出勤・休み・振替: /api/attendance/shifts/monthly/:month）
 */
import { fetchJSONAuth } from '../api/http.api.js';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const HOLIDAY_TYPES = new Set(['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge']);
const LEAVE_LABELS = {
  paid: '有給', paid_half: '半休(有給)', half: '半休', unpaid: '欠勤',
  substitute: '代休', special: '特休', other: '休暇'
};

const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayJst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const get = url => fetchJSONAuth(url).catch(() => null);

async function loadYear(year) {
  const [cal, leaves, ...months] = await Promise.all([
    get(`/api/attendance/calendar?year=${year}&lang=ja`),
    get('/api/leave/my'),
    ...Array.from({ length: 12 }, (_, i) => get(`/api/attendance/shifts/monthly/${year}-${pad(i + 1)}`))
  ]);

  const off = new Set(Array.isArray(cal?.off_days) ? cal.off_days.map(String) : []);
  const holidays = {};
  for (const it of (Array.isArray(cal?.detail) ? cal.detail : [])) {
    if (!HOLIDAY_TYPES.has(String(it?.type)) || !it?.name) continue;
    holidays[String(it.date).slice(0, 10)] = it.label || it.name;
  }

  // 休暇申請: 承認済 / 申請中 のみ。期間を1日ずつに展開する
  const leave = {};
  for (const r of (Array.isArray(leaves) ? leaves : [])) {
    const st = String(r?.status || '').toLowerCase();
    if (st !== 'approved' && st !== 'pending') continue;
    const s = String(r?.startDate || '').slice(0, 10), e = String(r?.endDate || s).slice(0, 10);
    if (!s || s.slice(0, 4) > String(year) || e.slice(0, 4) < String(year)) continue;
    const label = LEAVE_LABELS[String(r?.type || '').toLowerCase()] || '休暇';
    for (let d = new Date(`${s}T00:00:00Z`); d.toISOString().slice(0, 10) <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (!leave[k] || leave[k].pending) leave[k] = { label, pending: st === 'pending' };
    }
  }

  const shift = {};
  const shiftMonthStatus = {};
  months.forEach((m, i) => {
    const data = m?.data;
    if (!data) return;
    shiftMonthStatus[i + 1] = String(data.submission_status || '');
    Object.assign(shift, data.schedule || {});
  });

  return { off, holidays, leave, shift, shiftMonthStatus };
}

// 1日の表示内容を決める（優先度: 休暇申請 > シフト > 会社カレンダー）
function dayInfo(date, dow, data) {
  const holiday = data.holidays[date] || '';
  const isOff = data.off.has(date);
  const base = { cls: isOff ? (holiday || dow === 0 ? 'is-holiday' : 'is-off') : '', tag: holiday ? '祝' : '', tip: holiday || (isOff && dow !== 0 ? '会社休日' : '') };

  const lv = data.leave[date];
  if (lv) return { ...base, cls: `${base.cls} is-leave${lv.pending ? ' is-pending' : ''}`, tag: lv.label, tip: `${lv.label}${lv.pending ? '（申請中）' : ''}${holiday ? ' / ' + holiday : ''}` };

  const sh = data.shift[date];
  const st = String(sh?.status || '').toUpperCase();
  if (st === 'LEAVE') {
    const label = LEAVE_LABELS[String(sh?.leaveType || '').toLowerCase()] || '休暇';
    return { ...base, cls: `${base.cls} is-leave`, tag: label, tip: `シフト: ${label}` };
  }
  if (st === 'FURIKAE_WORK') return { ...base, cls: `${base.cls} is-work`, tag: '振出', tip: 'シフト: 振替出勤' };
  if (st === 'FURIKAE_OFF') return { ...base, cls: `${base.cls} is-furikae`, tag: '振休', tip: 'シフト: 振替休日' };
  if (st === 'WORKING') return { ...base, cls: `${base.cls} is-work`, tag: '出勤', tip: `シフト: 出勤${holiday ? ' / ' + holiday : ''}` };
  if (st === 'OFF') return { ...base, cls: `${base.cls} is-shift-off`, tag: '休み', tip: `シフト: 休み${holiday ? ' / ' + holiday : ''}` };
  return base;
}

const MONTH_STATUS = {
  PENDING: ['承認待ち', 'is-pending'], APPROVED: ['承認済', 'is-approved'], RETURNED: ['差し戻し', 'is-returned']
};

function renderMonth(year, month, data, today) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const ms = MONTH_STATUS[String(data.shiftMonthStatus[month] || '').toUpperCase()];
  let cells = '';
  const events = [];
  for (let i = 0; i < first; i++) cells += '<div class="pc-day is-blank"></div>';
  for (let d = 1; d <= days; d++) {
    const date = ymd(year, month, d);
    const dow = (first + d - 1) % 7;
    const info = dayInfo(date, dow, data);
    const cls = ['pc-day', info.cls, dow === 0 ? 'is-sun' : '', dow === 6 ? 'is-sat' : '', date === today ? 'is-today' : ''].filter(Boolean).join(' ');
    cells += `<div class="${cls}"${info.tip ? ` title="${esc(info.tip)}"` : ''}>
      <span class="pc-num">${d}</span>${info.tag ? `<span class="pc-tag">${esc(info.tag)}</span>` : ''}
    </div>`;
    if (info.tip) events.push(`<li class="${esc(info.cls)}"><span class="pc-ev-date">${month}/${d}(${WEEK[dow]})</span><span class="pc-ev-text">${esc(info.tip)}</span></li>`);
  }
  // スマホではツールチップが見られないので、その月の予定を一覧でも出す（CSS でスマホのみ表示）
  const list = events.length
    ? `<ul class="pc-events">${events.join('')}</ul>`
    : '<div class="pc-events-empty">この月の予定はありません</div>';
  return `<section class="pc-month${year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7)) ? ' is-current' : ''}" id="pc-m${month}" data-month="${month}">
    <header class="pc-month-head">
      <span class="pc-month-name">${month}月</span>
      ${ms ? `<span class="pc-month-status ${ms[1]}">シフト${ms[0]}</span>` : ''}
    </header>
    <div class="pc-week">${WEEK.map((w, i) => `<span class="${i === 0 ? 'is-sun' : i === 6 ? 'is-sat' : ''}">${w}</span>`).join('')}</div>
    <div class="pc-days">${cells}</div>
    <div class="pc-events-wrap"><div class="pc-events-title">この月の予定</div>${list}</div>
  </section>`;
}

function initCalendar() {
  const host = document.getElementById('personalCalendar');
  if (!host) return;
  const today = todayJst();
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  let year = thisYear;
  let month = thisMonth; // スマホ表示で選択中の月
  let seq = 0;
  const isMobile = () => !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);

  host.innerHTML = `
    <div class="pc-sticky">
    <div class="pc-toolbar">
      <div class="pc-year-nav">
        <button type="button" class="pc-btn" data-act="prev" aria-label="前の年">◀</button>
        <span class="pc-year" id="pcYear"></span>
        <button type="button" class="pc-btn" data-act="next" aria-label="次の年">▶</button>
        <button type="button" class="pc-btn pc-btn-today" data-act="today">今日</button>
      </div>
      <div class="pc-actions">
        <a class="pc-link" href="/ui/shifts">シフト登録へ</a>
      </div>
    </div>
    <div class="pc-month-tabs" id="pcTabs">${Array.from({ length: 12 }, (_, i) => `<button type="button" class="pc-tab" data-month="${i + 1}">${i + 1}月</button>`).join('')}</div>
    <div class="pc-legend">
      <span><i class="lg lg-holiday"></i>祝日・日曜</span>
      <span><i class="lg lg-off"></i>会社休日</span>
      <span><i class="lg lg-work"></i>シフト出勤</span>
      <span><i class="lg lg-leave"></i>有給・休暇</span>
      <span><i class="lg lg-pending"></i>申請中</span>
      <span><i class="lg lg-today"></i>今日</span>
    </div>
    </div>
    <div class="pc-grid" id="pcGrid"></div>`;

  const grid = host.querySelector('#pcGrid');
  const yearEl = host.querySelector('#pcYear');
  const tabs = host.querySelector('#pcTabs');

  const selectMonth = (m) => {
    month = Math.min(12, Math.max(1, m));
    grid.querySelectorAll('.pc-month').forEach(el => el.classList.toggle('is-active', Number(el.dataset.month) === month));
    tabs.querySelectorAll('.pc-tab').forEach(el => {
      const on = Number(el.dataset.month) === month;
      el.classList.toggle('is-active', on);
      el.classList.toggle('is-now', year === thisYear && Number(el.dataset.month) === thisMonth);
      if (on && isMobile()) try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
    });
  };

  const draw = async (scrollToday) => {
    const my = ++seq;
    yearEl.textContent = `${year}年`;
    grid.innerHTML = '<div class="pc-loading">読み込み中…</div>';
    const data = await loadYear(year);
    if (my !== seq) return;
    grid.innerHTML = Array.from({ length: 12 }, (_, i) => renderMonth(year, i + 1, data, today)).join('');
    selectMonth(month);
    if (scrollToday && !isMobile()) {
      const cur = grid.querySelector('.pc-month.is-current');
      if (cur && cur.getBoundingClientRect().bottom > window.innerHeight) cur.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  // スマホ: 月を前後に移動（年をまたぐときは年も切り替える）
  const stepMonth = (delta) => {
    let m = month + delta;
    if (m < 1) { year -= 1; month = 12; draw(false); return; }
    if (m > 12) { year += 1; month = 1; draw(false); return; }
    selectMonth(m);
  };

  host.addEventListener('click', e => {
    const tab = e.target?.closest?.('.pc-tab');
    if (tab) { selectMonth(Number(tab.dataset.month)); return; }
    const act = e.target?.closest?.('[data-act]')?.dataset?.act;
    if (!act) return;
    if (act === 'prev') year -= 1;
    else if (act === 'next') year += 1;
    else { year = thisYear; month = thisMonth; }
    draw(act === 'today');
  });

  // スマホ: カレンダーを左右にスワイプで前月・翌月
  let sx = 0, sy = 0;
  grid.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  grid.addEventListener('touchend', e => {
    if (!isMobile()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepMonth(dx < 0 ? 1 : -1);
  }, { passive: true });

  draw(true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCalendar);
else initCalendar();
