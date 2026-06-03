(function () {
  const root = globalThis.AttendanceMonthly || {};
  const core = root.Core || globalThis.MonthlyMonthlyCore || {};
  const state = root.State || globalThis.MonthlyMonthlyState || {};
  const render = root.Render || globalThis.MonthlyMonthlyRender || {};
  const draft = root.Draft || globalThis.MonthlyMonthlyDraft || null;
  const controller = root.Controller;

  const { $, setDirty, clearDirty, showErr, hideSpinner, wireUserMenu, wireTopNavDropdowns } = core;
  const { recomputeRow } = render;

  let lastAutoReloadAt = 0;
  const bindAutoReloadOnReturn = () => {
    const maybeReload = async () => {
      if (!controller) return;
      if (state.dirty) return;
      const now = Date.now();
      if (now - lastAutoReloadAt < 2000) return;
      lastAutoReloadAt = now;
      // Disabled auto-reload to prevent flicker
      // try { await controller.reloadMonth(); } catch {}
    };
    window.addEventListener('pageshow', (e) => {
      if (e && e.persisted) void maybeReload();
    });
    window.addEventListener('focus', () => {
      if (document.visibilityState !== 'visible') return;
      void maybeReload();
    });
  };

  const bindCollapseToggles = () => {
    controller.applyDailyCollapsed(controller.getDailyCollapsed());
    $('#dailyToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !controller.getDailyCollapsed();
      controller.setDailyCollapsed(next);
      controller.applyDailyCollapsed(next);
      try { requestAnimationFrame(() => controller.syncMonthHScroll()); } catch {}
    });
    controller.applyContractCollapsed(controller.getContractCollapsed());
    $('#contractToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !controller.getContractCollapsed();
      controller.setContractCollapsed(next);
      controller.applyContractCollapsed(next);
    });
    controller.applySummaryCollapsed(controller.getSummaryCollapsed());
    $('#summaryToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !controller.getSummaryCollapsed();
      controller.setSummaryCollapsed(next);
      controller.applySummaryCollapsed(next);
    });
    controller.applyAnnualCollapsed(controller.getAnnualCollapsed());
    $('#annualToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !controller.getAnnualCollapsed();
      controller.setAnnualCollapsed(next);
      controller.applyAnnualCollapsed(next);
    });
  };

  const bindDirtyOnBlur = () => {
    document.addEventListener('blur', (e) => {
      if (!state.editableMonth) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const tag = t.tagName.toLowerCase();
      if (tag === 'select' || tag === 'textarea') { setDirty(); return; }
      if (tag === 'input') {
        const type = (t.getAttribute('type') || '').toLowerCase();
        if (type === 'text' || type === 'time' || type === 'number' || type === 'checkbox' || type === 'month') setDirty();
      }
    }, true);
  };

  const bindWindowResize = () => {
    window.addEventListener('resize', () => {
      controller.syncFooterVars();
      controller.syncStickyTop();
      controller.syncMonthHScroll();
    }, { passive: true });
  };

  const bindTabs = () => {
    const cSec = $('#contractSection');
    if (cSec && cSec.dataset.tabsWired !== '1') {
      cSec.dataset.tabsWired = '1';
      const tabs = Array.from(cSec.querySelectorAll('.se-tab[data-tab]'));
      for (const t of tabs) {
        t.addEventListener('click', (e) => {
          e.preventDefault();
          if (t.hasAttribute('disabled')) return;
          for (const x of tabs) x.classList.toggle('active', x === t);
          try { controller.ctx.applyContractTab?.(); } catch {}
        });
      }
    }
    const sSec = $('#summarySection');
    if (sSec && sSec.dataset.tabsWired !== '1') {
      sSec.dataset.tabsWired = '1';
      const tabs = Array.from(sSec.querySelectorAll('.se-tab[data-tab]'));
      for (const t of tabs) {
        t.addEventListener('click', (e) => {
          e.preventDefault();
          if (t.hasAttribute('disabled')) return;
          for (const x of tabs) x.classList.toggle('active', x === t);
          try { controller.ctx.applySummaryTab?.(); } catch {}
        });
      }
    }
  };

  const bindWorkflowButtons = () => {
    const applyFeedback = async (btn, actionText, actionFn) => {
      if (!btn) return;
      if (btn.dataset.saving === '1') return;
      btn.dataset.saving = '1';
      const originalText = btn.dataset.originalText || btn.innerHTML;
      btn.dataset.originalText = originalText;
      btn.disabled = true;
      btn.innerHTML = actionText + '中...';
      core.showSpinner('save', false);
      try {
        await actionFn();
        btn.innerHTML = actionText + '成功';
        btn.style.background = '#10b981';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#fff';
        core.showSpinner('save', true);
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.disabled = false;
          btn.dataset.saving = '0';
          core.hideSpinner();
        }, 1500);

      } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.dataset.saving = '0';
        core.hideSpinner();
        alert(String(err?.message || actionText + '失敗しました'));
      }
    };

    document.querySelector('#btnSubmitMonth')?.addEventListener('click', async (e) => { 
      e.preventDefault(); 
      await applyFeedback(e.currentTarget, '提出', async () => { await controller.submitMonth(); });
    });
    document.querySelector('#btnApproveMonth')?.addEventListener('click', async (e) => { 
      e.preventDefault(); 
      await applyFeedback(e.currentTarget, '承認', async () => { await controller.approveMonth(); });
    });
    document.querySelector('#btnUnlockMonth')?.addEventListener('click', async (e) => { 
      e.preventDefault(); 
      await applyFeedback(e.currentTarget, '取消', async () => { await controller.unlockMonth(); });
    });
  };

  const bindUserPicker = () => {
    const up = controller.ctx.userPicker;
    if (!up || up._bound) return;
    up._bound = true;
    up.input?.addEventListener('input', () => { try { up.rebuild(); } catch {} });
    up.select?.addEventListener('change', async () => {
      const next = String(up.select.value || '').trim();
      await controller.setActingUserId(next);
    });
  };

  const bindTargetDateSelect = () => {
    document.addEventListener('change', async (e) => {
      const sel = e.target?.closest?.('#targetDateSelect');
      if (!sel) return;
      const v = String(sel.value || '');
      if (/^\d{6}$/.test(v)) {
        const ym = `${v.slice(0, 4)}-${v.slice(4, 6)}`;
        await controller.setMonth(ym);
      }
    });
  };

  const bindMonthNav = () => {
    $('#btnPrevMonth')?.addEventListener('click', async () => { await controller.nextMonth(-1); });
    $('#btnNextMonth')?.addEventListener('click', async () => { await controller.nextMonth(1); });
    const handlePick = async (v) => {
      if (!/^\d{4}-\d{2}$/.test(v)) return;
      await controller.setMonth(v);
    };
    controller.ctx.picker1?.addEventListener('input', async () => {
      const v = controller.ctx.picker1.value;
      await handlePick(v);
    });
    controller.ctx.picker1?.addEventListener('change', async () => {
      const v = controller.ctx.picker1.value;
      await handlePick(v);
    });
    controller.ctx.picker2?.addEventListener('input', async () => {
      const v = controller.ctx.picker2.value;
      await handlePick(v);
    });
    controller.ctx.picker2?.addEventListener('change', async () => {
      const v = controller.ctx.picker2.value;
      await handlePick(v);
    });
    $('#btnReload')?.addEventListener('click', async (e) => { e.preventDefault(); await controller.reloadMonth(); });
  };

  const bindSaveExportImport = () => {
    const handleSave = async (e, btn) => {
      e.preventDefault();
      if (btn.dataset.saving === '1') return;
      if (!state.editableMonth) { alert('この月は入力できません。'); return; }
      if (!confirm('保存しますか？')) return;
      clearDirty();
      btn.dataset.saving = '1';
      const originalText = btn.dataset.originalText || btn.innerHTML;
      btn.dataset.originalText = originalText;
      btn.disabled = true;
      btn.innerHTML = '保存中...';
      core.showSpinner('save', false);
      try {
        await controller.saveManual();
        btn.innerHTML = '保存成功';
        btn.style.background = '#10b981'; // green
        btn.style.borderColor = '#10b981';
        btn.style.color = '#fff';
        core.showSpinner('save', true);
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.disabled = false;
          btn.dataset.saving = '0';
          core.hideSpinner();
        }, 1500);
      } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.dataset.saving = '0';
        core.hideSpinner();
        if (err && err.message) alert(err.message);
      }
    };

    $('#btnSave')?.addEventListener('click', (e) => handleSave(e, $('#btnSave')));
    $('#btnSaveBottom')?.addEventListener('click', (e) => handleSave(e, $('#btnSaveBottom')));
    document.querySelectorAll('.saveBtn').forEach((btn) => {
      btn.addEventListener('click', (e) => handleSave(e, btn));
    });
    document.querySelectorAll('.exportBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => { e.preventDefault(); await controller.exportXlsx(); });
    });
    document.querySelectorAll('.importBtn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!state.editableMonth) { alert('この月は入力できません。'); return; }
        clearDirty();
        showErr('');
        if (!controller.checkImportFile()) return;
        if (!confirm('ファイルを取込します。よろしいですか？')) return;
        alert('取込処理は未実装です。');
      });
    });
    document.querySelector('#btnBackBottom')?.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (window.history.length > 1) window.history.back();
        else window.location.href = '/ui/attendance';
      } catch {
        window.location.href = '/ui/attendance';
      }
    });
  };

  const bindSummaryEditor = () => {
    const wrap = document.querySelector('#summaryEditor');
    const btn = document.querySelector('#btnSummaryEdit');
    const picker = controller.ctx.picker;
    if (!wrap || !btn || !picker) return;

    const status = (msg) => {
      const el = wrap.querySelector('#summaryEditorStatus');
      if (el) el.textContent = msg || '';
    };
    const hmToMin = (s) => {
      const t = String(s || '').trim();
      if (!t) return 0;
      const m = t.match(/^(\\d+):(\\d{2})$/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (!Number.isFinite(h) || !Number.isFinite(mm) || mm < 0 || mm >= 60) return null;
      return Math.max(0, (h * 60) + mm);
    };
    const minToHm = (min) => {
      const m = Math.max(0, Number(min || 0));
      const h = Math.floor(m / 60);
      const r = Math.floor(m % 60);
      return `${h}:${String(r).padStart(2, '0')}`;
    };
    const num = (v) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const getYM = () => {
      const ym = String(picker.value || '').trim();
      if (!/^\\d{4}-\\d{2}$/.test(ym)) return null;
      return { ym, year: parseInt(ym.slice(0, 4), 10), month: parseInt(ym.slice(5, 7), 10) };
    };
    const qUser = () => {
      const uid = controller.ctx.actingUserId || '';
      return uid ? `&userId=${encodeURIComponent(uid)}` : '';
    };
    const setAll = (o) => {
      const x = o && typeof o === 'object' ? o : {};
      wrap.querySelector('#seAllPlannedDays').value = String(x.plannedDays == null ? '' : x.plannedDays);
      wrap.querySelector('#seAllAttendDays').value = String(x.attendDays == null ? '' : x.attendDays);
      wrap.querySelector('#seAllHolidayWorkDays').value = String(x.holidayWorkDays == null ? '' : x.holidayWorkDays);
      wrap.querySelector('#seAllStandbyDays').value = String(x.standbyDays == null ? '' : x.standbyDays);
      wrap.querySelector('#seAllTotalWork').value = minToHm(x.totalWorkMinutes == null ? 0 : x.totalWorkMinutes);
      wrap.querySelector('#seAllNight').value = minToHm(x.nightMinutes == null ? 0 : x.nightMinutes);
      wrap.querySelector('#seAllOvertime').value = minToHm(x.overtimeMinutes == null ? 0 : x.overtimeMinutes);
      wrap.querySelector('#seAllLegalOvertime').value = minToHm(x.legalOvertimeMinutes == null ? 0 : x.legalOvertimeMinutes);
      wrap.querySelector('#seAllPaidDays').value = String(x.paidDays == null ? '' : x.paidDays);
      wrap.querySelector('#seAllSubstituteDays').value = String(x.substituteDays == null ? '' : x.substituteDays);
      wrap.querySelector('#seAllUnpaidDays').value = String(x.unpaidDays == null ? '' : x.unpaidDays);
      wrap.querySelector('#seAllAbsentDays').value = String(x.absentDays == null ? '' : x.absentDays);
      wrap.querySelector('#seAllDeduction').value = minToHm(x.deductionMinutes == null ? 0 : x.deductionMinutes);
      wrap.querySelector('#seAllOnsiteDays').value = String(x.onsiteDays == null ? '' : x.onsiteDays);
      wrap.querySelector('#seAllRemoteDays').value = String(x.remoteDays == null ? '' : x.remoteDays);
      wrap.querySelector('#seAllSatelliteDays').value = String(x.satelliteDays == null ? '' : x.satelliteDays);
    };
    const setIh = (o) => {
      const x = o && typeof o === 'object' ? o : {};
      wrap.querySelector('#seIhPlannedDays').value = String(x.plannedDays == null ? '' : x.plannedDays);
      wrap.querySelector('#seIhAttendDays').value = String(x.attendDays == null ? '' : x.attendDays);
      wrap.querySelector('#seIhHolidayWorkDays').value = String(x.holidayWorkDays == null ? '' : x.holidayWorkDays);
      wrap.querySelector('#seIhStandbyDays').value = String(x.standbyDays == null ? '' : x.standbyDays);
      wrap.querySelector('#seIhTotalWork').value = minToHm(x.totalWorkMinutes == null ? 0 : x.totalWorkMinutes);
      wrap.querySelector('#seIhNight').value = minToHm(x.nightMinutes == null ? 0 : x.nightMinutes);
      wrap.querySelector('#seIhOvertime').value = minToHm(x.overtimeMinutes == null ? 0 : x.overtimeMinutes);
      wrap.querySelector('#seIhLegalOvertime').value = minToHm(x.legalOvertimeMinutes == null ? 0 : x.legalOvertimeMinutes);
      wrap.querySelector('#seIhPaidDays').value = String(x.paidDays == null ? '' : x.paidDays);
      wrap.querySelector('#seIhSubstituteDays').value = String(x.substituteDays == null ? '' : x.substituteDays);
      wrap.querySelector('#seIhUnpaidDays').value = String(x.unpaidDays == null ? '' : x.unpaidDays);
      wrap.querySelector('#seIhAbsentDays').value = String(x.absentDays == null ? '' : x.absentDays);
    };
    const getAll = () => {
      const totalWorkMinutes = hmToMin(wrap.querySelector('#seAllTotalWork').value);
      const nightMinutes = hmToMin(wrap.querySelector('#seAllNight').value);
      const overtimeMinutes = hmToMin(wrap.querySelector('#seAllOvertime').value);
      const legalOvertimeMinutes = hmToMin(wrap.querySelector('#seAllLegalOvertime').value);
      const deductionMinutes = hmToMin(wrap.querySelector('#seAllDeduction').value);
      if (totalWorkMinutes == null || nightMinutes == null || overtimeMinutes == null || legalOvertimeMinutes == null || deductionMinutes == null) return null;
      return {
        plannedDays: num(wrap.querySelector('#seAllPlannedDays').value),
        attendDays: num(wrap.querySelector('#seAllAttendDays').value),
        holidayWorkDays: num(wrap.querySelector('#seAllHolidayWorkDays').value),
        standbyDays: num(wrap.querySelector('#seAllStandbyDays').value),
        totalWorkMinutes,
        nightMinutes,
        overtimeMinutes,
        legalOvertimeMinutes,
        paidDays: num(wrap.querySelector('#seAllPaidDays').value),
        substituteDays: num(wrap.querySelector('#seAllSubstituteDays').value),
        unpaidDays: num(wrap.querySelector('#seAllUnpaidDays').value),
        absentDays: num(wrap.querySelector('#seAllAbsentDays').value),
        deductionMinutes,
        onsiteDays: num(wrap.querySelector('#seAllOnsiteDays').value),
        remoteDays: num(wrap.querySelector('#seAllRemoteDays').value),
        satelliteDays: num(wrap.querySelector('#seAllSatelliteDays').value)
      };
    };
    const getIh = () => {
      const totalWorkMinutes = hmToMin(wrap.querySelector('#seIhTotalWork').value);
      const nightMinutes = hmToMin(wrap.querySelector('#seIhNight').value);
      const overtimeMinutes = hmToMin(wrap.querySelector('#seIhOvertime').value);
      const legalOvertimeMinutes = hmToMin(wrap.querySelector('#seIhLegalOvertime').value);
      if (totalWorkMinutes == null || nightMinutes == null || overtimeMinutes == null || legalOvertimeMinutes == null) return null;
      return {
        plannedDays: num(wrap.querySelector('#seIhPlannedDays').value),
        attendDays: num(wrap.querySelector('#seIhAttendDays').value),
        holidayWorkDays: num(wrap.querySelector('#seIhHolidayWorkDays').value),
        standbyDays: num(wrap.querySelector('#seIhStandbyDays').value),
        totalWorkMinutes,
        nightMinutes,
        overtimeMinutes,
        legalOvertimeMinutes,
        paidDays: num(wrap.querySelector('#seIhPaidDays').value),
        substituteDays: num(wrap.querySelector('#seIhSubstituteDays').value),
        unpaidDays: num(wrap.querySelector('#seIhUnpaidDays').value),
        absentDays: num(wrap.querySelector('#seIhAbsentDays').value)
      };
    };
    const loadFromDetail = () => {
      setAll(state.currentMonthDetail?.monthSummary?.all || {});
      setIh(state.currentMonthDetail?.monthSummary?.inhouse || {});
    };
    const load = async () => {
      const ym = getYM();
      if (!ym) return;
      status('読込中...');
      const r = await core.fetchJSONAuth(`/api/attendance/month/summary?year=${encodeURIComponent(ym.year)}&month=${encodeURIComponent(ym.month)}${qUser()}`);
      setAll(r?.all || {});
      setIh(r?.inhouse || {});
      status('読込完了');
    };
    const save = async () => {
      const ym = getYM();
      if (!ym) return;
      const all = getAll();
      const ih = getIh();
      if (!all || !ih) { status('時間はH:MMで入力してください'); return; }
      status('保存中...');
      await core.fetchJSONAuth(`/api/attendance/month/summary?year=${encodeURIComponent(ym.year)}&month=${encodeURIComponent(ym.month)}${qUser()}`, {
        method: 'PUT',
        body: JSON.stringify({ year: ym.year, month: ym.month, userId: controller.ctx.actingUserId || undefined, all, inhouse: ih })
      });
      try {
        if (!state.currentMonthDetail) state.currentMonthDetail = {};
        state.currentMonthDetail.monthSummary = { all, inhouse: ih };
      } catch {}
      try { controller.ctx.applySummaryTab?.(); } catch {}
      status('保存しました');
    };

    btn.addEventListener('click', () => {
      const hidden = wrap.hasAttribute('hidden');
      if (hidden) wrap.removeAttribute('hidden');
      else wrap.setAttribute('hidden', '');
      try { loadFromDetail(); } catch {}
    });
    wrap.querySelector('#btnSummaryLoad')?.addEventListener('click', () => { load().catch(e => status(String(e?.message || '読込失敗'))); });
    wrap.querySelector('#btnSummarySave')?.addEventListener('click', () => { save().catch(e => status(String(e?.message || '保存失敗'))); });
  };

  const bindTableHost = () => {
    const tableHost = controller.ctx.tableHost;
    if (!tableHost) return;
    if (tableHost.dataset.boundMonthlyHost === '1') return;
    tableHost.dataset.boundMonthlyHost = '1';
    const role = String(controller?.ctx?.profile?.role || '').toLowerCase();

    const ensurePaidLeaveRequest = async (row, dateStr) => {
      if (!row || !dateStr) return;
      if (role !== 'employee') return;
      if (row.dataset.paidLeaveRequested === '1') return;
      try {
        await core.fetchJSONAuth('/api/leave/paid', {
          method: 'POST',
          body: JSON.stringify({ startDate: dateStr, endDate: dateStr, reason: '' })
        });
        row.dataset.paidLeaveRequested = '1';
        try { root.Core?.showToast?.('有給申請を送信しました', 'success'); } catch {}
      } catch (err) {
        throw new Error(String(err?.message || '有給申請に失敗しました'));
      }
    };
    const cancelPaidLeaveRequest = async (row, dateStr) => {
      if (!row || !dateStr) return;
      if (role !== 'employee') return;
      try {
        await core.fetchJSONAuth('/api/leave/my/cancel-paid', {
          method: 'POST',
          body: JSON.stringify({ date: dateStr })
        });
        row.dataset.paidLeaveRequested = '';
      } catch (err) {
        throw new Error(String(err?.message || '有給申請の取消に失敗しました'));
      }
    };

    const applyHolidayLock = (row) => {
      if (!row) return;
      const sel = row.querySelector('select[data-field="classification"]');
      const v = String(sel?.value || '').trim();
      const dateStr = String(row.dataset.date || '').slice(0, 10);
      const dow = (() => {
        try { return core?.dowJa?.(dateStr) || ''; } catch { return ''; }
      })();
      const offDay = String(row.dataset.baseOff || '') === '1';
      const plannedKubun = offDay ? '休日' : '出勤';
      const effective = v || plannedKubun;
      const isHoliday = effective === '休日' || effective === '代替休日' || effective === '無給休暇' || effective === '有給休暇' || effective === '欠勤';
      const ctrls = Array.from(row.querySelectorAll('input, select, textarea, button')).filter(el => !el.matches('select[data-field="classification"], button[data-action="history"]'));
      for (const el of ctrls) {
        if (isHoliday) {
          el.setAttribute('disabled', '');
          el.setAttribute('data-row-disabled', '1');
        } else {
          el.removeAttribute('data-row-disabled');
          // Skip applying disabled state to break inputs on the monthly board
          // so employees can edit their break times manually
          const isBreakInput = el.matches('select[data-field="break"], select[data-field="nightBreak"]');
          if (isBreakInput) {
            el.removeAttribute('disabled');
          } else if (state.editableMonth && !el.hasAttribute('data-fixed-disabled')) {
            el.removeAttribute('disabled');
          }
        }
      }
      
      // Khôi phục giờ nếu được đổi về ngày đi làm (kể cả khi chỉ là Dự kiến)
      if (!isHoliday) {
        const inEl = row.querySelector('input.se-time[data-field="checkIn"]');
        const outEl = row.querySelector('input.se-time[data-field="checkOut"]');
        const br = row.querySelector('select[data-field="break"]');
        const nb = row.querySelector('select[data-field="nightBreak"]');
        
        if (inEl && !inEl.value) {
          inEl.value = inEl.dataset.actual || inEl.dataset.autoVal || '';
          if (inEl.dataset.actual) inEl.dataset.manual = '1';
        }
        if (outEl && !outEl.value) {
          outEl.value = outEl.dataset.actual || outEl.dataset.autoVal || '';
          if (outEl.dataset.actual) outEl.dataset.manual = '1';
        }
        if (br && br.value === '0:00' && br.dataset.actual && br.dataset.actual !== '0:00') {
          br.value = br.dataset.actual;
        }
        if (nb && nb.value === '0:00' && nb.dataset.actual && nb.dataset.actual !== '0:00') {
          nb.value = nb.dataset.actual;
        }
        // Nếu là ngày đi làm (hoặc dự kiến đi làm) thì KHÔNG được clear dữ liệu
        return;
      }
      
      // Nếu là ngày nghỉ thì clear các ô
      const ckOn = row.querySelector('input[data-field="ckOnsite"]');
      const ckRe = row.querySelector('input[data-field="ckRemote"]');
      const ckSa = row.querySelector('input[data-field="ckSatellite"]');
      if (ckOn) ckOn.checked = false;
      if (ckRe) ckRe.checked = false;
      if (ckSa) ckSa.checked = false;
      try { row.dataset.workType = ''; } catch {}
      
      const inEl = row.querySelector('input.se-time[data-field="checkIn"]');
      const outEl = row.querySelector('input.se-time[data-field="checkOut"]');
      const br = row.querySelector('select[data-field="break"]');
      const nb = row.querySelector('select[data-field="nightBreak"]');
      
      const loc = row.querySelector('input[data-field="location"]');
      const memo = row.querySelector('input[data-field="memo"]');
      const notes = row.querySelector('input[data-field="notes"]');
      // Không clear location và memo khi là ngày nghỉ để tránh mất dữ liệu
      // if (loc) loc.value = '';
      // if (memo) memo.value = '';
      if (notes) notes.value = '';
      if (inEl) inEl.value = '';
      if (outEl) outEl.value = '';
      try { inEl?.classList?.remove('invalid'); } catch {}
      try { outEl?.classList?.remove('invalid'); } catch {}
      if (br) br.value = '0:00';
      if (nb) nb.value = '0:00';
      const idRaw = String(row.dataset.id || '').trim();
      if (idRaw) {
        row.dataset.clear = '1';
      }
    };

    const applyHolidayLockAll = () => {
      try {
        const rows = Array.from(tableHost.querySelectorAll('[data-row="1"][data-date]'));
        for (const r of rows) applyHolidayLock(r);
      } catch {}
    };

    applyHolidayLockAll();
    try {
      const obs = new MutationObserver(() => { applyHolidayLockAll(); });
      obs.observe(tableHost, { childList: true, subtree: true });
      tableHost._monthlyHolidayObs = obs;
    } catch {}

    tableHost.addEventListener('change', async (e) => {
      const row = e.target?.closest?.('[data-row="1"][data-date]');
      if (row) { 
        if (!state.editableMonth) return;
        try { row.dataset.dirty = '1'; } catch {} 
        
        const kubunSel = e.target?.closest?.('select[data-field="classification"]');
        const timeEl = e.target?.closest?.('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]');
        const otherEl = e.target?.closest?.('select[data-field], input[type="text"][data-field]');
        
        if (kubunSel || timeEl || otherEl) {
          if (timeEl) {
            const val = String(timeEl.value || '').trim();
            timeEl.dataset.prev = val;
            timeEl.dataset.auto = '';
            timeEl.dataset.autoVal = '';
            timeEl.dataset.manual = '1';
            timeEl.classList.remove('is-auto');

            const tIn = row.querySelector('input.se-time[data-field="checkIn"]')?.value;
            const tOut = row.querySelector('input.se-time[data-field="checkOut"]')?.value;
            if (tIn || tOut) {
              const sel = row.querySelector('.kubun-sel');
              if (sel) {
                let k = sel.value || '';
                if (!k || k.includes('予定') || k === '出勤' || k === '休日出勤') {
                  // Only update kubun if it's currently a placeholder/planned value
                  // Use logic similar to what backend would assign
                  const isSat = !!row.querySelector('.col-date')?.classList.contains('sat');
                  const isSun = !!row.querySelector('.col-date')?.classList.contains('sun');
                  const isHol = !!row.querySelector('.col-date')?.classList.contains('hol');
                  if (isSat || isSun || isHol) {
                    k = '休日出勤';
                  } else {
                    k = '出勤';
                  }
                  
                  // Update the select element's visual value
                  sel.value = k;
                  try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
                  
                  row.dataset.kubunConfirmed = '1';
                  applyHolidayLock(row);
                }
              }
            }
          }
          
          if (kubunSel) {
            const v = String(kubunSel.value || '').trim();
            row.dataset.kubunConfirmed = v ? '1' : '';
            applyHolidayLock(row);
            if (v === '有給休暇') {
              const dateStr = String(row.dataset.date || '').slice(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                try {
                  await ensurePaidLeaveRequest(row, dateStr);
                } catch (err) {
                  alert(String(err?.message || '有給申請に失敗しました'));
                }
              }
            } else {
              const dateStr = String(row.dataset.date || '').slice(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                try {
                  await cancelPaidLeaveRequest(row, dateStr);
                } catch (err) {
                  alert(String(err?.message || '有給申請の取消に失敗しました'));
                }
              }
            }
          }
          
          // QUAN TRỌNG: Lưu ngay lập tức khi người dùng thay đổi bất kỳ giá trị nào (Kubun, Giờ, Ghi chú...)
          try { 
            await controller.saveRowTimesNow(row); 
            if (timeEl) timeEl.dataset.prev = timeEl.value;
            
            // Update dataset so it reflects the saved values
            const brSel = row.querySelector('select[data-field="break"]');
            const nbrSel = row.querySelector('select[data-field="nightBreak"]');
            if (brSel) brSel.dataset.actual = brSel.value || '';
            if (nbrSel) nbrSel.dataset.actual = nbrSel.value || '';
          } catch (err) {
            console.warn('Save failed:', err);
          }
          render.recomputeRow(row);
        }
      }
      try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch {}
      try { controller.scheduleAutoSave(); } catch {}
    });
    
    tableHost.addEventListener('input', (e) => {
      const row = e.target?.closest?.('[data-row="1"][data-date]');
      if (row) { 
        if (!state.editableMonth) return;
        try { row.dataset.dirty = '1'; } catch {} 
        
        // Khi người dùng đang nhập, xóa ngay trạng thái tự động để đổi màu sắc (UX)
        const timeEl = e.target?.closest?.('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]');
        if (timeEl) {
          // Store prev value for validation rollback
          if (!timeEl.dataset.prev) timeEl.dataset.prev = timeEl.value;
          
          timeEl.dataset.auto = '';
          timeEl.dataset.autoVal = '';
          timeEl.dataset.manual = '1';
          timeEl.classList.remove('is-auto');
        }
        // Giảm chớp: Không gọi recomputeRow liên tục khi đang gõ text
        const isTextInput = e.target?.matches?.('input[type="text"]');
        if (!isTextInput) {
          render.recomputeRow(row);
        }
      }
      // Giảm chớp: Không renderSummary liên tục khi đang nhập liệu
      // try { 
      //   if (root.SectionsRender && root.SectionsRender.renderSummary) {
      //     root.SectionsRender.renderSummary(document.querySelector('#monthSummaryTable') || document.querySelector('#monthSummary'), state.currentMonthDetail, state.currentMonthTimesheet);
      //   }
      // } catch(err) {}
      try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch {}
      try { controller.scheduleAutoSave(); } catch {}
    });
    tableHost.addEventListener('focusin', (e) => {
      const el = e.target?.closest?.('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]');
      if (!el) return;
    });
    tableHost.addEventListener('click', async (e) => {
      const dateCell = e.target?.closest?.('td.sticky-col-1');
      if (dateCell) {
        const tr = dateCell.closest?.('[data-row="1"][data-date]');
        if (!tr) return;
        if (role !== 'employee') return;
        if (!state.editableMonth) {
          alert('この月は入力できません。');
          return;
        }
        const dateStr = String(tr.dataset.date || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        const clsSel = tr.querySelector('select[data-field="classification"]');
        if (!clsSel) return;
        const offDay = String(tr.dataset.baseOff || '') === '1';
        if (offDay) {
          alert('休日には有給申請できません。');
          return;
        }
        if (!confirm(`${dateStr} を有給休暇として申請しますか？`)) return;
        try {
          await ensurePaidLeaveRequest(tr, dateStr);
          clsSel.value = '有給休暇';
          try { tr.dataset.kubunConfirmed = '1'; } catch {}
          try { applyHolidayLock(tr); } catch {}
          try { render.recomputeRow(tr); } catch {}
          try { await controller.saveRowTimesNow(tr); } catch {}
        } catch (err) {
          alert(String(err?.message || '有給申請に失敗しました'));
        }
        return;
      }
      const ck = e.target?.closest?.('input.se-check[data-field]');
      if (ck) {
        if (!state.editableMonth) { e.preventDefault(); alert('この月は入力できません。'); return; }
        const tr = ck.closest?.('[data-row="1"][data-date]');
        if (!tr) return;
        if (ck.hasAttribute('disabled')) return;
        try { tr.dataset.dirty = '1'; } catch {}
        const field = String(ck.getAttribute('data-field') || '');
        const ckOn = tr.querySelector('input[data-field="ckOnsite"]');
        const ckRe = tr.querySelector('input[data-field="ckRemote"]');
        const ckSa = tr.querySelector('input[data-field="ckSatellite"]');
        if (ck.checked) {
          if (field !== 'ckOnsite' && ckOn) ckOn.checked = false;
          if (field !== 'ckRemote' && ckRe) ckRe.checked = false;
          if (field !== 'ckSatellite' && ckSa) ckSa.checked = false;
        }
        recomputeRow(tr);
        try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch {}
        try { controller.scheduleAutoSave(); } catch {}
        return;
      }
      const btn = e.target?.closest?.('button[data-action]');
      if (!btn) return;
      const tr = btn.closest?.('[data-row="1"][data-date]');
      if (!tr) return;
      const action = String(btn.dataset.action || '');
      const dateStr = String(tr.dataset.date || '');
      if (action === 'clear') {
        if (confirm('この行の入力内容をクリアしますか？')) {
          // Reset manual flags when clearing
          tr.querySelectorAll('input.se-time').forEach(el => {
            el.dataset.manual = '';
          });
          try { await controller.clearRow(tr); } catch {}
          try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch {}
        }
        return;
      }
      if (action === 'history') {
        controller.tableHistory(dateStr);
      }
    });
  };

  const bind = () => {
    bindDirtyOnBlur();
    bindWindowResize();
    bindAutoReloadOnReturn();
    bindCollapseToggles();
    bindTabs();
    bindWorkflowButtons();
    bindUserPicker();
    bindTargetDateSelect();
    try { controller.syncMonthHScroll?.(); } catch {}
    bindMonthNav();
    bindSaveExportImport();
    bindSummaryEditor();
    bindTableHost();
    try { wireUserMenu(); } catch {}
  };

  const boot = async () => {
    if (!controller) return;
    const ok = await controller.init();
    if (!ok) return;
    bind();
    await controller.setMonth(controller.ctx.initialYM, true, { spinner: false });
    hideSpinner();
    bindUserPicker();
  };

  const Events = { boot, bind, bindUserPicker };
  root.Events = Events;
  globalThis.AttendanceMonthly = root;
})();
// end
