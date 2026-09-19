import { getDepartmentReport } from '../../api/departments.api.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  let { year, month } = currentYM();

  async function render() {
    const report = await getDepartmentReport({ year, month });
    const rowsHtml = report.departments.map(d => {
      const mismatch = d.headcountThen !== d.headcountNow;
      return `
        <tr style="border-bottom:1px solid #f1f5f9;${mismatch ? 'background:#fffbeb;' : ''}">
          <td style="padding:8px;">${escapeHtml(d.nameThen)}${d.nameThen !== d.nameNow ? ` <span style="color:#94a3b8;font-size:11px;">(現在: ${escapeHtml(d.nameNow)})</span>` : ''}</td>
          <td style="padding:8px;text-align:right;font-weight:${mismatch ? '700' : '400'};">${d.headcountThen}</td>
          <td style="padding:8px;text-align:right;">${d.headcountNow}</td>
          <td style="padding:8px;">${d.isActiveNow ? '' : '<span style="color:#94a3b8;">無効化済み</span>'}</td>
        </tr>
      `;
    }).join('');

    root.innerHTML = `
      <div style="padding:0 20px 24px;max-width:900px;">
        <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:11px;color:#475569;">対象月</label>
            <input type="month" id="reportMonth" value="${year}-${String(month).padStart(2, '0')}" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;">
          </div>
          <button type="button" id="reportGo" style="height:32px;padding:0 14px;background:#0b2c66;color:#fff;border:none;border-radius:4px;cursor:pointer;">表示</button>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">「当時」= ${report.asOf} 時点の異動履歴に基づく人数。「現在」= 今の所属で数えた人数。ズレがある部署は、その後に異動が発生しています。</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;">部署（当時の名称）</th>
            <th style="padding:8px;text-align:right;">当時</th>
            <th style="padding:8px;text-align:right;">現在</th>
            <th style="padding:8px;text-align:left;">状態</th>
          </tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;">部署がありません</td></tr>'}</tbody>
        </table>
      </div>
    `;

    root.querySelector('#reportGo')?.addEventListener('click', () => {
      const val = root.querySelector('#reportMonth').value;
      const [yy, mm] = String(val || '').split('-').map(n => parseInt(n, 10));
      if (yy && mm) { year = yy; month = mm; render(); }
    });
  }

  await render();
  return () => {};
}
