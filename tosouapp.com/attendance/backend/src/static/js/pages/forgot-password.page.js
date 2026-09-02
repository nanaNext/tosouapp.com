import { forgotPassword } from '../api/auth.api.js';

const $ = (s) => document.querySelector(s);

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#forgotForm');
  if (!form) return;
  const birthDateInput = $('#birthDate');
  if (birthDateInput) {
    const closeDatePicker = (e) => {
      try { e?.preventDefault(); } catch (e) { /* bỏ qua lỗi */ }
      birthDateInput.blur();
    };
    // Trên vài trình duyệt mobile, chạm lại vào ô ngày không đóng được lịch chọn.
    // Nếu ô đang focus thì blur khi chạm lần nữa để đóng.
    birthDateInput.addEventListener('pointerdown', (e) => {
      if (document.activeElement !== birthDateInput) return;
      closeDatePicker(e);
    });
    birthDateInput.addEventListener('change', closeDatePicker);
    birthDateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDatePicker(e);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setText('#status', '');
    setText('#error', '');
    const email = String($('#email')?.value || '').trim();
    const birthDate = String($('#birthDate')?.value || '').trim();
    const employeeCode = String($('#employeeCode')?.value || '').trim();
    if (!email || !birthDate || !employeeCode) {
      setText('#error', 'メール・生年月日・社員番号を入力してください。');
      return;
    }
    const btn = $('#submitBtn');
    if (btn) btn.disabled = true;
    try {
      await forgotPassword({ email, birthDate, employeeCode });
      setText('#status', '入力情報が正しければ、再設定メールを送信しました。');
    } catch (err) {
      setText('#error', String(err?.message || '送信に失敗しました。'));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
});
