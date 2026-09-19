import { getMonthLocks, closeMonth, reopenMonth } from '../../api/departments.api.js';

function ymLabel(y, m) { return `${y}年${m}月`; }

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  for (let i = 0; i < n; i++) {
    out.push({ year: y, month: m });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out.reverse();
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  async function render() {
    const locks = await getMonthLocks();
    const lockMap = new Map(locks.map(l => [`${l.year}-${l.month}`, l]));
    const closedKeys = locks.filter(l => l.status === 'closed').map(l => l.year * 12 + l.month);
    const latestClosed = closedKeys.length ? Math.max(...closedKeys) : null;
    const months = lastNMonths(12);
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + (now.getMonth() + 1);

    const rowsHtml = months.map(({ year, month }) => {
      const lock = lockMap.get(`${year}-${month}`);
      const isClosed = lock?.status === 'closed';
      const monthKey = year * 12 + month;
      const isNextClosable = !isClosed && (latestClosed == null ? true : monthKey === latestClosed + 1) && monthKey < nowKey;
      const isFuture = monthKey >= nowKey;
      let actionHtml;
      if (isClosed) {
        actionHtml = `<button type="button" data-action="reopen" data-year="${year}" data-month="${month}" style="color:#b45309;cursor:pointer;">再オープン</button>`;
      } else if (isNextClosable) {
        actionHtml = `<button type="button" data-action="close" data-year="${year}" data-month="${month}" style="color:#0b2c66;font-weight:600;cursor:pointer;">締める</button>`;
      } else if (isFuture) {
        actionHtml = `<span style="color:#94a3b8;">月末を過ぎるまで締められません</span>`;
      } else {
        actionHtml = `<span style="color:#94a3b8;">前の月を先に締めてください</span>`;
      }
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;">${ymLabel(year, month)}</td>
          <td style="padding:8px;">${isClosed ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;">締め済み</span>' : '<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:4px;">未締め</span>'}</td>
          <td style="padding:8px;">${actionHtml}</td>
        </tr>
      `;
    }).join('');

    root.innerHTML = `
      <div style="padding:0 20px 24px;max-width:900px;">
        <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#1e3a5f;line-height:1.6;">
          締められるのは月末を過ぎた月だけで、古い月から順に締めます。<br>
          再オープンできるのはシステム管理者のみで、理由の入力が必須です。ある月を再オープンすると、それより後に締めている月も一緒に再オープンされます（締め済みの月が常に連続するようにするため）。<br>
          締め・再オープンは変更履歴に残ります。
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">対象月</th><th style="padding:8px;text-align:left;">状態</th><th style="padding:8px;text-align:left;">操作</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    root.querySelectorAll('button[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const year = Number(btn.dataset.year);
        const month = Number(btn.dataset.month);
        if (!confirm(`${ymLabel(year, month)}を締めます。よろしいですか？`)) return;
        try {
          await closeMonth({ year, month });
          await render();
        } catch (err) {
          alert(`締められませんでした: ${err.message}`);
        }
      });
    });

    root.querySelectorAll('button[data-action="reopen"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const year = Number(btn.dataset.year);
        const month = Number(btn.dataset.month);
        const laterClosed = locks.filter(l => l.status === 'closed' && (l.year * 12 + l.month) > (year * 12 + month));
        const warn = laterClosed.length
          ? `\n※ これより後の締め済み月も同時に再オープンされます: ${laterClosed.map(l => ymLabel(l.year, l.month)).join('、 ')}`
          : '';
        const reason = prompt(`${ymLabel(year, month)}を再オープンする理由を入力してください。${warn}`);
        if (!reason || !reason.trim()) return;
        try {
          await reopenMonth({ year, month, reason: reason.trim() });
          await render();
        } catch (err) {
          alert(`再オープンできませんでした: ${err.message}`);
        }
      });
    });
  }

  await render();
  return () => {};
}
