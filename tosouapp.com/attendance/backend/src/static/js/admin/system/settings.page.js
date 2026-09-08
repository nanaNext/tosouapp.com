import{fetchJSONAuth as o}from"../../api/http.api.js";async function M(y={}){const h=y&&y.content||document.querySelector("#adminContent");if(!h)return;h.innerHTML=`
    <div class="settings-root">
      <h2 class="settings-title">\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A</h2>

      <!-- \u2550\u2550\u2550 \u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 \u2550\u2550\u2550 -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F512}</span>
          <div>
            <h3 class="settings-card-title">\u30D1\u30B9\u30EF\u30FC\u30C9\u30DD\u30EA\u30B7\u30FC</h3>
            <p class="settings-card-desc">\u5168\u30E6\u30FC\u30B6\u30FC\u306B\u9069\u7528\u3055\u308C\u308B\u30D1\u30B9\u30EF\u30FC\u30C9\u8981\u4EF6\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002</p>
          </div>
        </div>
        <form id="formPasswordPolicy" class="settings-form">
          <div class="settings-form-row">
            <label class="settings-label" for="pwMinLength">\u6700\u5C0F\u6587\u5B57\u6570</label>
            <input id="pwMinLength" type="number" min="4" max="128" value="8" class="settings-input settings-input-sm" />
          </div>
          <div class="settings-form-row">
            <label class="settings-label">\u8907\u96D1\u3055\u8981\u4EF6</label>
            <div class="settings-checkbox-group">
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireUpper" checked /> \u5927\u6587\u5B57\u3092\u542B\u3080 (A-Z)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireLower" checked /> \u5C0F\u6587\u5B57\u3092\u542B\u3080 (a-z)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireDigit" checked /> \u6570\u5B57\u3092\u542B\u3080 (0-9)</label>
              <label class="settings-checkbox"><input type="checkbox" id="pwRequireSymbol" /> \u8A18\u53F7\u3092\u542B\u3080 (!@#$...)</label>
            </div>
          </div>
          <div class="settings-form-row">
            <label class="settings-label" for="pwExpiryDays">\u6709\u52B9\u671F\u9650\uFF08\u65E5\u6570\u30010=\u7121\u671F\u9650\uFF09</label>
            <input id="pwExpiryDays" type="number" min="0" max="365" value="0" class="settings-input settings-input-sm" />
          </div>
          <div class="settings-form-actions">
            <button type="submit" class="btn-primary">\u4FDD\u5B58</button>
            <span id="pwPolicyResult" class="settings-result"></span>
          </div>
        </form>
      </div>

      <!-- \u2550\u2550\u2550 2FA \u30C8\u30B0\u30EB \u2550\u2550\u2550 -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F510}</span>
          <div>
            <h3 class="settings-card-title">\u4E8C\u8981\u7D20\u8A8D\u8A3C (2FA / \u30D1\u30B9\u30AD\u30FC)</h3>
            <p class="settings-card-desc">\u30D1\u30B9\u30AD\u30FC\u3092\u4F7F\u3063\u305F2FA\u8A8D\u8A3C\u3092\u7BA1\u7406\u3057\u307E\u3059\u3002\u5168\u793E\u5F37\u5236ON/OFF\u306E\u5207\u308A\u66FF\u3048\u3082\u3067\u304D\u307E\u3059\u3002</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">\u5168\u30E6\u30FC\u30B6\u30FC\u306B2FA\u3092\u5F37\u5236\u3059\u308B</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle2FA" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggle2FAStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div id="passkeyStatus" class="settings-status-box">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
        <div id="passkeyActions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button id="btnRegisterPasskey" type="button" class="btn-primary">+ \u30D1\u30B9\u30AD\u30FC\u3092\u767B\u9332</button>
        </div>
        <div id="passkeyList" style="margin-top:16px;"></div>
      </div>

      <!-- \u2550\u2550\u2550 \u30E1\u30FC\u30EB\u9001\u4FE1\u30C6\u30B9\u30C8 \u2550\u2550\u2550 -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F4E7}</span>
          <div>
            <h3 class="settings-card-title">\u30E1\u30FC\u30EB\u9001\u4FE1\u30C6\u30B9\u30C8</h3>
            <p class="settings-card-desc">\u30E1\u30FC\u30EB\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u52D5\u4F5C\u3057\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002\u81EA\u5206\u306E\u30A2\u30C9\u30EC\u30B9\u306B\u30C6\u30B9\u30C8\u30E1\u30FC\u30EB\u3092\u9001\u4FE1\u3057\u307E\u3059\u3002</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="btnTestMail" type="button" class="btn-accent">\u30C6\u30B9\u30C8\u30E1\u30FC\u30EB\u3092\u9001\u4FE1</button>
          <span id="testMailResult" class="settings-result"></span>
        </div>
      </div>

      <!-- \u2550\u2550\u2550 \u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u30E2\u30FC\u30C9 \u2550\u2550\u2550 -->
      <div class="settings-card settings-card--warn" id="cardMaintenance">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F6A7}</span>
          <div>
            <h3 class="settings-card-title">\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u30E2\u30FC\u30C9</h3>
            <p class="settings-card-desc">ON\u306B\u3059\u308B\u3068\u7D66\u4E0E\u660E\u7D30\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9/\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u7B49\u304C\u4E00\u6642\u505C\u6B62\u3057\u307E\u3059\u3002\u7DCA\u6025\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u6642\u306B\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u30E2\u30FC\u30C9</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleMaintenance" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleMaintenanceStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">\u30B9\u30FC\u30D1\u30FC\u7BA1\u7406\u8005\u4EE5\u5916\u30ED\u30B0\u30A4\u30F3\u7981\u6B62</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleLockLogin" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleLockLoginStatus" class="settings-toggle-status">OFF</span>
        </div>
      </div>

      <!-- \u2550\u2550\u2550 GPS\u8981\u4EF6 \u2550\u2550\u2550 -->
      <div class="settings-card" id="cardGPS">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F4CD}</span>
          <div>
            <h3 class="settings-card-title">GPS\u8981\u4EF6</h3>
            <p class="settings-card-desc">\u51FA\u9000\u52E4\u6642\u306E\u4F4D\u7F6E\u60C5\u5831\u53D6\u5F97\u306E\u8981\u4EF6\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002</p>
          </div>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">GPS\u4F4D\u7F6E\u60C5\u5831\u3092\u5FC5\u9808\u306B\u3059\u308B</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleGPS" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleGPSStatus" class="settings-toggle-status">ON</span>
        </div>
        <div class="settings-form-row" style="margin-top:12px;">
          <label class="settings-label" for="inputMinAccuracy">\u6700\u5C0F\u7CBE\u5EA6\uFF08\u30E1\u30FC\u30C8\u30EB\uFF09</label>
          <input id="inputMinAccuracy" type="number" min="10" max="5000" value="100" class="settings-input settings-input-sm" />
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="inputCountryWhitelist">\u8A31\u53EF\u56FD\u30B3\u30FC\u30C9\uFF08\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3001\u7A7A\u6B04=\u5236\u9650\u306A\u3057\uFF09</label>
          <input id="inputCountryWhitelist" type="text" placeholder="JP,VN,US" class="settings-input" />
        </div>
      </div>

      <!-- \u2550\u2550\u2550 \u30EA\u30E2\u30FC\u30C8\u30DD\u30EA\u30B7\u30FC \u2550\u2550\u2550 -->
      <div class="settings-card" id="cardRemote">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F3E0}</span>
          <div>
            <h3 class="settings-card-title">\u30EA\u30E2\u30FC\u30C8\u30EF\u30FC\u30AF\u30DD\u30EA\u30B7\u30FC</h3>
            <p class="settings-card-desc">\u5728\u5B85\u52E4\u52D9\u30FB\u30EA\u30E2\u30FC\u30C8\u6253\u523B\u306E\u30EB\u30FC\u30EB\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002</p>
          </div>
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="selectRemotePolicy">\u30EA\u30E2\u30FC\u30C8\u30DD\u30EA\u30B7\u30FC</label>
          <select id="selectRemotePolicy" class="settings-input">
            <option value="anywhere">\u3069\u3053\u304B\u3089\u3067\u3082\u6253\u523B\u53EF (anywhere)</option>
            <option value="office_only">\u30AA\u30D5\u30A3\u30B9\u306E\u307F (office_only)</option>
            <option value="hybrid">\u30CF\u30A4\u30D6\u30EA\u30C3\u30C9 (hybrid)</option>
          </select>
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">\u30EA\u30E2\u30FC\u30C8\u6253\u523B\u6642\u306B\u30E1\u30E2\u5165\u529B\u3092\u5FC5\u9808\u306B\u3059\u308B</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggleNoteOnRemote" />
            <span class="toggle-slider"></span>
          </label>
          <span id="toggleNoteOnRemoteStatus" class="settings-toggle-status">OFF</span>
        </div>
        <div class="settings-form-row">
          <label class="settings-label" for="inputMaxDevices">\u6700\u5927\u30C7\u30D0\u30A4\u30B9\u6570/\u30E6\u30FC\u30B6\u30FC</label>
          <input id="inputMaxDevices" type="number" min="1" max="20" value="5" class="settings-input settings-input-sm" />
        </div>
      </div>

      <!-- \u2550\u2550\u2550 \u30D5\u30E9\u30B0\u4FDD\u5B58\u30DC\u30BF\u30F3 \u2550\u2550\u2550 -->
      <div class="settings-card" style="background:#f8fafc;border:1px dashed #cbd5e1;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="btnSaveFlags" type="button" class="btn-primary btn-lg">\u30D5\u30E9\u30B0\u8A2D\u5B9A\u3092\u4FDD\u5B58</button>
          <span id="flagsResult" class="settings-result"></span>
        </div>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u30E2\u30FC\u30C9\u30FBGPS\u8981\u4EF6\u30FB\u30EA\u30E2\u30FC\u30C8\u30DD\u30EA\u30B7\u30FC\u306E\u5909\u66F4\u3092\u4E00\u62EC\u4FDD\u5B58\u3057\u307E\u3059\u3002</p>
      </div>

      <!-- \u2550\u2550\u2550 \u30B7\u30D5\u30C8\u63D0\u51FA\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC \u2550\u2550\u2550 -->
      <div class="settings-card">
        <div class="settings-card-header">
          <span class="settings-card-icon">\u{1F4C5}</span>
          <div>
            <h3 class="settings-card-title">\u30B7\u30D5\u30C8\u63D0\u51FA\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC</h3>
            <p class="settings-card-desc">
              \u672C\u756A\u3067\u306F\u6BCE\u6708<strong>15\u65E5\u30FB25\u65E5\u30FB\u6708\u672B</strong>\u306E15:00 (JST) \u306B\u81EA\u52D5\u9001\u4FE1\u3055\u308C\u307E\u3059\u3002<br>
              \u624B\u52D5\u9001\u4FE1\u3059\u308B\u5834\u5408\u306F\u3001\u5BFE\u8C61\u6708\u3092\u9078\u3093\u3067\u300C\u5BFE\u8C61\u8005\u3092\u8AAD\u307F\u8FBC\u3080\u300D\u3092\u62BC\u3057\u3066\u304B\u3089\u9001\u4FE1\u5BFE\u8C61\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <label class="settings-label" style="margin-bottom:0;">\u5BFE\u8C61\u6708:</label>
          <input id="reminderMonth" type="month" class="settings-input settings-input-sm" />
          <button id="btnLoadEmployees" type="button" class="btn-secondary">\u5BFE\u8C61\u8005\u3092\u8AAD\u307F\u8FBC\u3080</button>
        </div>
        <div id="reminderEmployeeList" style="display:none;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <label class="settings-label" style="margin-bottom:0;" id="reminderCountLabel"></label>
            <label class="settings-checkbox" style="font-size:12px;">
              <input type="checkbox" id="chkSelectAll">\u5168\u9078\u629E / \u5168\u89E3\u9664
            </label>
          </div>
          <div class="settings-table-wrap">
            <table id="reminderTable" class="settings-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;"></th>
                  <th>\u6C0F\u540D</th>
                  <th>\u30E1\u30FC\u30EB</th>
                  <th>\u7A2E\u5225</th>
                </tr>
              </thead>
              <tbody id="reminderTableBody"></tbody>
            </table>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button id="btnSendSelected" type="button" class="btn-danger">\u9078\u629E\u3057\u305F\u4EBA\u306B\u9001\u4FE1</button>
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
  `;function r(e,t){const s=e.checked;t.textContent=s?"ON":"OFF",t.style.color=s?"#16a34a":"#94a3b8"}const f=[["toggle2FA","toggle2FAStatus"],["toggleMaintenance","toggleMaintenanceStatus"],["toggleLockLogin","toggleLockLoginStatus"],["toggleGPS","toggleGPSStatus"],["toggleNoteOnRemote","toggleNoteOnRemoteStatus"]];f.forEach(([e,t])=>{const s=document.getElementById(e),n=document.getElementById(t);s&&n&&(r(s,n),s.addEventListener("change",()=>r(s,n)))});async function E(){try{const e=await o("/api/admin/system/flags");e&&(document.getElementById("toggleMaintenance").checked=!!e.maintenanceMode,document.getElementById("toggleLockLogin").checked=!!e.lockLoginExceptSuper,document.getElementById("toggleGPS").checked=e.requireGPS!==!1,document.getElementById("inputMinAccuracy").value=e.minAccuracyMeters||100,document.getElementById("selectRemotePolicy").value=e.remotePolicy||"anywhere",document.getElementById("toggleNoteOnRemote").checked=!!e.requireNoteOnRemote,document.getElementById("inputCountryWhitelist").value=e.countryWhitelist||"",document.getElementById("inputMaxDevices").value=e.maxDevicesPerUser||5,f.forEach(([t,s])=>{const n=document.getElementById(t),i=document.getElementById(s);n&&i&&r(n,i)}))}catch{}}document.getElementById("btnSaveFlags")?.addEventListener("click",async()=>{const e=document.getElementById("btnSaveFlags"),t=document.getElementById("flagsResult");e.disabled=!0,e.textContent="\u4FDD\u5B58\u4E2D...",t.textContent="",t.className="settings-result";try{const s={maintenanceMode:String(document.getElementById("toggleMaintenance").checked),lockLoginExceptSuper:String(document.getElementById("toggleLockLogin").checked),requireGPS:String(document.getElementById("toggleGPS").checked),minAccuracyMeters:Number(document.getElementById("inputMinAccuracy").value)||100,remotePolicy:document.getElementById("selectRemotePolicy").value||"anywhere",requireNoteOnRemote:String(document.getElementById("toggleNoteOnRemote").checked),countryWhitelist:document.getElementById("inputCountryWhitelist").value.trim(),maxDevicesPerUser:Number(document.getElementById("inputMaxDevices").value)||5},n=await o("/api/admin/system/flags",{method:"POST",body:JSON.stringify(s)});if(n&&n.ok)t.textContent="\u2705 \u4FDD\u5B58\u3057\u307E\u3057\u305F",t.className="settings-result settings-result--ok";else throw new Error(n?.error||"\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}catch(s){t.textContent="\u274C "+(s.message||"\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"),t.className="settings-result settings-result--err"}finally{e.disabled=!1,e.textContent="\u30D5\u30E9\u30B0\u8A2D\u5B9A\u3092\u4FDD\u5B58"}}),document.getElementById("formPasswordPolicy")?.addEventListener("submit",async e=>{e.preventDefault();const t=e.target.querySelector('button[type="submit"]'),s=document.getElementById("pwPolicyResult");t.disabled=!0,t.textContent="\u4FDD\u5B58\u4E2D...",s.textContent="",s.className="settings-result";try{const n={minLength:Number(document.getElementById("pwMinLength").value)||8,requireUpper:document.getElementById("pwRequireUpper").checked,requireLower:document.getElementById("pwRequireLower").checked,requireDigit:document.getElementById("pwRequireDigit").checked,requireSymbol:document.getElementById("pwRequireSymbol").checked,expiryDays:Number(document.getElementById("pwExpiryDays").value)||0},i=await o("/api/admin/settings/password-policy",{method:"POST",body:JSON.stringify(n)});if(i&&(i.ok||i.success))s.textContent="\u2705 \u30D1\u30B9\u30EF\u30FC\u30C9\u30DD\u30EA\u30B7\u30FC\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F",s.className="settings-result settings-result--ok";else throw new Error(i?.error||i?.message||"\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}catch(n){s.textContent="\u274C "+(n.message||"\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"),s.className="settings-result settings-result--err"}finally{t.disabled=!1,t.textContent="\u4FDD\u5B58"}});async function S(){try{const e=await o("/api/admin/settings/password-policy");e&&(e.minLength&&(document.getElementById("pwMinLength").value=e.minLength),e.requireUpper!=null&&(document.getElementById("pwRequireUpper").checked=!!e.requireUpper),e.requireLower!=null&&(document.getElementById("pwRequireLower").checked=!!e.requireLower),e.requireDigit!=null&&(document.getElementById("pwRequireDigit").checked=!!e.requireDigit),e.requireSymbol!=null&&(document.getElementById("pwRequireSymbol").checked=!!e.requireSymbol),e.expiryDays!=null&&(document.getElementById("pwExpiryDays").value=e.expiryDays))}catch{}}document.getElementById("toggle2FA")?.addEventListener("change",async e=>{const t=e.target.checked,s=document.getElementById("toggle2FAStatus");r(e.target,s);try{await o("/api/admin/settings/2fa-policy",{method:"POST",body:JSON.stringify({enforced:t})})}catch(n){e.target.checked=!t,r(e.target,s),alert("2FA\u8A2D\u5B9A\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(n.message||""))}});async function I(){try{const e=await o("/api/admin/settings/2fa-policy");if(e){const t=document.getElementById("toggle2FA");t.checked=!!e.enforced,r(t,document.getElementById("toggle2FAStatus"))}}catch{}}const l=document.getElementById("passkeyStatus"),x=document.getElementById("passkeyList");async function w(){try{const e=await o("/api/webauthn/passkeys"),t=e?.data||e||[];!Array.isArray(t)||t.length===0?(l.innerHTML=`
          <span style="color:#64748b;">\u30D1\u30B9\u30AD\u30FC\u672A\u767B\u9332</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:#94a3b8;">\u767B\u9332\u3059\u308B\u3068\u6B21\u56DE\u30ED\u30B0\u30A4\u30F3\u6642\u304B\u30892FA\u8A8D\u8A3C\u304C\u6709\u52B9\u306B\u306A\u308A\u307E\u3059\u3002</span>
        `,l.style.background="#f8fafc",x.innerHTML=""):(l.innerHTML=`
          <span style="color:#166534;font-weight:600;">\u2713 2FA\u6709\u52B9</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:#475569;">${t.length}\u500B\u306E\u30D1\u30B9\u30AD\u30FC\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u3002</span>
        `,l.style.background="#f0fdf4",x.innerHTML=t.map((s,n)=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;font-size:13px;">
            <span>\u{1F511} \u30D1\u30B9\u30AD\u30FC ${n+1} <span style="color:#64748b;font-size:11px;">(\u767B\u9332: ${new Date(s.created_at).toLocaleDateString("ja-JP")})</span></span>
          </div>
        `).join(""))}catch{l.innerHTML='<span style="color:#64748b;">\u30D1\u30B9\u30AD\u30FC\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002</span>'}}document.getElementById("btnRegisterPasskey")?.addEventListener("click",async()=>{try{const t=JSON.parse(sessionStorage.getItem("user")||localStorage.getItem("user")||"{}").email;if(!t){alert("\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u304C\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const s=await o("/api/webauthn/register/options",{method:"POST",body:JSON.stringify({email:t})});if(!window.SimpleWebAuthnBrowser){const i=document.createElement("script");i.src="/static/js/vendor/simplewebauthn-browser.min.js",await new Promise((u,c)=>{i.onload=u,i.onerror=()=>c(new Error("SimpleWebAuthn library load failed")),document.head.appendChild(i)})}if(!window.SimpleWebAuthnBrowser?.startRegistration)throw new Error("SimpleWebAuthn library not available");let n;try{n=await SimpleWebAuthnBrowser.startRegistration(s)}catch(i){if(i.name==="NotAllowedError"||i.name==="AbortError"){alert("\u8A8D\u8A3C\u304C\u30AD\u30E3\u30F3\u30BB\u30EB\u3055\u308C\u307E\u3057\u305F\u3002");return}throw i}await o("/api/webauthn/register/verify",{method:"POST",body:JSON.stringify({email:t,response:n})}),alert(`\u2705 \u30D1\u30B9\u30AD\u30FC\u304C\u6B63\u5E38\u306B\u767B\u9332\u3055\u308C\u307E\u3057\u305F\uFF01
\u6B21\u56DE\u30ED\u30B0\u30A4\u30F3\u6642\u304B\u30892FA\u8A8D\u8A3C\u304C\u6709\u52B9\u306B\u306A\u308A\u307E\u3059\u3002`),await w()}catch(e){alert("\u274C \u30D1\u30B9\u30AD\u30FC\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(e.message||e))}}),document.getElementById("btnTestMail")?.addEventListener("click",async()=>{const e=document.getElementById("btnTestMail"),t=document.getElementById("testMailResult");e.disabled=!0,e.textContent="\u9001\u4FE1\u4E2D...",t.textContent="",t.className="settings-result";try{const s=await o("/api/test-mail");s.ok?(t.textContent=`\u2705 \u9001\u4FE1\u6210\u529F\uFF01 (${s.message||""})`,t.className="settings-result settings-result--ok"):(t.textContent=`\u274C \u30A8\u30E9\u30FC: ${s.error||JSON.stringify(s)}`,t.className="settings-result settings-result--err")}catch(s){t.textContent=`\u274C ${s.message||"\u9001\u4FE1\u5931\u6557"}`,t.className="settings-result settings-result--err"}finally{e.disabled=!1,e.textContent="\u30C6\u30B9\u30C8\u30E1\u30FC\u30EB\u3092\u9001\u4FE1"}});const k=document.getElementById("reminderMonth");if(k){const e=new Date(Date.now()+324e5),t=new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth()+1,1));k.value=`${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}`}let g=[];function p(){const e=document.querySelectorAll(".reminder-chk:checked").length,t=g.length,s=document.getElementById("reminderCountLabel");s&&(s.textContent=`${t}\u540D\u4E2D ${e}\u540D \u9078\u629E\u4E2D`)}function B(e){const t=document.getElementById("reminderTableBody");t&&(t.innerHTML=e.map(s=>{const n=s.employment_type==="full_time"||s.employment_type==="\u6B63\u793E\u54E1"?"\u6B63\u793E\u54E1":"\u30D0\u30A4\u30C8";return`<tr>
        <td style="text-align:center;">
          <input type="checkbox" class="reminder-chk" data-id="${s.userId??s.id}" checked style="cursor:pointer;width:14px;height:14px;accent-color:#2563eb;">
        </td>
        <td>${s.username||"-"}</td>
        <td style="color:#64748b;">${s.email||"-"}</td>
        <td>${n}</td>
      </tr>`}).join(""),document.querySelectorAll(".reminder-chk").forEach(s=>{s.addEventListener("change",p)}),p())}document.getElementById("btnLoadEmployees")?.addEventListener("click",async()=>{const e=document.getElementById("btnLoadEmployees"),t=document.getElementById("reminderMonth")?.value;if(!t){alert("\u5BFE\u8C61\u6708\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}e.disabled=!0,e.textContent="\u8AAD\u307F\u8FBC\u307F\u4E2D...",document.getElementById("reminderResult").innerHTML="";try{const s=await o(`/api/admin/test/shift-reminder?dry_run=true&month=${encodeURIComponent(t)}`,{method:"POST"});if(!s.ok)throw new Error(s.error||"Failed");g=(s.results||[]).filter(n=>n.email),g.length===0?(document.getElementById("reminderResult").innerHTML='<span style="color:#64748b;">\u5BFE\u8C61\u8005\u306A\u3057\uFF08\u5168\u54E1\u63D0\u51FA\u6E08\u307F\u304B\u5F93\u696D\u54E1\u304C\u3044\u307E\u305B\u3093\uFF09</span>',document.getElementById("reminderEmployeeList").style.display="none"):(B(g),document.getElementById("reminderEmployeeList").style.display="block",document.getElementById("chkSelectAll").checked=!0)}catch(s){document.getElementById("reminderResult").innerHTML=`<span style="color:#dc2626;">\u274C ${s.message}</span>`}finally{e.disabled=!1,e.textContent="\u5BFE\u8C61\u8005\u3092\u8AAD\u307F\u8FBC\u3080"}}),document.getElementById("chkSelectAll")?.addEventListener("change",e=>{document.querySelectorAll(".reminder-chk").forEach(t=>{t.checked=e.target.checked}),p()}),document.getElementById("btnSendSelected")?.addEventListener("click",async()=>{const e=document.getElementById("reminderMonth")?.value;if(!e){alert("\u5BFE\u8C61\u6708\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}const t=[...document.querySelectorAll(".reminder-chk:checked")].map(i=>Number(i.dataset.id));if(t.length===0){alert("\u9001\u4FE1\u3059\u308B\u5BFE\u8C61\u8005\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}if(!confirm(`${t.length}\u540D\u306B${e}\u306E\u30B7\u30D5\u30C8\u63D0\u51FA\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u3092\u9001\u4FE1\u3057\u307E\u3059\u304B\uFF1F`))return;const s=document.getElementById("btnSendSelected"),n=document.getElementById("reminderSendStatus");s.disabled=!0,s.textContent="\u9001\u4FE1\u4E2D...",n.textContent="",document.getElementById("reminderResult").innerHTML="";try{const i=sessionStorage.getItem("accessToken")||"",u=document.cookie.match(/(^| )csrfToken=([^;]+)/)?.[2]||"",c=await fetch("/api/admin/shift-reminder/send",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",Authorization:i?`Bearer ${i}`:"","X-CSRF-Token":u},body:JSON.stringify({month:e,userIds:t})}),a=await c.json().catch(()=>({}));if(c.ok&&a.ok)(a.results||[]).forEach(d=>{const m=document.querySelector(`.reminder-chk[data-id="${d.userId}"]`);if(m){const b=m.closest("tr");if(b){b.style.background=d.status==="sent"?"#f0fdf4":"#fef2f2";const v=b.querySelectorAll("td");v[3]&&(v[3].innerHTML=d.status==="sent"?'<span style="color:#16a34a;font-weight:600;">\u2705 \u9001\u4FE1\u6E08</span>':'<span style="color:#dc2626;">\u274C \u30A8\u30E9\u30FC</span>'),m.disabled=!0}}}),n.textContent=`\u2705 \u5B8C\u4E86 \u2014 \u6210\u529F: ${a.sent}\u4EF6 / \u30A8\u30E9\u30FC: ${a.errors}\u4EF6`,n.style.color=a.errors>0?"#d97706":"#16a34a";else{const d=a.error||a.message||`HTTP ${c.status}`;throw new Error(d)}}catch(i){document.getElementById("reminderResult").innerHTML=`<span style="color:#dc2626;">\u274C ${i.message}</span>`}finally{s.disabled=!1,s.textContent="\u9078\u629E\u3057\u305F\u4EBA\u306B\u9001\u4FE1"}}),await Promise.all([w(),E(),S(),I()])}export{M as mount};
