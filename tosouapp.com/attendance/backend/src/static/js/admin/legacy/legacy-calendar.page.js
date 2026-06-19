import { escapeHtml as esc } from '../_shared/dom.js';
import { api, downloadWithAuth } from '../../shared/api/client.js';

let controller = null;

export async function mount({ content }) {
  await mountCalendar({ content });
}

export async function mountCalendar({ content }) {
  // Tạo AbortController mới mỗi lần mount
  controller = new AbortController();
  const { signal } = controller;

  const pad2 = (n) => String(n).padStart(2, '0');
  const monthOf = (date) => String(date || '').slice(0, 7);
  const splitLabel = (name) => {
    const parts = String(name || '').split(' / ');
    return { ja: parts[0] || '', en: parts.length > 1 ? parts.slice(1).join(' / ') : '' };
  };
  const dowJa = (dateStr) => {
    try {
      const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(x => parseInt(x, 10));
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      return ['日','月','火','水','木','金','土'][dt.getUTCDay()];
    } catch {
      return '';
    }
  };
  const isWeekend = (dateStr) => {
    try {
      const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(x => parseInt(x, 10));
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      const w = dt.getUTCDay();
      return w === 0 || w === 6;
    } catch {
      return false;
    }
  };
  const typeLabel = (t) => {
    const s = String(t || '');
    if (s === 'jp_auto') return '祝日';
    if (s === 'jp_substitute') return '振替';
    if (s === 'jp_bridge') return '国民の休日';
    if (s === 'fixed') return '会社';
    if (s === 'custom') return '任意';
    return s || '—';
  };

  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const year0 = now.getUTCFullYear();
  const month0 = `${year0}-${pad2(now.getUTCMonth() + 1)}`;

  // Check if standalone
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';

  // Render UI
  content.style.margin = '0';
  content.style.padding = '0'; // Reset padding ở cấp độ host container để nhường padding cho thẻ con
  content.style.width = '100%';
  content.style.height = vhExpr;
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.overflow = 'hidden'; // Đóng khung host lại để không bị trào ngang
  content.style.flex = '1';
  content.style.minWidth = '0';
  content.style.boxSizing = 'border-box';
  content.innerHTML = `
    <style>
      .cal-page-content { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: visible; padding: 24px; box-sizing: border-box; width: 100%; }
      .cal-table-wrap { flex: 1 1 0%; min-height: 0; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
      
      .attrec-controls { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
      .attrec-controls .filter-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .cal-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      
      @media (max-width: 768px) {
        .cal-page-content { flex: 1 1 0% !important; min-height: 0 !important; overflow: visible !important; display: flex !important; flex-direction: column !important; padding-top: 12px !important; }
        .cal-table-wrap { flex: 1 1 0% !important; min-height: 0 !important; overflow-y: visible !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        
        /* Hide original topbar elements (Title, Search) to make room */
        body.admin .topbar .brand,
        body.admin .topbar .search { display: none !important; }
        
        /* In case the layout injects a separate title element inside content */
        .attrec-card h2, .attrec-card .page-title, .page-header, #attHubMobileTitle { display: none !important; }
        
        /* Move controls into the topbar space */
        .attrec-controls { 
          position: fixed !important;
          top: 0 !important;
          left: 48px !important; /* Avoid hamburger */
          right: 0 !important; 
          height: 50px !important;
          z-index: 2147483600 !important;
          flex-direction: row !important; 
          flex-wrap: nowrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          margin: 0 !important;
          padding: 0 8px !important;
          gap: 4px !important;
          background: #F9FAFB !important;
          border-bottom: 1px solid #E5E7EB !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          white-space: nowrap !important;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .attrec-controls::-webkit-scrollbar { display: none; }
        
        .attrec-controls .filter-group { 
          width: auto !important; 
          display: flex !important; 
          flex-direction: row !important; 
          align-items: center !important; 
          gap: 4px !important; 
          flex: 0 0 auto !important;
        }
        #calMonth { 
          width: auto !important; 
          height: 28px !important; 
          padding: 0 20px 0 4px !important;
          font-size: 12px !important;
          border: 1px solid #cbd5e1 !important;
          background-color: #fff !important;
          color: #0f172a !important;
          border-radius: 4px !important;
        }
        #calMonth option { color: #000; background: #fff; }
        
        .cal-checkbox-wrap { padding: 0 !important; }
        .cal-checkbox-wrap label { color: #475569 !important; font-size: 11px !important; margin: 0 !important; gap: 4px !important; }
        .cal-checkbox-wrap input { margin: 0 !important; }
        
        .cal-actions { 
          display: flex !important; 
          flex-direction: row !important; 
          width: auto !important; 
          gap: 4px !important; 
          flex: 0 0 auto !important;
        }
        .cal-actions button { 
          flex: 0 0 auto !important; 
          height: 28px !important; 
          padding: 0 6px !important; 
          font-size: 11px !important; 
          white-space: nowrap !important;
        }
      }
    </style>
    <div class="cal-page-content card attrec-card">
      <div class="attrec-controls">
        <div class="filter-group">
          <select id="calMonth" class="se-time" style="width:120px;height:32px;">
            <option value="">${esc(year0)}年 (全て)</option>
            ${Array.from({ length: 12 }).map((_, i) => {
              const m = pad2(i + 1);
              const v = `${year0}-${m}`;
              return `<option value="${esc(v)}" ${v === month0 ? 'selected' : ''}>${esc(year0)}年${m}月</option>`;
            }).join('')}
          </select>
          <div class="cal-checkbox-wrap">
            <label style="display:flex;align-items:center;font-weight:800;color:#475569;">
              <input id="calOnlyOff" type="checkbox" checked>
              休日のみ
            </label>
          </div>
        </div>
        <div class="cal-actions">
          <button id="calExportCsv" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #cbd5e1;color:#0b2c66;">Excel</button>
          <input type="file" id="calImportFile" accept=".xlsx, .xls" style="display:none;">
          <button id="calImportCsv" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #cbd5e1;color:#0b2c66;">インポート</button>
          <button id="calReset" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #fecaca;color:#ef4444;">リセット</button>
        </div>
      </div>
      <div id="calInfo" class="attrec-summary" aria-live="polite" style="margin-bottom:12px;"></div>
      <div class="cal-table-wrap">
        <div id="calTable" class="attrec-table"></div>
      </div>
    </div>
  `;

  const infoHost = content.querySelector('#calInfo');
  const tableHost = content.querySelector('#calTable');

  const render = (rows, meta) => {
    if (!tableHost) return;
    const list = Array.isArray(rows) ? rows : [];

    const byType = list.reduce((acc, r) => {
      const k = String((r && r.type) ? r.type : '');
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    if (infoHost) {
      const pingTxt = (meta && meta.ping) ? `Ping: ${esc(meta.ping)}` : 'OK';
      const total = list.length;
      const pills = Object.keys(byType).sort().map(k => 
        `<span class="attrec-pill neutral">${esc(typeLabel(k))}: ${esc(byType[k])}</span>`
      ).join(' ');

      infoHost.innerHTML = `
        <span class="attrec-pill ok">${pingTxt}</span>
        <span class="attrec-pill neutral">件数: ${esc(total)}</span>
        ${pills}
      `;
    }

    if (!list.length) {
      tableHost.innerHTML = `
        <div class="empty-state">
          <div style="font-size:28px;">🗂️</div>
          <div>データがありません</div>
        </div>
      `;
      return;
    }

    const tableHtml = list.map(r => {
      const dt = String((r && r.date) ? r.date : '').slice(0, 10);
      const nm = splitLabel((r && r.name) ? r.name : '');
      const off = Number((r && r.is_off) ? r.is_off : 0) ? '休' : '';
      const offCls = Number((r && r.is_off) ? r.is_off : 0) ? 'attrec-pill ok' : 'attrec-pill neutral';
      const isWk = isWeekend(dt);
      const isOff = Number((r && r.is_off) ? r.is_off : 0);
      const rowCls = isOff ? 'cal-row off' : (isWk ? 'cal-row weekend' : 'cal-row');

      return `
        <tr class="cal-desktop-row ${rowCls}">
          <td>${esc(dt)}</td>
          <td>${esc(dowJa(dt))}</td>
          <td>${esc(typeLabel((r && r.type) ? r.type : ''))}</td>
          <td><span class="${offCls}">${esc(off || '—')}</span></td>
          <td title="${esc(nm.ja)}">${esc(nm.ja || '')}</td>
          <td title="${esc(nm.en)}">${esc(nm.en || '')}</td>
        </tr>
        <tr class="cal-mobile-row">
          <td colspan="6" class="cal-mobile-cell">
            <div class="cal-card">
              <div class="cal-card-header">
                <div class="cal-card-date">${esc(dt)} (${esc(dowJa(dt))})</div>
                <span class="${offCls}">${esc(off || '—')}</span>
              </div>
              <div class="cal-card-body">
                <div class="cal-card-row">
                  <span class="cal-card-label">名称</span>
                  <span class="cal-card-value">${esc(nm.ja || '')}</span>
                </div>
                <div class="cal-card-row">
                  <span class="cal-card-label">English</span>
                  <span class="cal-card-value">${esc(nm.en || '')}</span>
                </div>
                <div class="cal-card-row">
                  <span class="cal-card-label">種別</span>
                  <span class="cal-card-value">${esc(typeLabel((r && r.type) ? r.type : ''))}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableHost.innerHTML = `
      <style>
        .cal-desktop-row { display: table-row; }
        .cal-mobile-row { display: none; }
        @media (max-width: 768px) {
          .cal-dash-table thead { display: none; }
          .cal-desktop-row { display: none; }
          .cal-mobile-row { display: table-row; }
          .cal-mobile-cell { padding: 0 !important; border: none !important; background: transparent !important; }
          .cal-mobile-cell:hover { background: transparent !important; }
          .cal-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden; }
          .cal-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
          .cal-card-date { font-weight: 700; font-size: 15px; color: #0f172a; }
          .cal-card-body { padding: 12px 16px; }
          .cal-card-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; }
          .cal-card-label { color: #64748b; width: 60px; flex-shrink: 0; font-weight: 500; }
          .cal-card-value { color: #1e293b; font-weight: 500; }
        }
      </style>
      <table class="dash-table cal-dash-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th>日付</th><th>曜日</th><th>種別</th><th>休日</th><th>名称</th><th>English</th>
          </tr>
        </thead>
        <tbody>
          ${tableHtml}
        </tbody>
      </table>
    `;
  };

  const load = async () => {
    if (!tableHost) return;

    tableHost.innerHTML = `
      <div class="empty-state">
        <div style="font-size:28px;">⏳</div>
        <div>読み込み中…</div>
      </div>
    `;
    if (infoHost) infoHost.innerHTML = '';

    const mEl = content.querySelector('#calMonth');
    const onlyEl = content.querySelector('#calOnlyOff');
    const mSel = String((mEl && mEl.value) ? mEl.value : '');
    const y = mSel ? parseInt(mSel.split('-')[0], 10) : year0;
    const onlyOff = !!(onlyEl && onlyEl.checked);

    const ping = await api.get(`/api/admin/calendar/ping?year=${encodeURIComponent(y)}`).catch(() => null);
    const raw = await api.get(`/api/admin/calendar/raw?year=${encodeURIComponent(y)}`).catch(() => null);

    let rows = (raw && Array.isArray(raw.rows)) ? raw.rows : [];
    if (mSel && mSel.includes('-')) rows = rows.filter(r => monthOf(r && r.date ? r.date : '') === mSel);
    if (onlyOff) rows = rows.filter(r => Number((r && r.is_off) ? r.is_off : 0) === 1);

    rows.sort((a, b) =>
      String((a && a.date) ? a.date : '').localeCompare(String((b && b.date) ? b.date : '')) ||
      String((a && a.type) ? a.type : '').localeCompare(String((b && b.type) ? b.type : ''))
    );

    render(rows, { ping: (ping && ping.version) ? ping.version : null });
  };

  // Event listeners (có signal để auto cleanup)
  const mEl = content.querySelector('#calMonth');
  const onlyEl = content.querySelector('#calOnlyOff');
  if (mEl) mEl.addEventListener('change', load, { signal });
  if (onlyEl) onlyEl.addEventListener('change', load, { signal });

  const btnCsv = content.querySelector('#calExportCsv');
  if (btnCsv) btnCsv.addEventListener('click', async () => {
    const mEl2 = content.querySelector('#calMonth');
    const mSel2 = String((mEl2 && mEl2.value) ? mEl2.value : '');
    const y = mSel2 ? parseInt(mSel2.split('-')[0], 10) : year0;
    const url = `/api/admin/calendar/export.xlsx?year=${encodeURIComponent(y)}&type=jp_auto,jp_substitute,jp_bridge,fixed,custom&include_nonoff=false`;
    try {
      await downloadWithAuth(url, `company_holidays_${y}.xlsx`);
    } catch (e) {
      alert(String((e && e.message) ? e.message : 'エクスポートに失敗しました'));
    }
  }, { signal });

  const btnIcs = content.querySelector('#calExportIcs');
  if (btnIcs) btnIcs.addEventListener('click', async () => {
    const mEl3 = content.querySelector('#calMonth');
    const mSel3 = String((mEl3 && mEl3.value) ? mEl3.value : '');
    const y = mSel3 ? parseInt(mSel3.split('-')[0], 10) : year0;
    const url = `/api/admin/calendar/export?year=${encodeURIComponent(y)}&include_nonoff=false&lang=ja`;
    try {
      await downloadWithAuth(url, `company_holidays_${y}.xlsx`);
    } catch (e) {
      alert(String((e && e.message) ? e.message : 'エクスポートに失敗しました'));
    }
  }, { signal });

  const btnImport = content.querySelector('#calImportCsv');
  const fileInput = content.querySelector('#calImportFile');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.click();
    }, { signal });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.upload('/api/admin/calendar/import', formData);
        alert('カレンダーをインポートしました。');
        load();
      } catch (err) {
        alert('インポートに失敗しました。: ' + String((err && err.message) ? err.message : ''));
      } finally {
        fileInput.value = '';
      }
    }, { signal });
  }

  const btnReset = content.querySelector('#calReset');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const mElReset = content.querySelector('#calMonth');
      const mSelReset = String((mElReset && mElReset.value) ? mElReset.value : '');
      const y = mSelReset ? parseInt(mSelReset.split('-')[0], 10) : year0;
      
      if (!confirm(`${y}年のカスタム休日（インポートしたデータ）をすべて削除してリセットしますか？\n※国民の祝日は削除されません。`)) return;
      
      try {
        await api.del(`/api/admin/calendar/jp?year=${encodeURIComponent(y)}`);
        alert('リセットしました。');
        load();
      } catch (err) {
        alert('リセットに失敗しました。: ' + String((err && err.message) ? err.message : ''));
      }
    }, { signal });
  }

  await load();
}

// Cleanup khi rời tab
export function unmountCalendar() {
  if (controller) {
    controller.abort();
    controller = null;
  }
}
