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

  await loadPasskeys();
}
