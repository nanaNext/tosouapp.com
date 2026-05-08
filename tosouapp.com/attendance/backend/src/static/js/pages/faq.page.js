const $ = (sel) => document.querySelector(sel);

let allFaqItems = [];
let allMyQuestions = [];
let currentFilter = 'all';

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : '';
}

function buildAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const csrf = getCookie('csrfToken');
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

async function apiFetchJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...options,
      signal: controller.signal
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const msg = data?.message || (data?.errors?.[0]?.msg) || `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = [
    'position: fixed',
    'bottom: 20px',
    'right: 20px',
    'padding: 16px 20px',
    'border-radius: 6px',
    'font-size: 14px',
    'font-weight: 500',
    'max-width: 300px',
    'z-index: 9999',
    'animation: faqSlideIn 0.3s ease-out'
  ].join(';');
  if (type === 'success') {
    toast.style.background = '#28a745';
    toast.style.color = 'white';
    toast.textContent = '✓ ' + message;
  } else if (type === 'error') {
    toast.style.background = '#dc3545';
    toast.style.color = 'white';
    toast.textContent = '❌ ' + message;
  } else {
    toast.style.background = '#17a2b8';
    toast.style.color = 'white';
    toast.textContent = 'ℹ️ ' + message;
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'faqSlideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function ensureAnimStyle() {
  if (document.getElementById('faq-toast-style')) return;
  const style = document.createElement('style');
  style.id = 'faq-toast-style';
  style.textContent = `
    @keyframes faqSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes faqSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function renderFaqItems() {
  const host = $('#faqContainer');
  if (!host) return;
  const filtered = currentFilter === 'all'
    ? allFaqItems
    : allFaqItems.filter((item) => item.category === currentFilter);
  if (!filtered.length) {
    host.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">該当する質問がありません</div>';
    return;
  }
  const html = filtered.map((item, idx) => `
    <div class="kintai-card" style="margin-bottom:12px;">
      <button type="button" class="faq-question-toggle" data-idx="${idx}" style="width:100%;text-align:left;cursor:pointer;padding:15px;display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;border:0;border-radius:6px;">
        <span>
          <span style="display:block;color:#666;font-size:12px;margin-bottom:5px;">
            <span style="background:#e8f4f8;color:#1e40af;padding:2px 8px;border-radius:3px;font-size:11px;">
              ${escapeHtml(item.category || 'その他')}
            </span>
          </span>
          <span style="font-weight:bold;color:#1e40af;font-size:14px;">
            Q: ${escapeHtml(item.question)}
          </span>
        </span>
        <span style="font-size:18px;margin-left:10px;" id="arrow-${idx}">▼</span>
      </button>
      <div id="answer-${idx}" style="display:none;padding:15px;background:white;border-left:4px solid #1e40af;">
        <div style="font-size:13px;color:#334155;line-height:1.6;">
          A: ${escapeHtml(item.answer)}
        </div>
      </div>
    </div>
  `).join('');
  host.innerHTML = html;
}

function toggleAnswer(idx) {
  const answerDiv = document.getElementById(`answer-${idx}`);
  const arrowDiv = document.getElementById(`arrow-${idx}`);
  if (!answerDiv || !arrowDiv) return;
  const isVisible = answerDiv.style.display !== 'none';
  answerDiv.style.display = isVisible ? 'none' : 'block';
  arrowDiv.textContent = isVisible ? '▼' : '▲';
}

function updateFilterButtons() {
  document.querySelectorAll('.faq-tab-btn').forEach((btn) => {
    const cat = String(btn.getAttribute('data-category') || '');
    const active = cat === currentFilter;
    btn.style.background = active ? '#1e40af' : '#fff';
    btn.style.color = active ? '#fff' : '#000';
    btn.style.border = active ? 'none' : '1px solid #ddd';
    btn.classList.toggle('active', active);
  });
}

function filterByCategory(category) {
  currentFilter = String(category || 'all');
  updateFilterButtons();
  renderFaqItems();
}

async function loadFaqItems() {
  const host = $('#faqContainer');
  try {
    const result = await apiFetchJson('/api/faq', {
      method: 'GET',
      headers: buildAuthHeaders()
    });
    allFaqItems = result?.data || [];
    renderFaqItems();
  } catch (e) {
    if (host) {
      host.innerHTML = `<div style="color:red;padding:20px;"><strong>FAQ読み込みエラー:</strong><br>${escapeHtml(e.message)}</div>`;
    }
  }
}

function renderMyQuestions() {
  const countEl = $('#myQuestionsCount');
  const host = $('#myQuestionsContainer');
  if (!host) return;
  if (countEl) countEl.textContent = String(allMyQuestions.length);
  if (!allMyQuestions.length) {
    host.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">質問がまだありません</div>';
    return;
  }
  const html = allMyQuestions.map((q) => {
    const status = String(q.status || '');
    const statusColor = status === '回答済み' ? '#28a745' : '#ffc107';
    const statusBg = status === '回答済み' ? '#d4edda' : '#fff3cd';
    return `
      <div style="padding:12px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:bold;color:#334155;font-size:13px;">
            ${escapeHtml(q.question)}
          </div>
          <span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:3px;font-size:11px;white-space:nowrap;">
            ${escapeHtml(status)}
          </span>
        </div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
          送信日: ${new Date(q.created_at).toLocaleString('ja-JP')}
        </div>
        ${q.admin_answer ? `
          <div style="background:white;padding:10px;border-left:3px solid #28a745;margin-top:8px;font-size:12px;color:#334155;">
            <div style="font-weight:bold;color:#28a745;margin-bottom:5px;">✓ 回答:</div>
            <div>${escapeHtml(q.admin_answer)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  host.innerHTML = html;
}

async function loadMyQuestions() {
  const host = $('#myQuestionsContainer');
  try {
    const result = await apiFetchJson('/api/faq/questions/my', {
      method: 'GET',
      headers: buildAuthHeaders()
    });
    allMyQuestions = result?.data || [];
    renderMyQuestions();
  } catch (e) {
    const msg = String(e.message || '').toLowerCase();
    if (host && (msg.includes('unauthorized') || msg.includes('401'))) {
      host.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">ログイン後に質問履歴を表示できます</div>';
    }
  }
}

async function submitQuestion(e) {
  e.preventDefault();
  const question = String($('#questionInput')?.value || '').trim();
  const detail = String($('#detailInput')?.value || '').trim();
  const category = String($('#categorySelect')?.value || '');
  const form = $('#questionForm');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn?.textContent || '送信';

  if (!question) return showToast('質問タイトルを入力してください', 'error');
  if (question.length < 5) return showToast('質問は5文字以上である必要があります', 'error');
  if (detail.length > 2000) return showToast('詳細は2000文字以下である必要があります', 'error');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
  }
  try {
    const result = await apiFetchJson('/api/faq/questions', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ question, detail, category })
    }, 15000);
    showToast(result?.message || '質問を送信しました', 'success');
    form?.reset();
    await loadMyQuestions();
  } catch (e2) {
    const msg = String(e2.message || '');
    if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
      showToast('ログインが必要です', 'error');
      window.location.href = '/ui/login';
    } else {
      showToast('通信エラーが発生しました: ' + msg, 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
}

function bindEvents() {
  const form = $('#questionForm');
  if (form) form.addEventListener('submit', submitQuestion);

  document.querySelectorAll('.faq-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category') || 'all';
      filterByCategory(cat);
    });
  });

  const faqContainer = $('#faqContainer');
  faqContainer?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.faq-question-toggle');
    if (!toggleBtn) return;
    const idx = Number.parseInt(String(toggleBtn.getAttribute('data-idx') || ''), 10);
    if (!Number.isFinite(idx)) return;
    toggleAnswer(idx);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  ensureAnimStyle();
  bindEvents();
  updateFilterButtons();
  await loadFaqItems();
  await loadMyQuestions();
});
