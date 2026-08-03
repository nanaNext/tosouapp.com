import { fetchJSONAuth } from '../../api/http.api.js';

export async function mount(options = {}) {
  const host = (options && options.content) || document.querySelector('#adminContent');
  if (!host) return;

  host.innerHTML = `
    <div style="padding:20px;max-width:800px;">
      <h2 style="margin:0 0 24px;font-size:18px;font-weight:700;">システム設定</h2>

      <!-- 2FA / Passkey Section -->
      <div class="settings-section" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
          🔐 二要素認証 (2FA / パスキー)
        </h3>
        <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
          パスキー（指紋認証・顔認証・セキュリティキー）を登録すると、ログイン時に追加の認証が必要になります。<br>
          管理者アカウントのセキュリティ強化に推奨します。
        </p>

        <div id="passkeyStatus" style="margin-bottom:16px;padding:12px;border-radius:6px;background:#f8fafc;font-size:13px;">
          読み込み中...
        </div>

        <div id="passkeyActions" style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="btnRegisterPasskey" type="button" style="height:36px;padding:0 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
            + パスキーを登録
          </button>
        </div>

        <div id="passkeyList" style="margin-top:16px;"></div>
      </div>

      <!-- Email Test Section -->
      <div class="settings-section" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;">📧 メール送信テスト</h3>
        <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
          メール設定が正しく動作しているか確認します。ボタンを押すと自分のメールアドレスにテストメールを送信します。
        </p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="btnTestMail" type="button" style="height:36px;padding:0 20px;background:#0891b2;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
            テストメールを送信
          </button>
          <span id="testMailResult" style="font-size:13px;"></span>
        </div>
      </div>

      <!-- Shift Reminder Test Section -->
      <div class="settings-section" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;">📅 シフト提出リマインダー</h3>
        <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
          本番では毎月<strong>15日・25日・月末</strong>の15:00 (JST) に自動送信されます。<br>
          手動送信する場合は、対象月を選んで「対象者を読み込む」を押してから送信対象を選んでください。
        </p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <label style="font-size:13px;color:#374151;">対象月:</label>
          <input id="reminderMonth" type="month" style="height:34px;padding:0 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" />
          <button id="btnLoadEmployees" type="button" style="height:36px;padding:0 18px;background:#64748b;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
            対象者を読み込む
          </button>
        </div>
        <div id="reminderEmployeeList" style="display:none;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <label style="font-size:13px;font-weight:600;color:#374151;" id="reminderCountLabel"></label>
            <label style="font-size:12px;color:#64748b;cursor:pointer;">
              <input type="checkbox" id="chkSelectAll" style="margin-right:4px;">全選択 / 全解除
            </label>
          </div>
          <div style="max-height:300px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;">
            <table id="reminderTable" style="font-size:12px;border-collapse:collapse;width:100%;">
              <thead>
                <tr style="background:#f8fafc;position:sticky;top:0;">
                  <th style="padding:6px 8px;text-align:center;width:36px;border-bottom:1px solid #e2e8f0;"></th>
                  <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">氏名</th>
                  <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">メール</th>
                  <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">種別</th>
                </tr>
              </thead>
              <tbody id="reminderTableBody"></tbody>
            </table>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="btnSendSelected" type="button" style="height:36px;padding:0 20px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
              選択した人に送信
            </button>
            <span id="reminderSendStatus" style="font-size:13px;"></span>
          </div>
        </div>
        <div id="reminderResult" style="margin-top:8px;font-size:13px;"></div>
      </div>

      <!-- Other Settings -->
      <div class="settings-section" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;">⚙️ 一般設定</h3>
        <p style="margin:0;font-size:13px;color:#64748b;">準備中です。</p>
      </div>
    </div>
  `;

  // Load passkey status
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

      // 1. Get registration options from server
      const optionsRes = await fetchJSONAuth('/api/webauthn/register/options', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      // 2. Use SimpleWebAuthn browser library (loaded from local)
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

      // 3. Verify with server
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

  // --- Test Mail button ---
  document.getElementById('btnTestMail')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnTestMail');
    const resultEl = document.getElementById('testMailResult');
    btn.disabled = true;
    btn.textContent = '送信中...';
    resultEl.textContent = '';
    resultEl.style.color = '';
    try {
      const res = await fetchJSONAuth('/api/test-mail');
      if (res.ok) {
        resultEl.textContent = `✅ 送信成功！ (${res.message || ''})`;
        resultEl.style.color = '#16a34a';
      } else {
        resultEl.textContent = `❌ エラー: ${res.error || JSON.stringify(res)}`;
        resultEl.style.color = '#dc2626';
      }
    } catch (e) {
      resultEl.textContent = `❌ ${e.message || '送信失敗'}`;
      resultEl.style.color = '#dc2626';
    } finally {
      btn.disabled = false;
      btn.textContent = 'テストメールを送信';
    }
  });

  // --- Set default target month (next month in JST) ---
  const monthInput = document.getElementById('reminderMonth');
  if (monthInput) {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const next = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth() + 1, 1));
    monthInput.value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // Store loaded employees
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
      const uid = u.userId ?? u.id;  // dry_run returns userId, fallback to id
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:5px 8px;text-align:center;">
          <input type="checkbox" class="reminder-chk" data-id="${uid}" checked style="cursor:pointer;width:14px;height:14px;">
        </td>
        <td style="padding:5px 8px;">${u.username || '-'}</td>
        <td style="padding:5px 8px;color:#64748b;">${u.email || '-'}</td>
        <td style="padding:5px 8px;">${type}</td>
      </tr>`;
    }).join('');

    // Attach change listeners for count update
    document.querySelectorAll('.reminder-chk').forEach(cb => {
      cb.addEventListener('change', updateCountLabel);
    });
    updateCountLabel();
  }

  // Load employees (dry run)
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

  // Select all / deselect all
  document.getElementById('chkSelectAll')?.addEventListener('change', (e) => {
    document.querySelectorAll('.reminder-chk').forEach(cb => { cb.checked = e.target.checked; });
    updateCountLabel();
  });

  // Send to selected
  document.getElementById('btnSendSelected')?.addEventListener('click', async () => {
    const month = document.getElementById('reminderMonth')?.value;
    if (!month) { alert('対象月を選択してください'); return; }
    const selected = [...document.querySelectorAll('.reminder-chk:checked')].map(cb => Number(cb.dataset.id));
    if (selected.length === 0) { alert('送信する対象者を選択してください'); return; }
    if (!confirm(`${selected.length}名に${month}のシフト提出リマインダーを送信しますか？`)) return;

    const btn = document.getElementById('btnSendSelected');
    const statusEl = document.getElementById('reminderSendStatus');
    btn.disabled = true;
    btn.textContent = '送信中...';
    statusEl.textContent = '';
    document.getElementById('reminderResult').innerHTML = '';
    try {
      // Use raw fetch to capture error body from 4xx responses
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
        // Update row status in table
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
        statusEl.textContent = `✅ 完了 — 成功: ${res.sent}件 / エラー: ${res.errors}件`;
        statusEl.style.color = res.errors > 0 ? '#d97706' : '#16a34a';
      } else {
        const errMsg = res.error || res.message || `HTTP ${rawRes.status}`;
        const debugInfo = res.received ? ` (received: month=${res.received.month}, userIdsType=${res.received.userIdsType}, isArray=${res.received.isArray}, length=${res.received.length})` : '';
        throw new Error(errMsg + debugInfo);
      }
    } catch (e) {
      document.getElementById('reminderResult').innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '選択した人に送信';
    }
  });

  await loadPasskeys();
}
