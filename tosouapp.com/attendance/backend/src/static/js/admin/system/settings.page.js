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
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;">📅 シフト提出リマインダー テスト</h3>
        <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
          全アクティブ従業員にシフト提出リマインダーメールを手動送信します。<br>
          本番では毎月<strong>15日・25日・月末</strong>の15:00 (JST) に自動送信されます。
        </p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <label style="font-size:13px;color:#374151;">対象月:</label>
          <input id="reminderMonth" type="month" style="height:34px;padding:0 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" />
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button id="btnDryRun" type="button" style="height:36px;padding:0 20px;background:#64748b;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
            対象者確認 (送信なし)
          </button>
          <button id="btnSendReminder" type="button" style="height:36px;padding:0 20px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
            実際に送信する
          </button>
        </div>
        <div id="reminderResult" style="margin-top:14px;font-size:13px;"></div>
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

  function renderReminderResult(data, isDryRun) {
    const el = document.getElementById('reminderResult');
    if (!data || !el) return;
    if (!data.ok) {
      el.innerHTML = `<span style="color:#dc2626;">❌ エラー: ${data.error || JSON.stringify(data)}</span>`;
      return;
    }
    const rows = (data.results || []).map(r => {
      const icon = r.status === 'sent' ? '✅' : r.status === 'dry_run' ? '🔍' : r.status === 'skipped' ? '⚠️' : '❌';
      const detail = r.error ? ` (${r.error})` : r.reason ? ` (${r.reason})` : r.type ? ` [${r.type}]` : '';
      return `<tr>
        <td style="padding:4px 8px;">${icon}</td>
        <td style="padding:4px 8px;">${r.username || '-'}</td>
        <td style="padding:4px 8px;color:#64748b;">${r.email || '-'}</td>
        <td style="padding:4px 8px;">${r.status}${detail}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div style="margin-bottom:8px;font-weight:600;color:${isDryRun ? '#475569' : '#16a34a'};">
        ${isDryRun ? `🔍 ドライラン完了 — 対象: ${data.results?.length || 0}名` : `✅ 送信完了 — 成功: ${data.sent}件 / エラー: ${data.errors}件`}
        &nbsp;<span style="color:#94a3b8;font-weight:400;">対象月: ${data.targetMonth}</span>
      </div>
      ${rows ? `<table style="font-size:12px;border-collapse:collapse;width:100%;max-width:600px;">${rows}</table>` : '<span style="color:#64748b;">対象者なし</span>'}
    `;
  }

  document.getElementById('btnDryRun')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnDryRun');
    const month = document.getElementById('reminderMonth')?.value;
    if (!month) { alert('対象月を選択してください'); return; }
    btn.disabled = true;
    btn.textContent = '確認中...';
    document.getElementById('reminderResult').innerHTML = '';
    try {
      const res = await fetchJSONAuth(`/api/admin/test/shift-reminder?dry_run=true&month=${encodeURIComponent(month)}`, { method: 'POST' });
      renderReminderResult(res, true);
    } catch (e) {
      document.getElementById('reminderResult').innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '対象者確認 (送信なし)';
    }
  });

  document.getElementById('btnSendReminder')?.addEventListener('click', async () => {
    const month = document.getElementById('reminderMonth')?.value;
    if (!month) { alert('対象月を選択してください'); return; }
    if (!confirm(`本当に全従業員に${month}のシフト提出リマインダーを送信しますか？`)) return;
    const btn = document.getElementById('btnSendReminder');
    btn.disabled = true;
    btn.textContent = '送信中...';
    document.getElementById('reminderResult').innerHTML = '';
    try {
      const res = await fetchJSONAuth(`/api/admin/test/shift-reminder?month=${encodeURIComponent(month)}`, { method: 'POST' });
      renderReminderResult(res, false);
    } catch (e) {
      document.getElementById('reminderResult').innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '実際に送信する';
    }
  });

  await loadPasskeys();
}
