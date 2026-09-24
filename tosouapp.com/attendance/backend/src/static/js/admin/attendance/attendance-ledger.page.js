import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';
import { listDepartments } from '../../api/departments.api.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function hm(min) {
  const n = Math.round(Number(min) || 0);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

const KUBUN_LABEL = {
  '通常': '通常', '休日': '休日', '法定休日': '休日', '休日出勤': '休日出勤',
  '法定休日出勤': '休日出勤', '代替出勤': '休日出勤', '有給休暇': '有給',
  '半休': '半休', '半休(有給)': '半休', '欠勤': '欠勤', '振替出勤': '振替出勤'
};

export async function mount({ content } = {}) {
  const root = content || document.querySelector('#adminContent');
  if (!root) return () => {};

  let month = currentMonth();
  let departmentId = '';
  let departments = [];
  let page = 1;
  const pageSize = 100; // 200人規模で1ヶ月分だと最大6000行程度になるため、一覧はページングする

  async function loadClosureBanner() {
    const box = root.querySelector('#ledgerClosureBanner');
    if (!box) return;
    box.innerHTML = '読み込み中...';
    try {
      const summary = await fetchJSONAuth(`/api/attendance/month/closure-summary?month=${encodeURIComponent(month)}`);
      if (summary.closed) {
        box.style.background = '#eef2f8';
        box.style.borderColor = '#0b2c66';
        box.innerHTML = `<b style="color:#0b2c66;">締め済み</b> — ${escapeHtml(month)}分は全員（${summary.total}名）承認済みです`;
      } else {
        box.style.background = '#f0fdf4';
        box.style.borderColor = '#16a34a';
        box.innerHTML = `
          <b style="color:#166534;">未締め</b> — ${escapeHtml(month)}分は入力・修正ができます（承認済み ${summary.approved}/${summary.total}名）
          <button type="button" id="ledgerCloseBtn" style="margin-left:12px;height:28px;padding:0 12px;background:#0b2c66;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">月次締めを実行</button>
        `;
        root.querySelector('#ledgerCloseBtn')?.addEventListener('click', onCloseMonth);
      }
    } catch (err) {
      box.style.background = '#fef2f2';
      box.style.borderColor = '#dc2626';
      box.textContent = `締め状況の取得に失敗しました: ${err.message}`;
    }
  }

  async function onCloseMonth() {
    if (!confirm(`${month}分を全社員まとめて承認します。入力が未完了の人はスキップされます。よろしいですか？`)) return;
    const resultBox = root.querySelector('#ledgerCloseResult');
    try {
      const result = await fetchJSONAuth('/api/attendance/month/approve-ready', {
        method: 'POST',
        body: JSON.stringify({ month })
      });
      const skippedList = (result.results || []).filter(r => !r.ok);
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="position:relative;border:1px solid #cbd5e1;border-radius:8px;padding:12px 16px;margin-bottom:16px;background:#fff;">
            <button type="button" id="ledgerCloseResultBtn" title="閉じる" style="position:absolute;top:8px;right:8px;width:24px;height:24px;border:none;background:transparent;color:#94a3b8;font-size:16px;line-height:1;cursor:pointer;">×</button>
            <div style="font-weight:700;margin-bottom:6px;padding-right:24px;">${escapeHtml(month)}分 月次締め結果 — 承認 ${result.approved}名 / スキップ ${result.skipped}名</div>
            ${skippedList.length ? `
              <div style="font-size:12px;color:#b45309;margin-bottom:6px;">入力未完了でスキップされた人（対応が必要です）:</div>
              <ul style="margin:0;padding-left:18px;font-size:13px;">
                ${skippedList.map(s => {
                  const label = (s.username || s.employeeCode)
                    ? `${escapeHtml(s.username || '')}${s.employeeCode ? `（${escapeHtml(s.employeeCode)}）` : ''}`
                    : `ID:${escapeHtml(s.userId)}`;
                  return `<li>${label} — ${(s.missing || []).length}日分不足</li>`;
                }).join('')}
              </ul>
            ` : '<div style="font-size:13px;color:#166534;">全員分、正常に締められました。</div>'}
          </div>
        `;
        root.querySelector('#ledgerCloseResultBtn')?.addEventListener('click', () => {
          resultBox.style.display = 'none';
          resultBox.innerHTML = '';
        });
      }
      await loadClosureBanner();
      await loadLedger();
    } catch (err) {
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="position:relative;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#991b1b;">
            <button type="button" id="ledgerCloseResultBtn" title="閉じる" style="position:absolute;top:8px;right:8px;width:24px;height:24px;border:none;background:transparent;color:#991b1b;font-size:16px;line-height:1;cursor:pointer;">×</button>
            <span style="padding-right:24px;display:inline-block;">月次締めに失敗しました: ${escapeHtml(err.message)}</span>
          </div>
        `;
        root.querySelector('#ledgerCloseResultBtn')?.addEventListener('click', () => {
          resultBox.style.display = 'none';
          resultBox.innerHTML = '';
        });
      }
    }
  }

  async function loadLedger() {
    const body = root.querySelector('#ledgerTableBody');
    const cards = root.querySelector('#ledgerCards');
    const pager = root.querySelector('#ledgerPager');
    if (body) body.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>';
    try {
      const qs = new URLSearchParams({ month, page: String(page), pageSize: String(pageSize) });
      if (departmentId) qs.set('departmentId', departmentId);
      const data = await fetchJSONAuth(`/api/attendance/ledger/month?${qs.toString()}`);
      const chipsBox = root.querySelector('#ledgerTodayChips');
      if (chipsBox && data.todayStatus) {
        const ts = data.todayStatus;
        const chip = (label, count, bg, fg) => `
          <span style="display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600;">
            ${escapeHtml(label)} <span style="background:rgba(255,255,255,0.6);border-radius:999px;padding:1px 8px;">${ts[count]}</span>
          </span>
        `;
        chipsBox.innerHTML =
          chip('出勤中', 'working', '#fef9c3', '#854d0e') +
          chip('退勤済', 'checkedOut', '#dcfce7', '#166534') +
          chip('休日・休暇', 'offOrLeave', '#f1f5f9', '#475569');
      }
      if (cards) {
        cards.innerHTML = [
          { label: '出勤日数', value: `${data.totals.attendDays}日` },
          { label: '実働時間', value: hm(data.totals.regularMinutes) },
          { label: '法定外残業', value: hm(data.totals.overtimeMinutes) },
          { label: '深夜', value: hm(data.totals.nightMinutes) },
          { label: '休日労働', value: hm(data.totals.holidayWorkMinutes) }
        ].map(c => `
          <div style="flex:1;min-width:120px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#fff;">
            <div style="font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(c.value)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(c.label)}</div>
          </div>
        `).join('');
      }
      if (body) {
        const rows = data.rows || [];
        const rowBg = r => r.isHolidayWork ? 'background:#fffbeb;' : '';
        const cellBorder = 'border-bottom:1px solid #f1f5f9;';
        body.innerHTML = rows.length ? rows.map(r => `
          <tr style="${rowBg(r)}">
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${escapeHtml(r.date.slice(5))}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${escapeHtml(r.employeeCode || r.userId)}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${escapeHtml(r.username || '')}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}"><span style="display:inline-block;white-space:nowrap;background:#f1f5f9;border-radius:4px;padding:2px 8px;font-size:12px;">${escapeHtml(KUBUN_LABEL[r.kubun] || r.kubun)}</span></td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${escapeHtml(r.checkIn || '—')}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${escapeHtml(r.checkOut || '—')}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${r.breakMinutes != null ? `${r.breakMinutes}分` : '—'}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${r.regularMinutes ? hm(r.regularMinutes) : '—'}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}${r.overtimeMinutes ? 'color:#b45309;font-weight:600;' : ''}">${r.overtimeMinutes ? hm(r.overtimeMinutes) : '—'}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${r.nightMinutes ? hm(r.nightMinutes) : '—'}</td>
            <td style="padding:6px 8px;white-space:nowrap;${cellBorder}">${r.isHolidayWork ? hm(r.regularMinutes + r.overtimeMinutes) : '—'}</td>
            <td style="padding:6px 8px;color:#64748b;font-size:12px;max-width:260px;white-space:pre-wrap;word-break:break-word;${cellBorder}">${escapeHtml(r.memo || '')}</td>
          </tr>
        `).join('') : '<tr><td colspan="12" style="text-align:center;padding:24px;color:#94a3b8;">該当データがありません</td></tr>';
      }
      if (pager) {
        const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
        const to = Math.min(data.total, data.page * data.pageSize);
        pager.innerHTML = `
          <span style="font-size:12px;color:#64748b;">全 ${data.total} 行中 ${from}–${to} 行 （${data.page} / ${data.pages} ページ）</span>
          <div style="display:flex;gap:8px;">
            <button type="button" id="ledgerPrev" ${data.page <= 1 ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">前へ</button>
            <button type="button" id="ledgerNext" ${data.page >= data.pages ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">次へ</button>
          </div>
        `;
        root.querySelector('#ledgerPrev')?.addEventListener('click', () => { if (page > 1) { page -= 1; loadLedger(); } });
        root.querySelector('#ledgerNext')?.addEventListener('click', () => { if (page < data.pages) { page += 1; loadLedger(); } });
      }
    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  departments = await listDepartments().catch(() => []);

  root.innerHTML = `
    <div style="padding:16px 20px 32px;max-width:1300px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">勤怠記録</h2>

      <div id="ledgerClosureBanner" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;"></div>
      <div id="ledgerCloseResult" style="display:none;"></div>

      <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;color:#475569;">対象月</label>
          <input type="month" id="ledgerMonth" value="${month}" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;color:#475569;">部署</label>
          <select id="ledgerDept" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;">
            <option value="">すべて</option>
            ${departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}
          </select>
        </div>
        <button type="button" id="ledgerGoBtn" style="height:32px;padding:0 16px;background:#0b2c66;color:#fff;border:none;border-radius:4px;cursor:pointer;">表示</button>
        <div id="ledgerTodayChips" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"></div>
        <div style="flex:1;"></div>
        <button type="button" id="ledgerXlsxBtn" style="height:32px;padding:0 16px;border:none;border-radius:4px;background:#0b2c66;color:#fff;cursor:pointer;font-weight:600;">Excel出力</button>
      </div>

      <div id="ledgerCards" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:auto;max-height:65vh;">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:1100px;">
          <thead>
            <tr>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">日付</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">社員番号</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">氏名</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">区分</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">出勤</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">退勤</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">休憩</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">実働</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">法定外残業</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">深夜</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">休日</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f1f5f9;border-bottom:2px solid #e2e8f0;transform:translateZ(0);">備考</th>
            </tr>
          </thead>
          <tbody id="ledgerTableBody"></tbody>
        </table>
      </div>
      <div id="ledgerPager" style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"></div>
    </div>
  `;

  root.querySelector('#ledgerGoBtn')?.addEventListener('click', async () => {
    month = root.querySelector('#ledgerMonth').value || month;
    departmentId = root.querySelector('#ledgerDept').value || '';
    page = 1;
    await loadClosureBanner();
    await loadLedger();
  });

  root.querySelector('#ledgerXlsxBtn')?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams({ month });
      if (departmentId) qs.set('departmentId', departmentId);
      await downloadWithAuth(`/api/attendance/ledger/export.xlsx?${qs.toString()}`, `attendance_ledger_${month}.xlsx`);
    } catch (err) {
      alert(String(err?.message || 'Excel出力に失敗しました'));
    }
  });

  await loadClosureBanner();
  await loadLedger();

  return () => {};
}
