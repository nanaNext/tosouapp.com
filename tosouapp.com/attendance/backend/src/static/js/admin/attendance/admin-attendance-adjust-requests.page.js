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

const STATUS_META = {
  pending: { label: '申請中', style: 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;' },
  approved: { label: '承認', style: 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' },
  rejected: { label: '却下', style: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' }
};

export async function mount({ content } = {}) {
  const admin = await requireAdmin();
  const root = content || document.getElementById('adjustRequestsHost') || document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (!admin || !root) return () => {};

  let month = currentMonth();
  let dept = '';
  let userId = '';
  let status = '';
  let page = 1;
  const pageSize = 50;
  let departments = [];
  let employees = [];

  async function loadFilterOptions() {
    departments = await listDepartments().catch(() => []);
    employees = await fetchJSONAuth('/api/admin/users?employmentStatus=active&role=employee&limit=5000')
      .then(r => Array.isArray(r) ? r : (r.rows || r.items || r.users || []))
      .catch(() => []);
    const deptSel = root.querySelector('#reqDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = ['<option value="">すべて</option>']
        .concat(departments.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`))
        .join('');
    }
    const empSel = root.querySelector('#reqUserFilter');
    if (empSel) {
      empSel.innerHTML = ['<option value="">全員</option>']
        .concat(employees.map(u => `<option value="${u.id}">${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`))
        .join('');
    }
    const formEmpSel = root.querySelector('#reqFormUser');
    if (formEmpSel) {
      formEmpSel.innerHTML = employees.map(u =>
        `<option value="${u.id}">${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`
      ).join('');
    }
  }

  async function loadClosureBanner() {
    const box = root.querySelector('#reqCloseBanner');
    if (!box) return;
    box.style.display = 'flex';
    box.innerHTML = '読み込み中...';
    try {
      const summary = await fetchJSONAuth(`/api/attendance/month/closure-summary?month=${encodeURIComponent(month)}`);
      if (summary.closed) {
        box.style.background = '#f1f5f9';
        box.style.borderColor = '#cbd5e1';
        box.style.color = '#334155';
        box.innerHTML = `<span>🔒 ${escapeHtml(month)}分は締め済みです</span>`;
      } else {
        box.style.background = '#f0fdf4';
        box.style.borderColor = '#bbf7d0';
        box.style.color = '#166534';
        box.innerHTML = `
          <span>${escapeHtml(month)}分は入力・修正ができます（未締め、承認済み ${summary.approved}/${summary.total}名）</span>
          <button type="button" id="reqCloseMonthBtn" style="height:28px;padding:0 14px;border:none;border-radius:6px;background:#166534;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">月次締めを実行</button>
        `;
        root.querySelector('#reqCloseMonthBtn')?.addEventListener('click', onCloseMonth);
      }
    } catch (err) {
      box.style.background = '#fef2f2';
      box.style.borderColor = '#fecaca';
      box.style.color = '#991b1b';
      box.textContent = `締め状況の取得に失敗しました: ${err.message}`;
    }
  }

  async function onCloseMonth() {
    if (!confirm(`${month}分を全社員まとめて承認します。入力が未完了の人はスキップされます。よろしいですか？`)) return;
    try {
      await fetchJSONAuth('/api/attendance/month/approve-ready', { method: 'POST', body: JSON.stringify({ month }) });
      await loadClosureBanner();
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  function renderCards(summary) {
    const box = root.querySelector('#reqCards');
    if (!box) return;
    const cards = [
      { label: '申請中', value: `${summary.pending}件` },
      { label: '承認', value: `${summary.approved}件` },
      { label: '却下', value: `${summary.rejected}件`, danger: summary.rejected > 0 }
    ];
    box.innerHTML = cards.map(c => `
      <div style="flex:1;min-width:160px;border:1px solid ${c.danger ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:18px 20px;background:#fff;">
        <div style="font-size:26px;font-weight:700;color:${c.danger ? '#991b1b' : '#0f172a'};line-height:1.2;">${escapeHtml(c.value)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(c.label)}</div>
      </div>
    `).join('');
  }

  function renderTable(items) {
    const body = root.querySelector('#reqTableBody');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">該当する申請がありません</td></tr>';
      return;
    }
    const cellStyle = 'padding:14px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:#334155;';
    body.innerHTML = items.map(r => {
      const meta = STATUS_META[r.status] || STATUS_META.pending;
      const processed = r.processedByName
        ? `${escapeHtml(r.processedByName)}<br><span style="font-size:11px;color:#94a3b8;">${escapeHtml(r.processedAt ? String(r.processedAt).slice(0, 16) : '')}</span>`
        : '—';
      const statusCell = r.status === 'pending'
        ? `<span style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:6px;${meta.style}">${meta.label}</span><br>
           <button type="button" class="req-approve-btn" data-type="${r.type}" data-id="${r.requestId}" style="height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;">承認</button>
           <button type="button" class="req-reject-btn" data-type="${r.type}" data-id="${r.requestId}" style="height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;">却下</button>`
        : `<span style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;${meta.style}">${meta.label}</span>`;
      return `
        <tr>
          <td style="${cellStyle}">${escapeHtml(r.typeLabel)}</td>
          <td style="${cellStyle}font-weight:600;">${escapeHtml(r.applicantName)}${r.employeeCode ? `<br><span style="font-size:11px;font-weight:400;color:#94a3b8;">${escapeHtml(r.employeeCode)}</span>` : ''}</td>
          <td style="${cellStyle}">${escapeHtml(r.targetDate)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;color:#334155;">${escapeHtml(r.content)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;max-width:220px;white-space:pre-wrap;word-break:break-word;color:#334155;">${escapeHtml(r.reason || '')}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${statusCell}</td>
          <td style="${cellStyle}">${processed}</td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('.req-approve-btn').forEach(btn => btn.addEventListener('click', () => onDecide(btn.dataset.type, btn.dataset.id, 'approved')));
    body.querySelectorAll('.req-reject-btn').forEach(btn => btn.addEventListener('click', () => onDecide(btn.dataset.type, btn.dataset.id, 'rejected')));
  }

  function renderPager(data) {
    const pager = root.querySelector('#reqPager');
    if (!pager) return;
    const pages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || pageSize)));
    const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
    const to = Math.min(data.total, data.page * data.pageSize);
    pager.innerHTML = `
      <span style="font-size:12px;color:#64748b;">全 ${data.total} 件中 ${from}–${to} 件（${data.page} / ${pages} ページ）</span>
      <div style="display:flex;gap:8px;">
        <button type="button" id="reqPagerPrev" ${data.page <= 1 ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">前へ</button>
        <button type="button" id="reqPagerNext" ${data.page >= pages ? 'disabled' : ''} style="height:28px;padding:0 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;">次へ</button>
      </div>
    `;
    root.querySelector('#reqPagerPrev')?.addEventListener('click', () => { if (page > 1) { page -= 1; loadList(); } });
    root.querySelector('#reqPagerNext')?.addEventListener('click', () => { if (page < pages) { page += 1; loadList(); } });
  }

  async function loadList() {
    const body = root.querySelector('#reqTableBody');
    if (body) body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>';
    try {
      const qs = new URLSearchParams({ month, page: String(page), pageSize: String(pageSize) });
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      if (status) qs.set('status', status);
      const data = await fetchJSONAuth(`/api/admin/requests/list?${qs.toString()}`);
      renderCards(data.summary || { pending: 0, approved: 0, rejected: 0 });
      renderTable(data.items || []);
      renderPager(data);
    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function onDecide(type, id, decision) {
    let reason = '';
    if (decision === 'rejected' && type === 'adjust') {
      reason = prompt('却下理由を入力してください（必須）:', '') || '';
      if (!reason.trim()) { alert('却下理由を入力してください'); return; }
    }
    try {
      if (type === 'leave') {
        await fetchJSONAuth('/api/leave/approve', { method: 'PUT', body: JSON.stringify({ id, status: decision }) });
      } else {
        await fetchJSONAuth(`/api/adjust/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: decision, adminNote: reason }) });
      }
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  function closeFormModal() {
    const modal = root.querySelector('#reqFormModal');
    if (modal) modal.style.display = 'none';
  }

  async function onFormSubmit(ev) {
    ev.preventDefault();
    const modal = root.querySelector('#reqFormModal');
    const targetUserId = parseInt(modal.querySelector('#reqFormUser').value, 10);
    const startDate = modal.querySelector('#reqFormStart').value;
    const endDate = modal.querySelector('#reqFormEnd').value || startDate;
    const reason = modal.querySelector('#reqFormReason').value.trim();
    if (!targetUserId || !startDate) { alert('社員と日付を入力してください'); return; }
    try {
      await fetchJSONAuth('/api/leave', {
        method: 'POST',
        body: JSON.stringify({ userId: targetUserId, startDate, endDate, type: 'paid', reason })
      });
      closeFormModal();
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  root.innerHTML = `
    <div style="padding:16px 20px 32px;max-width:1300px;">
      <div id="reqCloseBanner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;margin-bottom:16px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid transparent;flex-wrap:wrap;"></div>

      <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">対象月</label>
          <input type="month" id="reqMonthFilter" value="${month}" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">部署</label>
          <select id="reqDeptFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:130px;font-size:13px;"><option value="">すべて</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">社員</label>
          <select id="reqUserFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:150px;font-size:13px;"><option value="">全員</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">ステータス</label>
          <select id="reqStatusFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:13px;">
            <option value="">すべて</option>
            <option value="pending">申請中</option>
            <option value="approved">承認</option>
            <option value="rejected">却下</option>
          </select>
        </div>
        <button type="button" id="reqGoBtn" style="height:36px;padding:0 18px;background:#0b2c66;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">表示</button>
        <div style="flex:1;"></div>
        <button type="button" id="reqAddBtn" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;font-size:13px;color:#334155;">＋申請する</button>
        <button type="button" id="reqCsvBtn" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;font-size:13px;color:#334155;">CSV出力</button>
      </div>

      <div id="reqCards" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:auto;max-height:65vh;background:#fff;">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:14px;min-width:1000px;">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">種別</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">申請者</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">対象日</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">内容</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">理由</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">ステータス</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">処理者</th>
            </tr>
          </thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
      <div id="reqPager" style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"></div>
    </div>

    <div id="reqFormModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.55);align-items:center;justify-content:center;">
      <form id="reqForm" style="width:min(440px,92vw);background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;">有給申請を代理作成</div>
          <button type="button" id="reqFormClose" style="width:28px;height:28px;border:none;background:transparent;cursor:pointer;font-size:18px;color:#64748b;">&times;</button>
        </div>
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:12px;color:#94a3b8;">※ 打刻修正は代理作成できません（本人が申請してください）。</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">社員</label>
            <select id="reqFormUser" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;"></select>
          </div>
          <div style="display:flex;gap:10px;">
            <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:#475569;font-weight:600;">開始日</label>
              <input type="date" id="reqFormStart" required style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;width:100%;">
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:#475569;font-weight:600;">終了日（省略可）</label>
              <input type="date" id="reqFormEnd" style="height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;width:100%;">
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:#475569;font-weight:600;">理由</label>
            <textarea id="reqFormReason" rows="2" style="border:1px solid #cbd5e1;border-radius:4px;padding:8px;resize:vertical;font-family:inherit;"></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <button type="button" id="reqFormCancel" style="height:34px;padding:0 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">キャンセル</button>
          <button type="submit" style="height:34px;padding:0 16px;border:none;border-radius:6px;background:#0b2c66;color:#fff;font-weight:600;cursor:pointer;">保存</button>
        </div>
      </form>
    </div>
  `;

  await loadFilterOptions();

  root.querySelector('#reqGoBtn')?.addEventListener('click', () => {
    month = root.querySelector('#reqMonthFilter').value || month;
    dept = root.querySelector('#reqDeptFilter').value || '';
    userId = root.querySelector('#reqUserFilter').value || '';
    status = root.querySelector('#reqStatusFilter').value || '';
    page = 1;
    loadClosureBanner();
    loadList();
  });

  root.querySelector('#reqAddBtn')?.addEventListener('click', () => {
    const modal = root.querySelector('#reqFormModal');
    if (modal) modal.style.display = 'flex';
  });
  root.querySelector('#reqFormClose')?.addEventListener('click', closeFormModal);
  root.querySelector('#reqFormCancel')?.addEventListener('click', closeFormModal);
  root.querySelector('#reqFormModal')?.addEventListener('click', (ev) => { if (ev.target.id === 'reqFormModal') closeFormModal(); });
  root.querySelector('#reqForm')?.addEventListener('submit', onFormSubmit);

  root.querySelector('#reqCsvBtn')?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams({ month });
      if (dept) qs.set('dept', dept);
      if (status) qs.set('status', status);
      await downloadWithAuth(`/api/admin/requests/export.csv?${qs.toString()}`, `requests_${month}.csv`);
    } catch (err) {
      alert(String(err?.message || 'CSV出力に失敗しました'));
    }
  });

  await loadClosureBanner();
  await loadList();

  return () => {};
}

if (typeof document !== 'undefined' && document.getElementById('adjustRequestsHost')) {
  mount();
}
