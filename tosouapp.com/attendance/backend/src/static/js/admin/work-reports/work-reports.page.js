import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';
import { listDepartments } from '../../api/departments.api.js';
import { requireAdmin } from '../_shared/require-admin.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentMonth() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function hm(minutes) {
  const n = Math.round(Number(minutes) || 0);
  if (!n) return '0:00';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function fmtTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function durationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = String(startTime).slice(0, 5).split(':').map(Number);
  const [eh, em] = String(endTime).slice(0, 5).split(':').map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null;
  return (eh * 60 + em) - (sh * 60 + sm);
}

const STATUS_META = {
  pending: { label: '承認待ち', style: 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;' },
  approved: { label: '承認済み', style: 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' },
  rejected: { label: '差戻し', style: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' }
};

// 現場が未入力でも、出勤時に選んだ勤務形態（出社/在宅）が分かればそれを代わりに表示する。
// 「現場」に対応するworkType('satellite')は本人が現場名を書く前提なのでここでは補わない。
const WORK_TYPE_LABEL = {
  onsite: '出社',
  remote: '在宅'
};

export async function mount({ content } = {}) {
  const admin = await requireAdmin();
  const root = content || document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (!admin || !root) return () => {};

  let month = currentMonth();
  let dept = '';
  let userId = '';
  let status = '';
  let page = 1;
  const pageSize = 50;
  let departments = [];
  let employees = [];
  let lastData = null;

  async function loadFilterOptions() {
    departments = await listDepartments().catch(() => []);
    employees = await fetchJSONAuth('/api/admin/users?employmentStatus=active&role=employee&limit=5000')
      .then(r => Array.isArray(r) ? r : (r.rows || r.items || r.users || []))
      .catch(() => []);
    const deptSel = root.querySelector('#wrDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = ['<option value="">すべて</option>']
        .concat(departments.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`))
        .join('');
    }
    const empSel = root.querySelector('#wrUserFilter');
    if (empSel) {
      empSel.innerHTML = ['<option value="">全員</option>']
        .concat(employees.map(u => `<option value="${u.id}">${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`))
        .join('');
    }
  }

  function renderClosureBanner(closed) {
    const box = root.querySelector('#wrCloseBanner2');
    if (!box) return;
    if (closed) {
      box.style.background = '#f1f5f9';
      box.style.borderColor = '#cbd5e1';
      box.style.color = '#334155';
      box.innerHTML = `<span>🔒 ${escapeHtml(month)}分は締め済みです</span>`;
    } else {
      box.style.background = '#f0fdf4';
      box.style.borderColor = '#bbf7d0';
      box.style.color = '#166534';
      box.innerHTML = `
        <span>${escapeHtml(month)}分は入力・修正ができます（未締め）</span>
        <button type="button" id="wrCloseMonthBtn2" style="height:28px;padding:0 14px;border:none;border-radius:6px;background:#166534;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">月次締めを実行</button>
      `;
      root.querySelector('#wrCloseMonthBtn2')?.addEventListener('click', onCloseMonth);
    }
  }

  async function onCloseMonth() {
    if (!confirm(`${month}分を締めます。締め後は入力・修正ができなくなります。よろしいですか？`)) return;
    const btn = root.querySelector('#wrCloseMonthBtn2');
    if (btn) { btn.disabled = true; btn.textContent = '実行中...'; }
    try {
      await fetchJSONAuth('/api/admin/work-reports/close-month', { method: 'POST', body: JSON.stringify({ month }) });
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
      if (btn) { btn.disabled = false; btn.textContent = '月次締めを実行'; }
    }
  }

  function renderCards(summary) {
    const box = root.querySelector('#wrCards');
    if (!box) return;
    const cards = [
      { label: '報告件数', value: `${summary.count}件` },
      { label: '報告時間の合計', value: hm(summary.totalMinutes) },
      { label: '承認待ち', value: `${summary.pending}件`, warn: summary.pending > 0 },
      { label: '差戻し', value: `${summary.rejected}件`, danger: summary.rejected > 0 }
    ];
    box.innerHTML = cards.map(c => `
      <div style="flex:1;min-width:160px;border:1px solid ${c.danger ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:18px 20px;background:#fff;">
        <div style="font-size:26px;font-weight:700;color:${c.danger ? '#991b1b' : '#0f172a'};line-height:1.2;">${escapeHtml(c.value)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(c.label)}</div>
      </div>
    `).join('');
  }

  function rowActionsHtml(r) {
    const btnStyle = 'height:30px;padding:0 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px;';
    const buttons = [];
    if (r.status === 'pending') {
      buttons.push(`<button type="button" class="wr-approve-btn" data-id="${r.id}" style="${btnStyle}border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;">承認</button>`);
      buttons.push(`<button type="button" class="wr-reject-btn" data-id="${r.id}" style="${btnStyle}border:1px solid #fecaca;background:#fef2f2;color:#991b1b;">差戻し</button>`);
    }
    buttons.push(`<button type="button" class="wr-edit-btn" data-id="${r.id}" style="${btnStyle}border:1px solid #cbd5e1;background:#fff;color:#334155;">編集</button>`);
    buttons.push(`<button type="button" class="wr-delete-btn" data-id="${r.id}" style="${btnStyle}border:1px solid #fecaca;background:#fff;color:#991b1b;">削除</button>`);
    return buttons.join('');
  }

  function renderTable(items) {
    const body = root.querySelector('#wrTableBody2');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">該当する報告がありません</td></tr>';
      return;
    }
    const cellStyle = 'padding:14px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:#334155;';
    body.innerHTML = items.map(r => {
      const meta = STATUS_META[r.status] || STATUS_META.pending;
      const minutes = durationMinutes(r.startTime, r.endTime);
      return `
        <tr>
          <td style="${cellStyle}">${escapeHtml(String(r.date || '').slice(0, 10))}</td>
          <td style="${cellStyle}font-weight:600;">${escapeHtml(r.username || '')}${r.employeeCode ? `<br><span style="font-size:11px;font-weight:400;color:#94a3b8;">${escapeHtml(r.employeeCode)}</span>` : ''}</td>
          <td style="${cellStyle}max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.site || WORK_TYPE_LABEL[r.workType] || '—')}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;max-width:260px;white-space:pre-wrap;word-break:break-word;color:#334155;">${escapeHtml(r.work || '')}</td>
          <td style="${cellStyle}">${escapeHtml(fmtTime(r.startTime))}</td>
          <td style="${cellStyle}">${escapeHtml(fmtTime(r.endTime))}</td>
          <td style="${cellStyle}">${minutes != null ? hm(minutes) : '—'}</td>
          <td style="${cellStyle}"><span style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;${meta.style}">${meta.label}</span></td>
          <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${rowActionsHtml(r)}</td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('.wr-approve-btn').forEach(btn => btn.addEventListener('click', () => onApprove(btn.dataset.id)));
    body.querySelectorAll('.wr-reject-btn').forEach(btn => btn.addEventListener('click', () => onReject(btn.dataset.id)));
    body.querySelectorAll('.wr-edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
    body.querySelectorAll('.wr-delete-btn').forEach(btn => btn.addEventListener('click', () => onDelete(btn.dataset.id)));
  }

  function renderPager(data) {
    const pager = root.querySelector('#wrPager2');
    if (!pager) return;
    const pages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || pageSize)));
    const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
    const to = Math.min(data.total, data.page * data.pageSize);
    pager.innerHTML = `
      <span style="font-size:12px;color:#64748b;">全 ${data.total} 件中 ${from}–${to} 件（${data.page} / ${pages} ページ）</span>
      <div style="display:flex;gap:8px;">
        <button type="button" id="wrPagerPrev" ${data.page <= 1 ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">前へ</button>
        <button type="button" id="wrPagerNext" ${data.page >= pages ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">次へ</button>
      </div>
    `;
    root.querySelector('#wrPagerPrev')?.addEventListener('click', () => { if (page > 1) { page -= 1; loadList(); } });
    root.querySelector('#wrPagerNext')?.addEventListener('click', () => { if (page < pages) { page += 1; loadList(); } });
  }

  async function loadList() {
    const body = root.querySelector('#wrTableBody2');
    if (body) body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>';
    try {
      const qs = new URLSearchParams({ month, page: String(page), pageSize: String(pageSize) });
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      if (status) qs.set('status', status);
      const data = await fetchJSONAuth(`/api/admin/work-reports/list?${qs.toString()}`);
      lastData = data;
      renderClosureBanner(!!data.closed);
      renderCards(data.summary || { count: 0, totalMinutes: 0, pending: 0, rejected: 0 });
      renderTable(data.items || []);
      renderPager(data);
    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function onApprove(id) {
    try {
      await fetchJSONAuth(`/api/admin/work-reports/${id}/approve`, { method: 'POST' });
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  async function onReject(id) {
    const reason = prompt('差戻し理由を入力してください（任意）:', '');
    if (reason === null) return;
    try {
      await fetchJSONAuth(`/api/admin/work-reports/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  async function onDelete(id) {
    if (!confirm('この報告を削除します。よろしいですか？')) return;
    try {
      await fetchJSONAuth(`/api/admin/work-reports/${id}`, { method: 'DELETE' });
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  function closeFormModal() {
    const modal = root.querySelector('#wrFormModal');
    if (modal) modal.style.display = 'none';
  }

  function openFormModal({ editing, record } = {}) {
    const modal = root.querySelector('#wrFormModal');
    if (!modal) return;
    const title = modal.querySelector('#wrFormTitle');
    if (title) title.textContent = editing ? '作業報告を編集' : '作業報告を追加';
    const empField = modal.querySelector('#wrFormUserField');
    if (empField) empField.style.display = editing ? 'none' : '';
    modal.querySelector('#wrFormId').value = record?.id || '';
    modal.querySelector('#wrFormUser').innerHTML = employees.map(u =>
      `<option value="${u.id}" ${record && Number(record.userId) === Number(u.id) ? 'selected' : ''}>${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`
    ).join('');
    modal.querySelector('#wrFormDate').value = record?.date ? String(record.date).slice(0, 10) : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    modal.querySelector('#wrFormStart').value = record?.startTime ? String(record.startTime).slice(0, 5) : '';
    modal.querySelector('#wrFormEnd').value = record?.endTime ? String(record.endTime).slice(0, 5) : '';
    modal.querySelector('#wrFormSite').value = record?.site || '';
    modal.querySelector('#wrFormWork').value = record?.work || '';
    modal.style.display = 'flex';
  }

  async function openEditModal(id) {
    const record = (lastData?.items || []).find(r => String(r.id) === String(id));
    if (!record) return;
    openFormModal({ editing: true, record });
  }

  async function onFormSubmit(ev) {
    ev.preventDefault();
    const modal = root.querySelector('#wrFormModal');
    const id = modal.querySelector('#wrFormId').value;
    const payload = {
      date: modal.querySelector('#wrFormDate').value,
      startTime: modal.querySelector('#wrFormStart').value || null,
      endTime: modal.querySelector('#wrFormEnd').value || null,
      site: modal.querySelector('#wrFormSite').value.trim(),
      work: modal.querySelector('#wrFormWork').value.trim()
    };
    if (!payload.work) { alert('作業内容を入力してください'); return; }
    try {
      if (id) {
        await fetchJSONAuth(`/api/admin/work-reports/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        payload.userId = parseInt(modal.querySelector('#wrFormUser').value, 10);
        if (!payload.userId) { alert('社員を選択してください'); return; }
        await fetchJSONAuth('/api/admin/work-reports', { method: 'POST', body: JSON.stringify(payload) });
      }
      closeFormModal();
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  root.innerHTML = `
    <div style="padding:16px 20px 32px;max-width:1300px;">
      <div id="wrCloseBanner2" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;margin-bottom:16px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid transparent;flex-wrap:wrap;"></div>

      <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">対象月</label>
          <input type="month" id="wrMonthFilter" value="${month}" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">部署</label>
          <select id="wrDeptFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:130px;font-size:13px;"><option value="">すべて</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">社員</label>
          <select id="wrUserFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:150px;font-size:13px;"><option value="">全員</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">ステータス</label>
          <select id="wrStatusFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:13px;">
            <option value="">すべて</option>
            <option value="pending">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">差戻し</option>
          </select>
        </div>
        <button type="button" id="wrGoBtn" style="height:36px;padding:0 18px;background:#0b2c66;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">表示</button>
        <div style="flex:1;"></div>
        <button type="button" id="wrBackfillBtn" title="月次勤怠入力にある過去の現場・作業内容を作業報告として取り込みます" style="height:36px;padding:0 16px;border:1px dashed #94a3b8;border-radius:6px;background:#f8fafc;cursor:pointer;font-weight:600;font-size:13px;color:#475569;">過去データを取込</button>
        <button type="button" id="wrAddBtn" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;font-size:13px;color:#334155;">＋追加</button>
        <button type="button" id="wrCsvBtn" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;font-size:13px;color:#334155;">CSV出力</button>
        <button type="button" id="wrXlsxBtn" style="height:36px;padding:0 16px;border:none;border-radius:6px;background:#0b2c66;color:#fff;cursor:pointer;font-weight:600;font-size:13px;">Excel出力</button>
      </div>

      <div id="wrCards" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:auto;max-height:65vh;background:#fff;">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:14px;min-width:1000px;">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">日付</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">社員</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">現場・案件</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">作業内容</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">開始</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">終了</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">時間</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">ステータス</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);"></th>
            </tr>
          </thead>
          <tbody id="wrTableBody2"></tbody>
        </table>
      </div>
      <div id="wrPager2" style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"></div>
    </div>

    <div id="wrFormModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.55);align-items:center;justify-content:center;">
      <form id="wrForm" style="width:min(480px,92vw);background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div id="wrFormTitle" style="font-size:15px;font-weight:700;color:#0f172a;">作業報告を追加</div>
          <button type="button" id="wrFormClose" style="width:28px;height:28px;border:none;background:transparent;cursor:pointer;font-size:18px;color:#64748b;">&times;</button>
        </div>
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;">
          <input type="hidden" id="wrFormId">
          <div id="wrFormUserField" style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">社員</label>
            <select id="wrFormUser" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;"></select>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">日付</label>
            <input type="date" id="wrFormDate" required style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;">
          </div>
          <div style="display:flex;gap:10px;">
            <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:#475569;font-weight:600;">開始</label>
              <input type="time" id="wrFormStart" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;width:100%;">
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:#475569;font-weight:600;">終了</label>
              <input type="time" id="wrFormEnd" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;width:100%;">
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">現場・案件</label>
            <input type="text" id="wrFormSite" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;">
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">作業内容</label>
            <textarea id="wrFormWork" rows="3" required style="border:1px solid #cbd5e1;border-radius:4px;padding:8px;resize:vertical;font-family:inherit;"></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <button type="button" id="wrFormCancel" style="height:34px;padding:0 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">キャンセル</button>
          <button type="submit" style="height:34px;padding:0 16px;border:none;border-radius:6px;background:#0b2c66;color:#fff;font-weight:600;cursor:pointer;">保存</button>
        </div>
      </form>
    </div>
  `;

  await loadFilterOptions();

  root.querySelector('#wrGoBtn')?.addEventListener('click', () => {
    month = root.querySelector('#wrMonthFilter').value || month;
    dept = root.querySelector('#wrDeptFilter').value || '';
    userId = root.querySelector('#wrUserFilter').value || '';
    status = root.querySelector('#wrStatusFilter').value || '';
    page = 1;
    loadList();
  });

  root.querySelector('#wrBackfillBtn')?.addEventListener('click', async () => {
    if (!confirm('月次勤怠入力にある過去の現場・作業内容を、作業報告として取り込みます（既に作業報告があるものはスキップされ、何度実行しても重複しません）。実行しますか？')) return;
    const btn = root.querySelector('#wrBackfillBtn');
    if (btn) { btn.disabled = true; btn.textContent = '取込中...'; }
    try {
      const result = await fetchJSONAuth('/api/admin/work-reports/backfill-from-daily', { method: 'POST' });
      alert(`取込完了\n作成: ${result.created}件\nスキップ（既存）: ${result.skippedExisting}件\nスキップ（内容なし）: ${result.skippedEmpty}件`);
      await loadList();
    } catch (err) {
      alert(String(err?.message || '取込に失敗しました'));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '過去データを取込'; }
    }
  });

  root.querySelector('#wrAddBtn')?.addEventListener('click', () => openFormModal({ editing: false }));
  root.querySelector('#wrFormClose')?.addEventListener('click', closeFormModal);
  root.querySelector('#wrFormCancel')?.addEventListener('click', closeFormModal);
  root.querySelector('#wrFormModal')?.addEventListener('click', (ev) => { if (ev.target.id === 'wrFormModal') closeFormModal(); });
  root.querySelector('#wrForm')?.addEventListener('submit', onFormSubmit);

  root.querySelector('#wrCsvBtn')?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams({ month });
      if (dept) qs.set('dept', dept);
      if (status) qs.set('status', status);
      await downloadWithAuth(`/api/admin/work-reports/export.csv?${qs.toString()}`, `work_reports_${month}.csv`);
    } catch (err) {
      alert(String(err?.message || 'CSV出力に失敗しました'));
    }
  });

  root.querySelector('#wrXlsxBtn')?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams({ month });
      if (dept) qs.set('dept', dept);
      if (status) qs.set('status', status);
      await downloadWithAuth(`/api/admin/work-reports/export-report.xlsx?${qs.toString()}`, `work_reports_${month}.xlsx`);
    } catch (err) {
      alert(String(err?.message || 'Excel出力に失敗しました'));
    }
  });

  await loadList();

  return () => {};
}
