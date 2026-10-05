import { listDepartments, createDepartment, updateDepartment, deactivateDepartment, listDepartmentUsers, listAssignments } from '../../api/departments.api.js';
import { listCorporations } from '../../api/corporations.api.js';
import { listUsers, extractUserRows } from '../../api/users.api.js';
import { delegate } from '../_shared/dom.js';
import { escapeHtml, toast, userLabel, todayStr } from './org-ui.js?v=20261005-org1';

// 部署一覧: 法人ごとにまとめて、人数つきで表示。人数を押すと所属社員、「編集」で名前・法人を変更
export async function mount({ content, onManageCorporations } = {}) {
  const root = content;
  if (!root) return () => {};

  let departments = [];
  let corporations = [];
  let usersById = new Map();
  let members = new Map();      // departmentId -> userIds（今日時点）
  let assignments = [];
  let asOf = '';
  let showInactive = false;
  let editingId = null;
  let openId = null;
  let adding = false;

  async function load() {
    const [depts, corps, usersRaw, asg] = await Promise.all([
      listDepartments({ includeInactive: true }),
      listCorporations({ includeInactive: true }),
      listUsers(),
      listAssignments().catch(() => [])
    ]);
    assignments = asg || [];
    departments = depts || [];
    corporations = corps || [];
    usersById = new Map(extractUserRows(usersRaw).map(u => [String(u.id), u]));
    // 人数は「部署の所属社員」と同じ API で数える（異動履歴を反映した今日時点の所属）
    const results = await Promise.all(departments.filter(d => d.is_active).map(d =>
      listDepartmentUsers(d.id).then(r => [d.id, r]).catch(() => [d.id, null])
    ));
    members = new Map();
    for (const [id, r] of results) {
      if (!r) continue;
      members.set(String(id), (r.userIds || []).map(String));
      asOf = r.asOf || asOf;
    }
  }

  function corpOptions(selectedId, { blank } = {}) {
    return (blank ? `<option value="">${blank}</option>` : '') + corporations
      .filter(c => c.is_active || String(c.id) === String(selectedId))
      .map(c => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  }

  function rowHtml(d) {
    const ids = members.get(String(d.id));
    const count = ids ? ids.length : null;
    if (editingId === String(d.id)) {
      return `
        <tr data-id="${d.id}" style="background:#f8fafc;">
          <td colspan="3">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input class="org-in" data-f="name" value="${escapeHtml(d.name)}" placeholder="部署名" style="width:200px;">
              <input class="org-in" data-f="code" value="${escapeHtml(d.code || '')}" placeholder="コード（任意）" style="width:120px;">
              <select class="org-in" data-f="corp">${corpOptions(d.corporation_id, { blank: '法人を選択' })}</select>
              <button type="button" class="org-btn primary" data-act="save" data-id="${d.id}">保存</button>
              <button type="button" class="org-btn" data-act="cancel">キャンセル</button>
              ${d.is_active ? `<button type="button" class="org-btn danger" data-act="deactivate" data-id="${d.id}" style="margin-left:auto;">この部署を無効化</button>` : ''}
            </div>
            <div class="org-note" style="margin:6px 0 0;">名前を変えても、過去の勤怠・給与には当時の名前が残ります。</div>
          </td>
        </tr>`;
    }
    const isOpen = openId === String(d.id);
    const list = isOpen ? (ids || []).map(id => usersById.get(id)).filter(Boolean) : [];
    return `
      <tr data-id="${d.id}">
        <td>
          <span style="font-weight:600;${d.is_active ? '' : 'color:#94a3b8;'}">${escapeHtml(d.name)}</span>
          ${d.code ? `<span class="org-muted" style="font-size:11px;margin-left:6px;">${escapeHtml(d.code)}</span>` : ''}
          ${d.is_active ? '' : ' <span class="org-tag off">無効</span>'}
        </td>
        <td style="width:120px;">
          ${count == null ? '<span class="org-muted">-</span>'
            : `<button type="button" class="org-btn link" data-act="members" data-id="${d.id}">${count}名 ${isOpen ? '▾' : '▸'}</button>`}
        </td>
        <td style="width:90px;text-align:right;"><button type="button" class="org-btn" data-act="edit" data-id="${d.id}">編集</button></td>
      </tr>
      ${isOpen ? `
      <tr><td colspan="3" style="background:#f8fafc;padding:8px 14px 12px 28px;">
        ${list.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${list.map(u => `<span style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:2px 10px;font-size:12px;">${escapeHtml(userLabel(u))}</span>`).join('')}</div>`
          : '<span class="org-muted" style="font-size:12px;">所属している社員はいません</span>'}
      </td></tr>` : ''}`;
  }

  // 社員情報の部署と、異動履歴から見た今日の部署が食い違っている社員（表示だけ。自動では直さない）
  function mismatches() {
    // 今日の正式な所属（応援は除く）。正式な異動の記録が今日にかかっていない社員は比べない
    const t = todayStr();
    const resolved = new Map();
    for (const a of assignments) {
      const s0 = String(a.start_date).slice(0, 10), e0 = a.end_date ? String(a.end_date).slice(0, 10) : '';
      if (a.assignment_type === 'regular' && s0 <= t && (!e0 || e0 >= t)) resolved.set(String(a.user_id), String(a.department_id));
    }
    const deptName = (id) => (id == null || id === '' ? '未設定' : (departments.find(d => String(d.id) === String(id))?.name || `部署${id}`));
    const out = [];
    for (const [id, u] of usersById) {
      const st = String(u.employment_status || 'active').toLowerCase();
      if (st !== 'active') continue;
      const master = u.departmentId == null ? '' : String(u.departmentId);
      if (!resolved.has(id)) continue;
      const hist = resolved.get(id);
      if (master !== hist) out.push({ u, master: deptName(master), hist: deptName(hist) });
    }
    return out;
  }

  function render() {
    const visible = departments.filter(d => showInactive || d.is_active);
    const groups = [];
    for (const c of corporations) {
      const rows = visible.filter(d => String(d.corporation_id) === String(c.id));
      if (rows.length || c.is_active) groups.push({ corp: c, rows });
    }
    const orphan = visible.filter(d => !corporations.some(c => String(c.id) === String(d.corporation_id)));
    if (orphan.length) groups.push({ corp: null, rows: orphan });

    const inactiveCount = departments.filter(d => !d.is_active).length;

    root.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <button type="button" class="org-btn primary" data-act="add">＋ 部署を追加</button>
        ${inactiveCount ? `<label style="font-size:12px;color:#64748b;margin-left:8px;cursor:pointer;"><input type="checkbox" data-act="inactive" ${showInactive ? 'checked' : ''}> 無効の部署も表示（${inactiveCount}）</label>` : ''}
        <span style="margin-left:auto;display:flex;gap:10px;align-items:center;">
          ${asOf ? `<span class="org-muted" style="font-size:12px;">人数は ${escapeHtml(asOf.replace(/-/g, '/'))} 時点</span>` : ''}
          ${onManageCorporations ? '<button type="button" class="org-btn" data-act="corp">法人を管理</button>' : ''}
        </span>
      </div>
      ${(() => {
        const mm = mismatches();
        if (!mm.length) return '';
        return `
        <details class="org-more" style="border-color:#fcd34d;background:#fffbeb;">
          <summary style="color:#92400e;">部署が一致していない社員が ${mm.length}名 います<span class="org-sub">社員情報の部署と、異動の履歴が食い違っています（自動では直しません）</span></summary>
          <table class="org-table" style="background:#fff;">
            <thead><tr><th>社員</th><th>社員情報の部署</th><th>異動履歴の部署（${escapeHtml((asOf || '').replace(/-/g, '/'))}）</th></tr></thead>
            <tbody>${mm.map(x => `<tr><td>${escapeHtml(userLabel(x.u))}</td><td>${escapeHtml(x.master)}</td><td>${escapeHtml(x.hist)}</td></tr>`).join('')}</tbody>
          </table>
          <div class="org-note" style="padding:8px 14px 0;">どちらが正しいか確認してください。修正方法はシステム担当にご相談ください。</div>
        </details>`;
      })()}
      ${adding ? `
      <form class="org-card" data-form="add" style="padding:12px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input class="org-in" name="name" placeholder="部署名（例: 総務部）" style="width:220px;" required>
        <select class="org-in" name="corp">${corpOptions(corporations.length === 1 ? corporations[0].id : null, { blank: '法人を選択' })}</select>
        <button type="submit" class="org-btn primary">追加</button>
        <button type="button" class="org-btn" data-act="add-cancel">キャンセル</button>
      </form>` : ''}
      ${groups.map(g => `
        <div class="org-card">
          <div class="org-card-h">
            <h4>${g.corp ? escapeHtml(g.corp.name) : '法人が未設定の部署'}</h4>
            ${g.corp && !g.corp.is_active ? '<span class="org-tag off">無効</span>' : ''}
            <span class="org-sub">部署 ${g.rows.length}</span>
          </div>
          <table class="org-table"><tbody>
            ${g.rows.map(rowHtml).join('') || '<tr><td class="org-muted" style="font-size:12px;">部署がありません</td></tr>'}
          </tbody></table>
        </div>
      `).join('') || '<div class="org-muted" style="padding:20px;text-align:center;">まず「法人を管理」から法人を登録してください</div>'}
    `;
    if (adding) root.querySelector('[data-form="add"] input[name="name"]')?.focus();
  }

  async function reload() { await load(); render(); }

  const disposeClick = delegate(root, '[data-act]', 'click', async (e, el) => {
    const act = el.dataset.act;
    const id = el.dataset.id;
    if (act === 'inactive') { showInactive = el.checked; render(); return; }
    if (act === 'corp') { if (onManageCorporations) onManageCorporations(); return; }
    if (act === 'add') { adding = true; render(); return; }
    if (act === 'add-cancel') { adding = false; render(); return; }
    if (act === 'members') { openId = openId === id ? null : id; render(); return; }
    if (act === 'edit') { editingId = id; openId = null; render(); return; }
    if (act === 'cancel') { editingId = null; render(); return; }
    if (act === 'save') {
      const row = root.querySelector(`tr[data-id="${id}"]`);
      const name = row.querySelector('[data-f="name"]').value.trim();
      const code = row.querySelector('[data-f="code"]').value.trim() || null;
      const corporationId = row.querySelector('[data-f="corp"]').value || null;
      if (!name) { alert('部署名を入力してください'); return; }
      try {
        await updateDepartment(id, { name, code, corporationId });
        editingId = null;
        toast('保存しました');
        await reload();
      } catch (err) { alert(`保存に失敗しました: ${err.message}`); }
      return;
    }
    if (act === 'deactivate') {
      if (!confirm('この部署を無効化しますか？\n（削除ではありません。過去の勤怠・異動の記録はそのまま残ります）')) return;
      try {
        await deactivateDepartment(id);
        editingId = null;
        toast('無効化しました');
        await reload();
      } catch (err) { alert(`無効化に失敗しました: ${err.message}`); }
    }
  });

  const onSubmit = async (e) => {
    const form = e.target.closest('form[data-form="add"]');
    if (!form) return;
    e.preventDefault();
    const name = form.name.value.trim();
    const corporationId = form.corp.value || null;
    if (!name) return;
    if (!corporationId && corporations.length) { alert('法人を選択してください'); return; }
    try {
      await createDepartment({ name, corporationId });
      adding = false;
      toast('部署を追加しました');
      await reload();
    } catch (err) { alert(`追加に失敗しました: ${err.message}`); }
  };
  root.addEventListener('submit', onSubmit);

  await reload();
  return () => {
    if (typeof disposeClick === 'function') disposeClick();
    root.removeEventListener('submit', onSubmit);
  };
}
