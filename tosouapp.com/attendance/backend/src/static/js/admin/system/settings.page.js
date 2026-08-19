import { fetchJSONAuth } from '../../api/http.api.js';

export async function mount(options = {}) {
  const host = (options && options.content) || document.querySelector('#adminContent');
  if (!host) return;

  host.innerHTML = `
    <div class="settings-root">
      <h2 class="settings-title">システム設定</h2>

      <!-- ═══ セキュリティ ═══ -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">🔒</span>
          <div>
            <h3 class="settings-card-title">パスワードポリシー</h3>
            <p class="settings-card-desc">全ユーザーに適用されるパスワード要件を設定します。</p>
          </div>
        </div>
        <form id="formPasswordPolicy" class="settings-form">
          <div class="settings-form-row">
            <label class="settings-label" for="pwMinLength">最小文字数</label>
            <input id="pwMinLength" type="number" min="4" max="128" value="8" class="settings-input settings-input-sm" />
          </div>
          <div class="settings-form-row">
            <label class="settings-label">複雑さ要件</label>
            <div class="settings-checkbox-group">
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireUpper" checked /> 大文字を含む (A-Z)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireLower" checked /> 小文字を含む (a-z)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireDigit" checked /> 数字を含む (0-9)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireSymbol" /> 記号を含む (!@#$...)</label>
            </div>
          </div>
          <div class="settings-form-row">
            <label class="settings-label" for="pwExpiryDays">有効期限（日数、0=無期限）</label>
            <input id="pwExpiryDays" type="number" min="0" max="365" value="0" class="settings-input settings-input-sm" />
          </div>
          <div class="settings-form-actions">
            <button type="submit" class="btn-primary">保存</button>
            <span id="pwPolicyResult" class="settings-result"></span>
          </div>
        </form>
      </div>

      <!-- ═══ 2FA トグル ═══ -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">🔐</span>
          <div>
            <h3 class="settings-card-title">二要素認証 (2FA / パスキー)</h3>
            <p class="settings-card-desc">パスキーを使った2FA認証を管理します。全社強制ON/OFFの切り替えもできます。</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">全ユーザーに2FAを強制する</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle2FA" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggle2FAStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div id="passkeyStatus" class="settings-status-box">読み込み中...</div>
        <div id="passkeyActions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button id="btnRegisterPasskey" type="button" class="btn-primary">+ パスキーを登録</button>
        </div>
        <div id="passkeyList" style="margin-top:16px;"></div>
      </div>

      <!-- ═══ メール送信テスト ═══ -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">📧</span>
          <div>
            <h3 class="settings-card-title">メール送信テスト</h3>
            <p class="settings-card-desc">メール設定が正しく動作しているか確認します。自分のアドレスにテストメールを送信します。</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="btnTestMail" type="button" class="btn-accent">テストメールを送信</button>
          <span id="testMailResult" class="settings-result"></span>
        </div>
      </div>

      <!-- ═══ メンテナンスモード ═══ -->
      <div class="settings-card settings-card--warn" id="cardMaintenance">
        <div class="settings-card-header">
          <span class="settings-card-icon">🚧</span>
          <div>
            <h3 class="settings-card-title">メンテナンスモード</h3>
            <p class="settings-card-desc">ONにすると給与明細アップロード/ダウンロード等が一時停止します。緊急メンテナンス時に使用してください。</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">メンテナンスモード</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleMaintenance" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleMaintenanceStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">スーパー管理者以外ログイン禁止</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleLockLogin" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleLockLoginStatus" class="settings-toggle-status">OFF</span>
        </div>
      </div>

      <!-- ═══ GPS要件 ═══ -->
      <div class="settings-card" id="cardGPS">
        <div class="settings-card-header">
          <span class="settings-card-icon">📍</span>
          <div>
            <h3 class="settings-card-title">GPS要件</h3>
            <p class="settings-card-desc">出退勤時の位置情報取得の要件を設定します。</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">GPS位置情報を必須にする</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleGPS" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleGPSStatus" class="settings-toggle-status">ON</span>
        </div>
        <div class="settings-form-row" style="margin-top:12px;">
          <label class="settings-label" for="inputMinAccuracy">最小精度（メートル）</label>
          <input id="inputMinAccuracy" type="number" min="10" max="5000" value="100" class="settings-input settings-input-sm" />
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="inputCountryWhitelist">許可国コード（カンマ区切り、空欄=制限なし）</label>
          <input id="inputCountryWhitelist" type="text" placeholder="JP,VN,US" class="settings-input" />
        </div>
      </div>

      <!-- ═══ リモートポリシー ═══ -->
      <div class="settings-card" id="cardRemote">
        <div class="settings-card-header">
          <span class="settings-card-icon">🏠</span>
          <div>
            <h3 class="settings-card-title">リモートワークポリシー</h3>
            <p class="settings-card-desc">在宅勤務・リモート打刻のルールを設定します。</p>
          </div>
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="selectRemotePolicy">リモートポリシー</label>
          <select id="selectRemotePolicy" class="settings-input">
            <option value="anywhere">どこからでも打刻可 (anywhere)</option>
            <option value="office_only">オフィスのみ (office_only)</option>
            <option value="hybrid">ハイブリッド (hybrid)</option>
          </select>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">リモート打刻時にメモ入力を必須にする</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleNoteOnRemote" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleNoteOnRemoteStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="inputMaxDevices">最大デバイス数/ユーザー</label>
          <input id="inputMaxDevices" type="number" min="1" max="20" value="5" class="settings-input settings-input-sm" />
        </div>
      </div>

      <!-- ═══ フラグ保存ボタン ═══ -->
      <div class="settings-card" style="background:#f8fafc;border:1px dashed #cbd5e1;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="btnSaveFlags" type="button" class="btn-primary btn-lg">フラグ設定を保存</button>
          <span id="flagsResult" class="settings-result"></span>
        </div>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">メンテナンスモード・GPS要件・リモートポリシーの変更を一括保存します。</p>
      </div>

      <!-- ═══ シフト提出リマインダー ═══ -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">📅</span>
          <div>
            <h3 class="settings-card-title">シフト提出リマインダー</h3>
            <p class="settings-card-desc">
              本番では毎月<strong>15日・25日・月末</strong>の15:00 (JST) に自動送信されます。<br>
              手動送信する場合は、対象月を選んで「対象者を読み込む」を押してから送信対象を選んでください。
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <label class="settings-label" style="margin-bottom:0;">対象月:</label>
          <input id="reminderMonth" type="month" class="settings-input settings-input-sm" />
          <button id="btnLoadEmployees" type="button" class="btn-secondary">対象者を読み込む</button>
        </div>
        <div id="reminderEmployeeList" style="display:none;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <label class="settings-label" style="margin-bottom:0;" id="reminderCountLabel"></label>
            <label class="settings-checkbox" style="font-size:12px;">
              <input type="checkbox" id="chkSelectAll">全選択 / 全解除
            </label>
          </div>
          <div class="settings-table-wrap">
            <table id="reminderTable" class="settings-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;"></th>
                  <th>氏名</th>
                  <th>メール</th>
                  <th>種別</th>
                </tr>
              </thead>
              <tbody id="reminderTableBody"></tbody>
            </table>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="btnSendSelected" type="button" class="btn-danger">選択した人に送信</button>
            <span id="reminderSendStatus" class="settings-result"></span>
          </div>
        </div>
        <div id="reminderResult" style="margin-top:8px;font-size:13px;"></div>
      </div>
    </div>

    <style>
      .settings-root {
        padding: 24px;
        max-width: 860px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .settings-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.3px;
      }
      .settings-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px 24px;
        transition: box-shadow .15s;
      }
      .settings-card:hover {
        box-shadow: 0 2px 12px rgba(0,0,0,.04);
      }
      .settings-card--warn {
        border-left: 4px solid #f59e0b;
      }
      .settings-card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
      }
      .settings-card-icon {
        font-size: 22px;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .settings-card-title {
        margin: 0 0 4px;
        font-size: 15px;
        font-weight: 700;
        color: #1e293b;
      }
      .settings-card-desc {
        margin: 0;
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
      }
      .settings-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .settings-form-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .settings-label {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 2px;
      }
      .settings-input {
        height: 36px;
        padding: 0 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        color: #1e293b;
        background: #fff;
        transition: border-color .15s;
        max-width: 320px;
      }
      .settings-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37,99,235,.1);
      }
      .settings-input-sm {
        max-width: 160px;
      }
      .settings-checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .settings-checkbox {
        font-size: 13px;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .settings-checkbox input[type="checkbox"] {
        width: 15px;
        height: 15px;
        cursor: pointer;
        accent-color: #2563eb;
      }
      .settings-form-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 4px;
      }
      .settings-result {
        font-size: 13px;
        min-height: 18px;
      }
      .settings-result--ok { color: #16a34a; }
      .settings-result--err { color: #dc2626; }
      .settings-toggle-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
      }
      .settings-toggle-label {
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        flex: 1;
      }
      .settings-toggle-status {
        font-size: 12px;
        font-weight: 700;
        min-width: 32px;
      }
      .settings-status-box {
        padding: 12px;
        border-radius: 8px;
        background: #f8fafc;
        font-size: 13px;
        margin-top: 12px;
      }
      /* Toggle switch */
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background: #cbd5e1;
        border-radius: 24px;
        transition: background .2s;
      }
      .toggle-slider::before {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        left: 3px;
        bottom: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform .2s;
        box-shadow: 0 1px 3px rgba(0,0,0,.15);
      }
      .toggle-switch input:checked + .toggle-slider {
        background: #2563eb;
      }
      .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(20px);
      }
      /* Buttons */
      .btn-primary {
        height: 36px;
        padding: 0 20px;
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
      }
      .btn-primary:hover { background: #1d4ed8; }
      .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
      .btn-primary.btn-lg {
        height: 40px;
        padding: 0 28px;
        font-size: 14px;
      }
      .btn-accent {
        height: 36px;
        padding: 0 20px;
        background: #0891b2;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
      }
      .btn-accent:hover { background: #0e7490; }
      .btn-accent:disabled { opacity: .5; cursor: not-allowed; }
      .btn-secondary {
        height: 36px;
        padding: 0 18px;
        background: #64748b;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
      }
      .btn-secondary:hover { background: #475569; }
      .btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
      .btn-danger {
        height: 36px;
        padding: 0 20px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
      }
      .btn-danger:hover { background: #b91c1c; }
      .btn-danger:disabled { opacity: .5; cursor: not-allowed; }
      /* Table */
      .settings-table-wrap {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .settings-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .settings-table thead tr {
        background: #f8fafc;
        position: sticky;
        top: 0;
      }
      .settings-table th {
        padding: 8px 10px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
      }
      .settings-table td {
        padding: 6px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      /* Dark mode overrides */
      @media (prefers-color-scheme: dark) {
        .settings-root { color: #e2e8f0; }
        .settings-title { color: #f1f5f9; }
        .settings-card { background: #1e293b; border-color: #334155; }
        .settings-card--warn { border-left-color: #f59e0b; }
        .settings-card-title { color: #f1f5f9; }
        .settings-card-desc { color: #94a3b8; }
        .settings-label { color: #cbd5e1; }
        .settings-input { background: #0f172a; border-color: #475569; color: #f1f5f9; }
        .settings-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,.15); }
        .settings-checkbox { color: #cbd5e1; }
        .settings-toggle-label { color: #cbd5e1; }
        .settings-status-box { background: #0f172a; color: #cbd5e1; }
        .settings-table thead tr { background: #0f172a; }
        .settings-table th { color: #94a3b8; border-color: #334155; }
        .settings-table td { border-color: #1e293b; color: #cbd5e1; }
        .settings-table-wrap { border-color: #334155; }
      }
      body.dark .settings-root { color: #e2e8f0; }
      body.dark .settings-title { color: #f1f5f9; }
      body.dark .settings-card { background: #1e293b; border-color: #334155; }
      body.dark .settings-card--warn { border-left-color: #f59e0b; }
      body.dark .settings-card-title { color: #f1f5f9; }
      body.dark .settings-card-desc { color: #94a3b8; }
      body.dark .settings-label { color: #cbd5e1; }
      body.dark .settings-input { background: #0f172a; border-color: #475569; color: #f1f5f9; }
      body.dark .settings-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,.15); }
      body.dark .settings-checkbox { color: #cbd5e1; }
      body.dark .settings-toggle-label { color: #cbd5e1; }
      body.dark .settings-status-box { background: #0f172a; color: #cbd5e1; }
      body.dark .settings-table thead tr { background: #0f172a; }
      body.dark .settings-table th { color: #94a3b8; border-color: #334155; }
      body.dark .settings-table td { border-color: #1e293b; color: #cbd5e1; }
      body.dark .settings-table-wrap { border-color: #334155; }

      @media (max-width: 640px) {
        .settings-root { padding: 16px; gap: 16px; }
        .settings-card { padding: 16px; }
        .settings-toggle-row { flex-wrap: wrap; }
      }
    </style>
  `;

  // ═══ Helper: toggle status text ═══
  function syncToggleStatus(checkbox, statusEl) {
    const on = checkbox.checked;
    statusEl.textContent = on ? 'ON' : 'OFF';
    statusEl.style.color = on ? '#16a34a' : '#94a3b8';
  }

  // Wire all toggles
  const togglePairs = [
    ['toggle2FA', 'toggle2FAStatus'],
    ['toggleMaintenance', 'toggleMaintenanceStatus'],
    ['toggleLockLogin', 'toggleLockLoginStatus'],
    ['toggleGPS', 'toggleGPSStatus'],
    ['toggleNoteOnRemote', 'toggleNoteOnRemoteStatus'],
  ];
  togglePairs.forEach(([cbId, statusId]) => {
    const cb = document.getElementById(cbId);
    const st = document.getElementById(statusId);
    if (cb && st) {
      syncToggleStatus(cb, st);
      cb.addEventListener('change', () => syncToggleStatus(cb, st));
    }
  });

  // ═══ Load flags from API ═══
  async function loadFlags() {
    try {
      const flags = await fetchJSONAuth('/api/admin/system/flags');
      if (flags) {
        document.getElementById('toggleMaintenance').checked = !!flags.maintenanceMode;
        document.getElementById('toggleLockLogin').checked = !!flags.lockLoginExceptSuper;
        document.getElementById('toggleGPS').checked = flags.requireGPS !== false;
        document.getElementById('inputMinAccuracy').value = flags.minAccuracyMeters || 100;
        document.getElementById('selectRemotePolicy').value = flags.remotePolicy || 'anywhere';
        document.getElementById('toggleNoteOnRemote').checked = !!flags.requireNoteOnRemote;
        document.getElementById('inputCountryWhitelist').value = flags.countryWhitelist || '';
        document.getElementById('inputMaxDevices').value = flags.maxDevicesPerUser || 5;
        // Re-sync status labels
        togglePairs.forEach(([cbId, statusId]) => {
          const cb = document.getElementById(cbId);
          const st = document.getElementById(statusId);
          if (cb && st) syncToggleStatus(cb, st);
        });
      }
    } catch (e) { /* silently ignored - defaults will show */ }
  }

  // ═══ Save flags ═══
  document.getElementById('btnSaveFlags')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveFlags');
    const resultEl = document.getElementById('flagsResult');
    btn.disabled = true;
    btn.textContent = '保存中...';
    resultEl.textContent = '';
    resultEl.className = 'settings-result';
    try {
      const payload = {
        maintenanceMode: String(document.getElementById('toggleMaintenance').checked),
        lockLoginExceptSuper: String(document.getElementById('toggleLockLogin').checked),
        requireGPS: String(document.getElementById('toggleGPS').checked),
        minAccuracyMeters: Number(document.getElementById('inputMinAccuracy').value) || 100,
        remotePolicy: document.getElementById('selectRemotePolicy').value || 'anywhere',
        requireNoteOnRemote: String(document.getElementById('toggleNoteOnRemote').checked),
        countryWhitelist: document.getElementById('inputCountryWhitelist').value.trim(),
        maxDevicesPerUser: Number(document.getElementById('inputMaxDevices').value) || 5,
      };
      const res = await fetchJSONAuth('/api/admin/system/flags', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.ok) {
        resultEl.textContent = '✅ 保存しました';
        resultEl.className = 'settings-result settings-result--ok';
      } else {
        throw new Error(res?.error || '保存に失敗しました');
      }
    } catch (e) {
      resultEl.textContent = '❌ ' + (e.message || '保存に失敗しました');
      resultEl.className = 'settings-result settings-result--err';
    } finally {
      btn.disabled = false;
      btn.textContent = 'フラグ設定を保存';
    }
  });

  // ═══ Password Policy Form ═══
  document.getElementById('formPasswordPolicy')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const resultEl = document.getElementById('pwPolicyResult');
    btn.disabled = true;
    btn.textContent = '保存中...';
    resultEl.textContent = '';
    resultEl.className = 'settings-result';
    try {
      const payload = {
        minLength: Number(document.getElementById('pwMinLength').value) || 8,
        requireUpper: document.getElementById('pwRequireUpper').checked,
        requireLower: document.getElementById('pwRequireLower').checked,
        requireDigit: document.getElementById('pwRequireDigit').checked,
        requireSymbol: document.getElementById('pwRequireSymbol').checked,
        expiryDays: Number(document.getElementById('pwExpiryDays').value) || 0,
      };
      const res = await fetchJSONAuth('/api/admin/settings/password-policy', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && (res.ok || res.success)) {
        resultEl.textContent = '✅ パスワードポリシーを保存しました';
        resultEl.className = 'settings-result settings-result--ok';
      } else {
        throw new Error(res?.error || res?.message || '保存に失敗しました');
      }
    } catch (e) {
      resultEl.textContent = '❌ ' + (e.message || '保存に失敗しました');
      resultEl.className = 'settings-result settings-result--err';
    } finally {
      btn.disabled = false;
      btn.textContent = '保存';
    }
  });

  // ═══ Load password policy ═══
  async function loadPasswordPolicy() {
    try {
      const res = await fetchJSONAuth('/api/admin/settings/password-policy');
      if (res) {
        if (res.minLength) document.getElementById('pwMinLength').value = res.minLength;
        if (res.requireUpper != null) document.getElementById('pwRequireUpper').checked = !!res.requireUpper;
        if (res.requireLower != null) document.getElementById('pwRequireLower').checked = !!res.requireLower;
        if (res.requireDigit != null) document.getElementById('pwRequireDigit').checked = !!res.requireDigit;
        if (res.requireSymbol != null) document.getElementById('pwRequireSymbol').checked = !!res.requireSymbol;
        if (res.expiryDays != null) document.getElementById('pwExpiryDays').value = res.expiryDays;
      }
    } catch (e) { /* use defaults */ }
  }

  // ═══ 2FA Toggle ═══
  document.getElementById('toggle2FA')?.addEventListener('change', async (e) => {
    const on = e.target.checked;
    const statusEl = document.getElementById('toggle2FAStatus');
    syncToggleStatus(e.target, statusEl);
    try {
      await fetchJSONAuth('/api/admin/settings/2fa-policy', {
        method: 'POST',
        body: JSON.stringify({ enforced: on })
      });
    } catch (err) {
      // Revert on failure
      e.target.checked = !on;
      syncToggleStatus(e.target, statusEl);
      alert('2FA設定の更新に失敗しました: ' + (err.message || ''));
    }
  });

  // ═══ Load 2FA policy ═══
  async function load2FAPolicy() {
    try {
      const res = await fetchJSONAuth('/api/admin/settings/2fa-policy');
      if (res) {
        const cb = document.getElementById('toggle2FA');
        cb.checked = !!res.enforced;
        syncToggleStatus(cb, document.getElementById('toggle2FAStatus'));
      }
    } catch (e) { /* default off */ }
  }

  // ═══ Passkey management ═══
  const statusEl = document.getElementById('passkeyStatus');
  const listEl = document.getElementById('passkeyList');

  async function loadPasskeys() {
    try {
      const res = await fetchJSONAuth('/api/webauthn/passkeys');
      const passkeys = res?.data || res || [];
      if (!Array.isArray(passkeys) || passkeys.length === 0) {
        statusEl.innerHTML = `
          <span style="color:#64748b;">パスキー未登録</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:#94a3b8;">登録すると次回ログイン時から2FA認証が有効になります。</span>
        `;
        statusEl.style.background = '#f8fafc';
        listEl.innerHTML = '';
      } else {
        statusEl.innerHTML = `
          <span style="color:#166534;font-weight:600;">✓ 2FA有効</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:#475569;">${passkeys.length}個のパスキーが登録されています。</span>
        `;
        statusEl.style.background = '#f0fdf4';
        listEl.innerHTML = passkeys.map((p, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;font-size:13px;">
            <span>🔑 パスキー ${i + 1} <span style="color:#64748b;font-size:11px;">(登録: ${new Date(p.created_at).toLocaleDateString('ja-JP')})</span></span>
          </div>
        `).join('');
      }
    } catch (e) {
      statusEl.innerHTML = `<span style="color:#64748b;">パスキー情報を取得できませんでした。</span>`;
    }
  }

  // Register passkey
  document.getElementById('btnRegisterPasskey')?.addEventListener('click', async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      const email = user.email;
      if (!email) { alert('メールアドレスが取得できません。再ログインしてください。'); return; }
      const optionsRes = await fetchJSONAuth('/api/webauthn/register/options', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (!window.SimpleWebAuthnBrowser) {
        const script = document.createElement('script');
        script.src = '/static/js/vendor/simplewebauthn-browser.min.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('SimpleWebAuthn library load failed'));
          document.head.appendChild(script);
        });
      }
      if (!window.SimpleWebAuthnBrowser?.startRegistration) {
        throw new Error('SimpleWebAuthn library not available');
      }
      let attResp;
      try {
        attResp = await SimpleWebAuthnBrowser.startRegistration(optionsRes);
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          alert('認証がキャンセルされました。');
          return;
        }
        throw err;
      }
      await fetchJSONAuth('/api/webauthn/register/verify', {
        method: 'POST',
        body: JSON.stringify({ email, response: attResp })
      });
      alert('✅ パスキーが正常に登録されました！\n次回ログイン時から2FA認証が有効になります。');
      await loadPasskeys();
    } catch (e) {
      alert('❌ パスキー登録に失敗しました: ' + (e.message || e));
    }
  });

  // ═══ Test Mail button ═══
  document.getElementById('btnTestMail')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnTestMail');
    const resultEl = document.getElementById('testMailResult');
    btn.disabled = true;
    btn.textContent = '送信中...';
    resultEl.textContent = '';
    resultEl.className = 'settings-result';
    try {
      const res = await fetchJSONAuth('/api/test-mail');
      if (res.ok) {
        resultEl.textContent = `✅ 送信成功！ (${res.message || ''})`;
        resultEl.className = 'settings-result settings-result--ok';
      } else {
        resultEl.textContent = `❌ エラー: ${res.error || JSON.stringify(res)}`;
        resultEl.className = 'settings-result settings-result--err';
      }
    } catch (e) {
      resultEl.textContent = `❌ ${e.message || '送信失敗'}`;
      resultEl.className = 'settings-result settings-result--err';
    } finally {
      btn.disabled = false;
      btn.textContent = 'テストメールを送信';
    }
  });

  // ═══ Shift Reminder ═══
  const monthInput = document.getElementById('reminderMonth');
  if (monthInput) {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const next = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth() + 1, 1));
    monthInput.value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  let loadedEmployees = [];

  function updateCountLabel() {
    const checked = document.querySelectorAll('.reminder-chk:checked').length;
    const total = loadedEmployees.length;
    const el = document.getElementById('reminderCountLabel');
    if (el) el.textContent = `${total}名中 ${checked}名 選択中`;
  }

  function renderEmployeeTable(employees) {
    const tbody = document.getElementById('reminderTableBody');
    if (!tbody) return;
    tbody.innerHTML = employees.map(u => {
      const type = (u.employment_type === 'full_time' || u.employment_type === '正社員') ? '正社員' : 'バイト';
      const uid = u.userId ?? u.id;
      return `<tr>
        <td style="text-align:center;">
          <input type="checkbox" class="reminder-chk" data-id="${uid}" checked style="cursor:pointer;width:14px;height:14px;accent-color:#2563eb;">
        </td>
        <td>${u.username || '-'}</td>
        <td style="color:#64748b;">${u.email || '-'}</td>
        <td>${type}</td>
      </tr>`;
    }).join('');
    document.querySelectorAll('.reminder-chk').forEach(cb => {
      cb.addEventListener('change', updateCountLabel);
    });
    updateCountLabel();
  }

  document.getElementById('btnLoadEmployees')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnLoadEmployees');
    const month = document.getElementById('reminderMonth')?.value;
    if (!month) { alert('対象月を選択してください'); return; }
    btn.disabled = true;
    btn.textContent = '読み込み中...';
    document.getElementById('reminderResult').innerHTML = '';
    try {
      const res = await fetchJSONAuth(`/api/admin/test/shift-reminder?dry_run=true&month=${encodeURIComponent(month)}`, { method: 'POST' });
      if (!res.ok) throw new Error(res.error || 'Failed');
      loadedEmployees = (res.results || []).filter(r => r.email);
      if (loadedEmployees.length === 0) {
        document.getElementById('reminderResult').innerHTML = '<span style="color:#64748b;">対象者なし（全員提出済みか従業員がいません）</span>';
        document.getElementById('reminderEmployeeList').style.display = 'none';
      } else {
        renderEmployeeTable(loadedEmployees);
        document.getElementById('reminderEmployeeList').style.display = 'block';
        document.getElementById('chkSelectAll').checked = true;
      }
    } catch (e) {
      document.getElementById('reminderResult').innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '対象者を読み込む';
    }
  });

  document.getElementById('chkSelectAll')?.addEventListener('change', (e) => {
    document.querySelectorAll('.reminder-chk').forEach(cb => { cb.checked = e.target.checked; });
    updateCountLabel();
  });

  document.getElementById('btnSendSelected')?.addEventListener('click', async () => {
    const month = document.getElementById('reminderMonth')?.value;
    if (!month) { alert('対象月を選択してください'); return; }
    const selected = [...document.querySelectorAll('.reminder-chk:checked')].map(cb => Number(cb.dataset.id));
    if (selected.length === 0) { alert('送信する対象者を選択してください'); return; }
    if (!confirm(`${selected.length}名に${month}のシフト提出リマインダーを送信しますか？`)) return;

    const btn = document.getElementById('btnSendSelected');
    const sendStatus = document.getElementById('reminderSendStatus');
    btn.disabled = true;
    btn.textContent = '送信中...';
    sendStatus.textContent = '';
    document.getElementById('reminderResult').innerHTML = '';
    try {
      const tok = sessionStorage.getItem('accessToken') || '';
      const csrf = document.cookie.match(/(^| )csrfToken=([^;]+)/)?.[2] || '';
      const rawRes = await fetch('/api/admin/shift-reminder/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': tok ? `Bearer ${tok}` : '',
          'X-CSRF-Token': csrf
        },
        body: JSON.stringify({ month, userIds: selected })
      });
      const res = await rawRes.json().catch(() => ({}));
      if (rawRes.ok && res.ok) {
        (res.results || []).forEach(r => {
          const cb = document.querySelector(`.reminder-chk[data-id="${r.userId}"]`);
          if (cb) {
            const row = cb.closest('tr');
            if (row) {
              row.style.background = r.status === 'sent' ? '#f0fdf4' : '#fef2f2';
              const lastTd = row.querySelectorAll('td');
              if (lastTd[3]) lastTd[3].innerHTML = r.status === 'sent'
                ? `<span style="color:#16a34a;font-weight:600;">✅ 送信済</span>`
                : `<span style="color:#dc2626;">❌ エラー</span>`;
              cb.disabled = true;
            }
          }
        });
        sendStatus.textContent = `✅ 完了 — 成功: ${res.sent}件 / エラー: ${res.errors}件`;
        sendStatus.style.color = res.errors > 0 ? '#d97706' : '#16a34a';
      } else {
        const errMsg = res.error || res.message || `HTTP ${rawRes.status}`;
        throw new Error(errMsg);
      }
    } catch (e) {
      document.getElementById('reminderResult').innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '選択した人に送信';
    }
  });

  // ═══ Init: load all data ═══
  await Promise.all([loadPasskeys(), loadFlags(), loadPasswordPolicy(), load2FAPolicy()]);
}
