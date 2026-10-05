import { mount as mountDepartmentsList } from './departments-list.page.js?v=20261005-org1';
import { mount as mountCorporations } from './corporations.page.js?v=20261005-org1';
import { mount as mountDepartmentReport } from './department-report.page.js?v=20261005-org1';

// 「部署」タブ: 部署一覧が主役。法人の管理と過去の月の人数は、必要なときだけ開く
export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  // 各部品は別々の要素に mount する（同じ要素だと data-action のクリック処理がぶつかるため）
  root.innerHTML = `
    <div class="org-body">
      <div id="orgCorpWrap" class="org-card" hidden>
        <div class="org-card-h">
          <h4>法人の管理</h4>
          <span class="org-sub">部署は必ずどれか1つの法人に属します</span>
          <span class="org-right"><button type="button" class="org-btn" id="orgCorpClose">閉じる</button></span>
        </div>
        <div id="orgCorpPanel"></div>
      </div>
      <div id="orgDeptList"></div>
      <details class="org-more" id="orgReport">
        <summary>過去の月の人数を見る<span class="org-sub">その月の末日時点の所属人数（異動の前後を確認するとき）</span></summary>
        <div class="org-more-body" id="orgReportBody"></div>
      </details>
    </div>
  `;

  const listEl = root.querySelector('#orgDeptList');
  const corpWrap = root.querySelector('#orgCorpWrap');
  const corpPanel = root.querySelector('#orgCorpPanel');
  const reportEl = root.querySelector('#orgReport');
  const disposers = {};

  function dispose(key) {
    if (typeof disposers[key] === 'function') { try { disposers[key](); } catch { /* ignore */ } }
    disposers[key] = null;
  }

  async function mountList() {
    dispose('list');
    disposers.list = await mountDepartmentsList({ content: listEl, onManageCorporations: openCorp });
  }

  async function openCorp() {
    if (!corpWrap.hidden) return;
    corpWrap.hidden = false;
    disposers.corp = await mountCorporations({ content: corpPanel });
    corpWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.querySelector('#orgCorpClose').addEventListener('click', async () => {
    corpWrap.hidden = true;
    dispose('corp');
    corpPanel.innerHTML = '';
    await mountList();   // 法人名を変えたかもしれないので部署一覧を読み直す
  });

  reportEl.addEventListener('toggle', async () => {
    if (reportEl.open && !disposers.report) {
      disposers.report = (await mountDepartmentReport({ content: root.querySelector('#orgReportBody') })) || (() => {});
    }
  });

  await mountList();

  return () => { Object.keys(disposers).forEach(dispose); };
}
