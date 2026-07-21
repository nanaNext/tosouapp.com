(function () {
  const root = globalThis.AttendanceMonthly || {};
  const core = root.Core || globalThis.MonthlyMonthlyCore || {};
  const state = root.State || globalThis.MonthlyMonthlyState || {};
  const render = root.Render || globalThis.MonthlyMonthlyRender || {};
  const draft = root.Draft || globalThis.MonthlyMonthlyDraft || null;
  const controller = root.Controller;

  const { $, setDirty, clearDirty, showErr, hideSpinner, wireUserMenu, wireTopNavDropdowns } = core;
  const { recomputeRow: _origRecomputeRow } = render;
  const recomputeRow = (tr) => {
    if (!tr) return;
    if (tr.dataset.blockRecalc === '1') return; // Skip recalculation if blocked
    if (_origRecomputeRow) return _origRecomputeRow(tr);
  };
  render.recomputeRow = recomputeRow;

  let lastAutoReloadAt = 0;
  const bindAutoReloadOnReturn = () => {
    const maybeReload = async () => {
      if (!controller) return;
      if (state.dirty) return;
      const now = Date.now();
      if (now - lastAutoReloadAt < 2000) return;
      lastAutoReloadAt = now;
      // Disabled auto-reload to prevent flicker
      // try { await controller.reloadMonth(); } catch (e) { /* silently ignored */ }
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
      try { requestAnimationFrame(() => controller.syncMonthHScroll()); } catch (e) { /* silently ignored */ }
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
          try { controller.ctx.applyContractTab?.(); } catch (e) { /* silently ignored */ }
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
          try { controller.ctx.applySummaryTab?.(); } catch (e) { /* silently ignored */ }
        });
      }
    }
    
    const dSec = $('#dailySection');
    if (dSec && dSec.dataset.tabsWired !== '1') {
      dSec.dataset.tabsWired = '1';
      const tabs = Array.from(dSec.querySelectorAll('.se-tab[data-tab]'));
      for (const t of tabs) {
        t.addEventListener('click', (e) => {
          e.preventDefault();
          if (t.hasAttribute('disabled')) return;
          if (t.dataset.tab === 'plan') {
            document.body.classList.add('view-plan');
            const table = document.getElementById('monthTableReal');
            if (table) {
              const cg = table.querySelector('colgroup');
              if (cg) cg.style.display = 'none';
              table.style.tableLayout = '';
              table.style.width = '';
            }
          } else if (t.dataset.tab === 'actual') {
            document.body.classList.remove('view-plan');
            const table = document.getElementById('monthTableReal');
            if (table) {
              const cg = table.querySelector('colgroup');
              if (cg) cg.style.display = '';
              table.style.tableLayout = 'fixed';
              table.style.width = '';
            }
          }
          for (const x of tabs) {
            x.classList.toggle('active', x === t);
          }
          window.dispatchEvent(new Event('resize'));
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
        }, 600);

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
    up.input?.addEventListener('input', () => { try { up.rebuild(); } catch (e) { /* silently ignored */ } });
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
        }, 600);
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
      } catch (e) {
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
      } catch (e) { /* silently ignored */ }
      try { controller.ctx.applySummaryTab?.(); } catch (e) { /* silently ignored */ }
      status('保存しました');
    };

    btn.addEventListener('click', () => {
      const hidden = wrap.hasAttribute('hidden');
      if (hidden) wrap.removeAttribute('hidden');
      else wrap.setAttribute('hidden', '');
      try { loadFromDetail(); } catch (e) { /* silently ignored */ }
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
        try { root.Core?.showToast?.('有給申請を送信しました', 'success'); } catch (e) { /* silently ignored */ }
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
        try { return core?.dowJa?.(dateStr) || ''; } catch (e) { return ''; }
      })();
      const offDay = String(row.dataset.baseOff || '') === '1';
      const plannedKubun = offDay ? '休日' : '出勤';
      const effective = v || plannedKubun;
      const isHoliday = effective === '休日' || effective === '代替休日' || effective === '無給休暇' || effective === '有給休暇' || effective === '欠勤';
      const ctrls = Array.from(row.querySelectorAll('input, select, textarea, button')).filter(el => !el.matches('select[data-field="classification"], button[data-action="history"], select[data-field="reason"], input[data-field="notes"]'));
      for (const el of ctrls) {
        if (isHoliday) {
          el.setAttribute('disabled', '');
          el.setAttribute('data-row-disabled', '1');
        } else {
          el.removeAttribute('data-row-disabled');
          // Always unlock break times so employees/managers can edit them
          if (el.matches('select[data-field="break"], select[data-field="nightBreak"], select[data-field="breakMin"], select[data-field="nightBreakMin"]')) {
            el.removeAttribute('disabled');
            el.removeAttribute('data-fixed-disabled'); // Ensure break times are never locked
          } else if (state.editableMonth) {
            // Mở khóa nếu không có data-fixed-disabled
            if (!el.hasAttribute('data-fixed-disabled')) {
              el.removeAttribute('disabled');
            } else if (el.matches('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]')) {
              // Ngoại lệ: Nếu là dòng phụ (không phải primary), thì checkIn và checkOut luôn được mở khóa
              if (String(row.dataset.primary || '') !== '1') {
                el.removeAttribute('disabled');
                el.removeAttribute('data-fixed-disabled');
              }
            }
          }
        }
      }
      
      // Khôi phục giờ nếu được đổi về ngày đi làm (kể cả khi chỉ là Dự kiến)
      if (!isHoliday) {
        row.dataset.holidayLocked = '';
        row.dataset.clear = ''; // QUAN TRỌNG: Phải xóa cờ clear để không bị xóa nhầm khi nhấn nút Lưu
        const inEl = row.querySelector('input.se-time[data-field="checkIn"]');
        const outEl = row.querySelector('input.se-time[data-field="checkOut"]');
        
        // Khôi phục Check-In
        if (inEl) {
          // Ưu tiên: 1. Backup từ thao tác tay -> 2. Giờ thực tế từ Server -> 3. Giờ trên ô nhập (nếu có) -> 4. Giờ tự động
          const inValToRestore = row.dataset.inBackup || row.dataset.actualIn || inEl.dataset.actual || inEl.dataset.autoVal || '';
          // Bắt buộc ghi đè lại giá trị để khôi phục
          inEl.value = inValToRestore;
          
          if (row.dataset.inBackup || row.dataset.actualIn || inEl.dataset.actual) {
            inEl.dataset.manual = '1';
            inEl.dataset.auto = '';
            inEl.classList.remove('is-auto');
          }
        }
        
        // Khôi phục Check-Out
        if (outEl) {
          const outValToRestore = row.dataset.outBackup || row.dataset.actualOut || outEl.dataset.actual || outEl.dataset.autoVal || '';
          outEl.value = outValToRestore;
          
          if (row.dataset.outBackup || row.dataset.actualOut || outEl.dataset.actual) {
            outEl.dataset.manual = '1';
            outEl.dataset.auto = '';
            outEl.classList.remove('is-auto');
          }
        }
        
        const loc = row.querySelector('[data-field="location"]');
        const memo = row.querySelector('[data-field="memo"]');
        const notes = row.querySelector('[data-field="notes"]');
        if (loc) {
          loc.value = row.dataset.locBackup || row.dataset.locationBase || loc.value || '';
          loc.style.visibility = 'visible';
        }
        if (memo) {
          memo.value = row.dataset.memoBackup || row.dataset.memoBase || memo.value || '';
          memo.style.visibility = 'visible';
        }
        if (notes) {
          row.dataset.holidayNotesBackup = notes.value;
          notes.value = row.dataset.notesBackup || row.dataset.notesBase || '';
          notes.style.visibility = 'visible';
        }
        
        const br = row.querySelector('select[data-field="break"]');
        const nb = row.querySelector('select[data-field="nightBreak"]');
        if (br) br.style.visibility = 'visible';
        if (nb) nb.style.visibility = 'visible';
        
        let wtRestored = row.dataset.workTypeBackup || row.dataset.workTypeBase || '';
        if (!wtRestored) wtRestored = 'onsite';
        
        row.dataset.workType = wtRestored;
        const ckOn = row.querySelector('input[data-field="ckOnsite"]');
        const ckRe = row.querySelector('input[data-field="ckRemote"]');
        const ckSa = row.querySelector('input[data-field="ckSatellite"]');
        if (ckOn) {
          ckOn.checked = (wtRestored === 'onsite');
          ckOn.style.visibility = 'visible';
        }
        if (ckRe) {
          ckRe.checked = (wtRestored === 'remote');
          ckRe.style.visibility = 'visible';
        }
        if (ckSa) {
          ckSa.checked = (wtRestored === 'satellite');
          ckSa.style.visibility = 'visible';
        }
        
        // Cập nhật lại UI sau khi khôi phục
        try {
          if (typeof _origRecomputeRow === 'function') {
            _origRecomputeRow(row);
          } else if (globalThis.MonthlyMonthlyRender && typeof globalThis.MonthlyMonthlyRender.recomputeRow === 'function') {
            globalThis.MonthlyMonthlyRender.recomputeRow(row);
          }
        } catch (e) { /* silently ignored */ }
      } else {
        // Nếu là ngày nghỉ thì clear giao diện để màn hình gọn gàng (nhưng đã backup ngầm ở trên)
        const ckOn = row.querySelector('input[data-field="ckOnsite"]');
        const ckRe = row.querySelector('input[data-field="ckRemote"]');
        const ckSa = row.querySelector('input[data-field="ckSatellite"]');
        
        const inEl = row.querySelector('input.se-time[data-field="checkIn"]');
        const outEl = row.querySelector('input.se-time[data-field="checkOut"]');
        const br = row.querySelector('select[data-field="break"]');
        const nb = row.querySelector('select[data-field="nightBreak"]');
        
        const loc = row.querySelector('[data-field="location"]');
        const memo = row.querySelector('[data-field="memo"]');
        const notes = row.querySelector('[data-field="notes"]');
        
        // Backup tất cả dữ liệu trước khi clear ONLY ONCE when entering holiday state
        if (row.dataset.holidayLocked !== '1') {
          if (inEl && inEl.value) row.dataset.inBackup = inEl.value;
          if (outEl && outEl.value) row.dataset.outBackup = outEl.value;
          if (loc && loc.value) row.dataset.locBackup = loc.value;
          if (memo && memo.value) row.dataset.memoBackup = memo.value;
          if (notes) row.dataset.notesBackup = notes.value;
          const currentWt = (ckOn?.checked ? 'onsite' : ckRe?.checked ? 'remote' : ckSa?.checked ? 'satellite' : row.dataset.workType || '');
          if (currentWt) row.dataset.workTypeBackup = currentWt;
          row.dataset.holidayLocked = '1';
          
          if (notes) {
            notes.value = row.dataset.holidayNotesBackup || '';
          }
        }
        
        if (ckOn) {
          ckOn.checked = false;
          ckOn.style.visibility = 'hidden';
        }
        if (ckRe) {
          ckRe.checked = false;
          ckRe.style.visibility = 'hidden';
        }
        if (ckSa) {
          ckSa.checked = false;
          ckSa.style.visibility = 'hidden';
        }
        
        // QUAN TRỌNG: KHÔNG ĐƯỢC XÓA TRẮNG VALUE CỦA CÁC Ô TEXT. CHỈ ĐƯỢC LÀM MỜ (DISABLED).
        // Nếu xóa trắng thì khi saveRowTimesNow chạy, nó sẽ gửi string rỗng lên server.
        // if (loc) loc.value = '';
        // if (memo) memo.value = '';
        // if (notes) notes.value = '';
        
        if (loc) {
          loc.style.visibility = 'hidden';
        }
        if (memo) {
          memo.style.visibility = 'hidden';
        }
        
        // Để làm ẩn text trên UI nhưng vẫn giữ value cho hàm Save, ta dùng CSS hoặc chỉ để trống lúc render.
        // Ở đây ta đã có logic render trả về string rỗng khi là ngày nghỉ, 
        // nhưng lúc đang thao tác (event) thì không nên xóa value của DOM.
        if (inEl) {
          inEl.value = '';
          inEl.dataset.autoVal = '';
        }
        if (outEl) {
          outEl.value = '';
          outEl.dataset.autoVal = '';
        }
        try { inEl?.classList?.remove('invalid'); } catch (e) { /* silently ignored */ }
        try { outEl?.classList?.remove('invalid'); } catch (e) { /* silently ignored */ }
        if (br) {
          br.value = '0:00';
          br.style.visibility = 'hidden';
        }
        if (nb) {
          nb.value = '0:00';
          nb.style.visibility = 'hidden';
        }
        
        const idRaw = String(row.dataset.id || '').trim();
        if (idRaw) {
          row.dataset.clear = '1';
        }
      }
    };

    const applyHolidayLockAll = () => {
      try {
        const _sh = document.querySelector('.kintai-main');
        const _st = _sh ? _sh.scrollTop : 0;
        const rows = Array.from(tableHost.querySelectorAll('[data-row="1"][data-date]'));
        for (const r of rows) applyHolidayLock(r);
        if (_sh && _sh.scrollTop !== _st) _sh.scrollTop = _st;
      } catch (e) { /* silently ignored */ }
    };

    applyHolidayLockAll();
    try {
      const obs = new MutationObserver((mutations) => {
        let hasNewRows = false;
        for (const m of mutations) {
          if (m.addedNodes) {
            for (let i = 0; i < m.addedNodes.length; i++) {
              const n = m.addedNodes[i];
              if (n.nodeName === 'TR' || n.nodeName === 'TBODY' || n.nodeName === 'TABLE') {
                hasNewRows = true;
                break;
              }
            }
          }
          if (hasNewRows) break;
        }
        if (hasNewRows) applyHolidayLockAll();
      });
      obs.observe(tableHost, { childList: true, subtree: true });
      tableHost._monthlyHolidayObs = obs;
    } catch (e) { /* silently ignored */ }

    tableHost.addEventListener('change', async (e) => {
      const row = e.target?.closest?.('[data-row="1"][data-date]');
      if (row) { 
        if (!state.editableMonth) return;
        // Preserve scroll position to prevent page jumping during DOM mutations
        const scrollHost = document.querySelector('.kintai-main');
        const savedScrollTop = scrollHost ? scrollHost.scrollTop : 0;
        const savedScrollLeft = scrollHost ? scrollHost.scrollLeft : 0;
        const restoreScroll = () => {
          if (scrollHost) {
            if (scrollHost.scrollTop !== savedScrollTop) scrollHost.scrollTop = savedScrollTop;
            if (scrollHost.scrollLeft !== savedScrollLeft) scrollHost.scrollLeft = savedScrollLeft;
          }
        };
        try { row.dataset.dirty = '1'; } catch (e) { /* silently ignored */ } 
        
        const kubunSel = e.target?.closest?.('select[data-field="classification"]');
        const timeEl = e.target?.closest?.('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]');
        const otherEl = e.target?.closest?.('select[data-field], input[type="text"][data-field], textarea[data-field]');
        
        const brInput = row.querySelector('select[data-field="break"], select[data-field="breakMin"]');
      const nbInput = row.querySelector('select[data-field="nightBreak"], select[data-field="nightBreakMin"]');
      
      // Always mark break time as manual when user explicitly selects a new value.
      if (e.target === brInput || e.target === nbInput) {
        e.target.dataset.manual = '1';
        e.target.dataset.auto = '0';
        
        // Update immediately
        if (typeof _origRecomputeRow === 'function') {
          _origRecomputeRow(row);
        } else if (globalThis.MonthlyMonthlyRender && typeof globalThis.MonthlyMonthlyRender.recomputeRow === 'function') {
          globalThis.MonthlyMonthlyRender.recomputeRow(row);
        }
        
        try { 
          await controller.saveRowTimesNow(row); 
          // Make sure dataset actual is updated
          if (brInput) brInput.dataset.actual = brInput.value || '';
          if (nbInput) nbInput.dataset.actual = nbInput.value || '';
        } catch (err) {
          console.warn('Save failed:', err);
        }
        return; // Skip the rest of the auto-logic
      }

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
                  
                  // Luôn luôn gán giá trị và gọi trigger change để UI cập nhật
                  row.dataset.blockRecalc = '1';
                  
                  // Keep track of original break values so they don't get lost during change event
                  const brSel = row.querySelector('select[data-field="break"]');
                  const origBrVal = brSel ? brSel.value : null;
                  
                  sel.value = k;
                  try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* silently ignored */ }
                  
                  // Restore break value if it was wiped by any generic handler
                  if (brSel && origBrVal !== null && brSel.value !== origBrVal) {
                    brSel.value = origBrVal;
                  }
                  
                  // Also ensure break time doesn't get auto-overwritten by recomputeRow
                  if (brSel && origBrVal !== null) {
                    brSel.dataset.auto = '0';
                    brSel.dataset.manual = '1';
                  }
                  
                  row.dataset.blockRecalc = '';
                  
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
            restoreScroll();
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
            restoreScroll();
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
          restoreScroll();
        }
      }
      try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch (e) { /* silently ignored */ }
      try { controller.scheduleAutoSave(); } catch (e) { /* silently ignored */ }
    });
    
    tableHost.addEventListener('input', (e) => {
      const row = e.target?.closest?.('[data-row="1"][data-date]');
      if (row) { 
        if (!state.editableMonth) return;
        try { row.dataset.dirty = '1'; } catch (e) { /* silently ignored */ } 
        
        // Mark manual on input to prevent recomputeRow from overwriting during the input event
        if (e.target.matches('select[data-field="break"], select[data-field="nightBreak"]')) {
          e.target.dataset.manual = '1';
          e.target.dataset.auto = '0';
        }

        // Khi người dùng đang nhập, xóa ngay trạng thái tự động để đổi màu sắc (UX)
        const timeEl = e.target?.closest?.('input.se-time[data-field="checkIn"], input.se-time[data-field="checkOut"]');
        if (timeEl) {
          // Store prev value for validation rollback
          if (!timeEl.dataset.prev) timeEl.dataset.prev = timeEl.value;
          
          timeEl.dataset.auto = '';
          timeEl.dataset.autoVal = '';
          timeEl.dataset.manual = '1';
          timeEl.classList.remove('is-auto');
          
          if (String(timeEl.value || '').trim() !== '') {
            row.dataset.clear = '';
          }
        }
        // Giảm chớp: Không gọi recomputeRow liên tục khi đang gõ text
        const tag = (e.target?.tagName || '').toLowerCase();
        const type = (e.target?.type || '').toLowerCase();
        const isTextInput = tag === 'textarea' || (tag === 'input' && type === 'text');
        if (!isTextInput) {
          render.recomputeRow(row);
        }
      }
      // Giảm chớp: Không renderSummary liên tục khi đang nhập liệu
      // try { 
      //   if (root.SectionsRender && root.SectionsRender.renderSummary) {
      //     root.SectionsRender.renderSummary(document.querySelector('#monthSummaryTable') || document.querySelector('#monthSummary'), state.currentMonthDetail, state.currentMonthTimesheet);
      //   }
      // } catch (err) { /* silently ignored */ }
      try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch (e) { /* silently ignored */ }
      try { controller.scheduleAutoSave(); } catch (e) { /* silently ignored */ }
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
          try { tr.dataset.kubunConfirmed = '1'; } catch (e) { /* silently ignored */ }
          try { applyHolidayLock(tr); } catch (e) { /* silently ignored */ }
          try { render.recomputeRow(tr); } catch (e) { /* silently ignored */ }
          try { await controller.saveRowTimesNow(tr); } catch (e) { /* silently ignored */ }
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
        try { tr.dataset.dirty = '1'; } catch (e) { /* silently ignored */ }
        const field = String(ck.getAttribute('data-field') || '');
        const ckOn = tr.querySelector('input[data-field="ckOnsite"]');
        const ckRe = tr.querySelector('input[data-field="ckRemote"]');
        const ckSa = tr.querySelector('input[data-field="ckSatellite"]');
        if (ck.checked) {
          if (field !== 'ckOnsite' && ckOn) ckOn.checked = false;
          if (field !== 'ckRemote' && ckRe) ckRe.checked = false;
          if (field !== 'ckSatellite' && ckSa) ckSa.checked = false;
        }
          if (e.target.dataset.field === 'classification') {
            const val = e.target.value;
            e.target.classList.toggle('is-holiday', val === '休日' || val === '代替休日');
            e.target.classList.toggle('is-absence', val === '欠勤');
            e.target.classList.toggle('is-planned', !val);
          }
          recomputeRow(tr);
        try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch (e) { /* silently ignored */ }
        try { controller.scheduleAutoSave(); } catch (e) { /* silently ignored */ }
        return;
      }
      const btn = e.target?.closest?.('button[data-action]');
      if (!btn) return;
      const tr = btn.closest?.('[data-row="1"][data-date]');
      if (!tr) return;
      const action = String(btn.dataset.action || '');
      const dateStr = String(tr.dataset.date || '');
      if (action === 'add') {
        e.preventDefault();
        try { await controller.addSegmentRow(dateStr); } catch (e) { console.error(e); }
        return;
      }
      if (action === 'clear') {
        const idRaw = String(tr.dataset.id || '').trim();
        const msg = idRaw ? 'この行を削除（またはクリア）しますか？' : 'この行の入力内容をクリアしますか？';
        if (confirm(msg)) {
          // Reset manual flags when clearing
          tr.querySelectorAll('input.se-time').forEach(el => {
            el.dataset.manual = '';
          });
          try { await controller.clearRow(tr); } catch (e) { /* silently ignored */ }
          try { draft?.schedule?.(controller.ctx, controller.ctx?.picker?.value || controller.ctx?.initialYM); } catch (e) { /* silently ignored */ }
        }
        return;
      }
      if (action === 'history') {
        controller.tableHistory(dateStr);
      }
    });
  };

  const bindPdfModal = () => {
    const btnOpen = document.querySelector('#btnExportWeek');
    const modal = document.querySelector('#employmentNoticeModal');
    const btnClose = document.querySelector('#btnEnmClose');
    const btnCloseBottom = document.querySelector('#btnEnmCloseBottom');
    const backdrop = document.querySelector('#enmBackdrop');
    const btnPrint = document.querySelector('#btnEnmPrint');

    if (!btnOpen || !modal) return;

    // Enable the button since we have the feature now
    btnOpen.removeAttribute('disabled');

    const closeModal = () => {
      modal.setAttribute('hidden', '');
    };

    const openModal = () => {
      // Get current date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      document.querySelector('#enmDate').textContent = `${yyyy}年${mm}月${dd}日`;

      // Get user info from DOM or state
      const targetMonthStr = document.querySelector('#monthPicker')?.value || '';
      if (targetMonthStr) {
        const [year, month] = targetMonthStr.split('-');
        document.querySelector('#enmTargetMonth').textContent = `${year}年${parseInt(month, 10)}月`;
      }

      document.querySelector('#enmEmpCode').textContent = (document.querySelector('#empCode')?.textContent || '').trim() || '—';
      document.querySelector('#enmEmpName').textContent = (document.querySelector('#staffName')?.textContent || '').trim() || '—';
      document.querySelector('#enmEmpDept').textContent = (document.querySelector('#empDept')?.textContent || '').trim() || '—';

      // Build daily table rows AND calculate summary dynamically based ONLY on actual records up to today
      const dailyTbody = document.querySelector('#enmDailyTable tbody');
      
      let sumAttendDays = 0;
      let sumWorkMins = 0;
      let sumOvertimeMins = 0;
      let sumNightMins = 0;
      let sumHolidayWorkMins = 0;

      // Ensure we get the latest timesheet
      const timesheetData = state.currentMonthTimesheet || {};
      const days = Array.isArray(timesheetData.days) ? timesheetData.days : [];
      const totals = timesheetData.totals || {};
      
      const parseHmToMin = (hmStr) => {
        if (!hmStr) return 0;
        const parts = String(hmStr).trim().split(':');
        if (parts.length !== 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };
      
      if (dailyTbody) {
        dailyTbody.innerHTML = '';
        const rows = document.querySelectorAll('#monthTableReal tbody tr[data-date]');
        
        // Lấy ngày hiện tại để xác định "quá khứ" và "tương lai"
        const currentYmd = new Date().toLocaleDateString('sv-SE'); // "YYYY-MM-DD"
        
        rows.forEach(tr => {
          const dateStr = tr.dataset.date || ''; // "YYYY-MM-DD"
          let dayDisplay = '';
          if (dateStr) {
            const m = parseInt(dateStr.slice(5, 7), 10);
            const d = parseInt(dateStr.slice(8, 10), 10);
            const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(dateStr).getDay()];
            dayDisplay = `${m}/${d}&nbsp;${dow}`;
          }
          
          const isFuture = dateStr > currentYmd;
          
          // Lấy dữ liệu timesheet chuẩn từ server nếu có
          const tsDay = days.find(d => d.date && d.date.slice(0, 10) === dateStr);
          
          // Trích xuất các trường từ UI
          const selKubun = tr.querySelector('select[data-field="classification"]');
          let kubun = selKubun ? selKubun.value : '';
          
          const inEl = tr.querySelector('input[data-field="checkIn"]');
          const outEl = tr.querySelector('input[data-field="checkOut"]');
          // Update the detection logic to check for the 'is-auto' class since dataset.actual is not reliable here
          const hasActualIn = inEl && inEl.value && !inEl.classList.contains('is-auto');
          const hasActualOut = outEl && outEl.value && !outEl.classList.contains('is-auto');
          let inHm = inEl ? inEl.value : '';
          let outHm = outEl ? outEl.value : '';
          
          const formatHm = (min) => {
            if (min == null) return '0:00';
            const m = Math.max(0, Number(min || 0));
            const h = Math.floor(m / 60);
            const r = Math.floor(m % 60);
            if (h === 0 && r === 0) return '0:00';
            return `${h}:${String(r).padStart(2, '0')}`;
          };

          let timeIn = inHm;
          let timeOut = outHm;
          let breakNormal = '0:00';
          const breakSel = tr.querySelector('select[data-field="break"]'); // Changed from breakMinutes to break CÁI NÀY LÀ DÙNG ĐỂ THAY ĐỔI FORM 
          if (breakSel) {
             const val = breakSel.value;
             if (val === '60' || val === '1:00') breakNormal = '1:00';
             else if (val === '45' || val === '0:45') breakNormal = '0:45';
             else if (val === '30' || val === '0:30') breakNormal = '0:30';
             else breakNormal = '0:00';
          }
          
          let breakNight = '0:00';
          const nightBreakSel = tr.querySelector('select[data-field="nightBreak"]'); // Changed from nightBreakMinutes to nightBreak
          if (nightBreakSel) {
             const val = nightBreakSel.value;
             if (val === '60' || val === '1:00') breakNight = '1:00';
             else if (val === '30' || val === '0:30') breakNight = '0:30';
             else breakNight = '0:00';
          }
          let workedTime = '0:00';
          let excessTime = '0:00';
          
          let isOnsite = tr.querySelector('input[data-field="ckOnsite"]')?.checked ? '〇' : '';
          let isRemote = tr.querySelector('input[data-field="ckRemote"]')?.checked ? '〇' : '';
          let isTravel = tr.querySelector('input[data-field="ckSatellite"]')?.checked ? '〇' : '';
          
          const notesEl = tr.querySelector('input[data-field="notes"]');
          let notes = notesEl ? notesEl.value : '';

          let dayWorkMins = 0;
          let dayOvertimeMins = 0;
          let dayNightMins = 0;
          
          if (tsDay) {
            // Lấy thẳng số phút từ server tính toán chuẩn xác
            dayWorkMins = tsDay.regularMinutes || 0;
            dayOvertimeMins = tsDay.overtimeMinutes || 0;
            dayNightMins = tsDay.nightMinutes || 0;
            
            workedTime = formatHm(dayWorkMins);
            excessTime = formatHm(dayOvertimeMins);
          } else if (inHm && outHm && !isFuture) {
            // Fallback nếu không có dữ liệu từ server (chỉ để dự phòng)
            let start = parseHmToMin(inHm);
            let end = parseHmToMin(outHm);
            if (end < start) end += 24 * 60; // Làm qua ngày hôm sau
            
            let nightWork = 0;
            const nightRanges = [[0, 300], [1320, 1740], [2760, 3180]]; // 0:00-5:00, 22:00-29:00
            for (const [rStart, rEnd] of nightRanges) {
                const overlapStart = Math.max(start, rStart);
                const overlapEnd = Math.min(end, rEnd);
                if (overlapStart < overlapEnd) nightWork += (overlapEnd - overlapStart);
            }
            const nightBreakMins = parseHmToMin(breakNight);
            dayNightMins = Math.max(0, nightWork - nightBreakMins);
          }
          
          // Logic 予定 và Ẩn giờ nếu chưa làm:
          const isPlanned = tr.classList.contains('planned');
          const isHolidayKubun = kubun === '休日' || kubun === '代替休日';
          const isLeaveKubun = kubun === '有給休暇' || kubun === '無給休暇' || kubun === '欠勤';
          
          // Xóa từng ô giờ nếu chưa có dữ liệu thực tế
          if (!hasActualIn) timeIn = '';
          if (!hasActualOut) timeOut = '';

          // Nếu chưa hoàn thành ca (chưa in hoặc chưa out), xóa các giờ tính toán
          if (!hasActualIn || !hasActualOut) {
             breakNormal = '';
             breakNight = '';
             workedTime = '';
             excessTime = '';
             dayWorkMins = 0;
             dayOvertimeMins = 0;
             dayNightMins = 0;
          }

          if (!hasActualIn && !hasActualOut) {
             if (isFuture || isPlanned) {
                if (!kubun || kubun === '出勤') kubun = '予定';
             }
             // Xóa cả địa điểm nếu là ngày chưa làm
             isOnsite = '';
             isRemote = '';
             isTravel = '';
          } else if (hasActualIn && hasActualOut) {
             // Calculate work time from UI cells directly
             const workedCell = tr.querySelector('td[data-field="worked"]');
             const excessCell = tr.querySelector('td[data-field="excess"]');
             if (workedCell) {
                 workedTime = workedCell.textContent.trim();
                 dayWorkMins = parseHmToMin(workedTime);
             }
             if (excessCell) {
                 excessTime = excessCell.textContent.trim();
                 dayOvertimeMins = parseHmToMin(excessTime);
             }
          }
          
          // Đảm bảo xóa vòng tròn "Nơi làm việc" (出社/在宅/出張) nếu là các ngày nghỉ/phép
          if (isHolidayKubun || isLeaveKubun || kubun === '予定') {
             isOnsite = '';
             isRemote = '';
             isTravel = '';
          } else if (hasActualIn || hasActualOut) {
            // NẾU CÓ DỮ LIỆU THỰC TẾ -> TÍNH TỔNG VÀO SUMMARY
            if (!isHolidayKubun && kubun !== '欠勤') {
               sumAttendDays++;
               sumWorkMins += dayWorkMins;
               sumOvertimeMins += dayOvertimeMins;
               sumNightMins += dayNightMins;
               
               // Chỉ cộng vào Giờ làm ngày nghỉ nếu phân loại (Sự do) được chọn đích danh là '休日出勤' (Làm ngày nghỉ)
               if (kubun === '休日出勤') {
                 sumHolidayWorkMins += dayWorkMins;
               }
            }
          }
          
          // Trích xuất người phê duyệt từ dữ liệu state.currentMonthStatus
          // Dữ liệu người phê duyệt thường áp dụng cho cả tháng, hoặc lấy từ monthStatus
          let approver = '';
          if (state.currentMonthStatus === 'approved') {
            approver = state.currentMonthDetail?.monthStatus?.approverName || '';
          }

          const html = `
            <tr>
              <td>${dayDisplay}</td>
              <td>${kubun}</td>
              <td>${isOnsite}</td>
              <td>${isRemote}</td>
              <td>${isTravel}</td>
              <td>${timeIn}</td>
              <td>${timeOut}</td>
              <td>${breakNormal}</td>
              <td>${breakNight}</td>
              <td>0:00</td>
              <td>${workedTime}</td>
              <td>${excessTime}</td>
              <td class="left-align" style="font-size:10px;">${notes}</td>
              <td>${approver}</td>
            </tr>
          `;
          dailyTbody.insertAdjacentHTML('beforeend', html);
        });
      }
      
      // Cập nhật lại Summary Table bằng dữ liệu TÍNH TOÁN THỰC TẾ
      const formatHm = (min) => {
        if (min == null) return '0:00';
        const m = Math.max(0, Number(min || 0));
        const h = Math.floor(m / 60);
        const r = Math.floor(m % 60);
        if (h === 0 && r === 0) return '0:00';
        return `${h}:${String(r).padStart(2, '0')}`;
      };

      // Vẫn lấy số ngày quy định từ state (vì nó cố định)
      const s = state.currentMonthDetail?.monthSummary?.all || {};
      document.querySelector('#enmPlanDays').textContent = (s.plannedDays || 0) + ' 日';
      
      // Ghi đè các thông số khác bằng dữ liệu quét thực tế từ UI
      document.querySelector('#enmAttendDays').textContent = sumAttendDays + ' 日';
      document.querySelector('#enmTotalWork').textContent = formatHm(sumWorkMins);
      document.querySelector('#enmOvertime').textContent = formatHm(sumOvertimeMins);
      
      // Sử dụng tổng giờ làm đêm được tính toán trực tiếp từ dữ liệu thực tế trên màn hình (để ép về 0:00 nếu không làm đêm)
      document.querySelector('#enmNightWork').textContent = formatHm(sumNightMins);
      
      document.querySelector('#enmHolidayWork').textContent = formatHm(sumHolidayWorkMins);

      modal.removeAttribute('hidden');
    };

    btnOpen.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        const printContent = document.querySelector('#enmPrintArea').innerHTML;
        
        let iframe = document.getElementById('print-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'print-iframe';
          iframe.style.position = 'fixed';
          iframe.style.width = '100vw';
          iframe.style.height = '100vh';
          iframe.style.left = '0';
          iframe.style.top = '0';
          iframe.style.border = 'none';
          iframe.style.opacity = '0';
          iframe.style.zIndex = '-9999';
          iframe.style.pointerEvents = 'none';
          document.body.appendChild(iframe);
        }

        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>就業状況通知書</title>
              <style>
                @page { 
                   margin: 0mm;
                   size: A4 portrait; 
                }
                body { 
                  font-family: "Meiryo", "Hiragino Kaku Gothic ProN", "MS PGothic", sans-serif; 
                  color: #000; 
                  margin: 0; 
                  padding: 0;
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact;
                }
                .enm-title { text-align: center; font-size: 18px; letter-spacing: 2px; margin-top: 10px; margin-bottom: 12px; font-weight: normal; }
                .enm-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
                .enm-company { font-size: 14px; font-weight: normal; }
                .enm-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; }
                .enm-table th, .enm-table td { border: 1px solid #000; padding: 4px; font-size: 11px; font-weight: normal; }
                .enm-table th { background: #e2e8f0 !important; text-align: center; }
                .enm-table td { text-align: left; }
                .enm-table.right-align td { text-align: right; }
                .enm-table.center-align td { text-align: center; }
                .enm-daily-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 8px; }
                .enm-daily-table th, .enm-daily-table td { border: 1px solid #000; padding: 3px; font-size: 10.5px; line-height: 1.2; font-weight: normal; text-align: center; vertical-align: middle; }
                .enm-daily-table th { background: #cbd5e1 !important; font-weight: normal; }
                .enm-daily-table td.left-align { text-align: left; }
                .enm-daily-table th, .enm-daily-table td { white-space: nowrap; word-break: keep-all; }
                .enm-daily-table td:nth-child(1) { min-width: 40px; }
                .enm-footer-text { font-size: 11px; margin-top: 8px; text-align: right; padding-right: 10px; }
                
                html, body {
                  width: 210mm;
                  margin: 0 auto;
                }
                .print-container {
                  width: 100%;
                  padding: 15mm 10mm 10mm 10mm;
                  box-sizing: border-box;
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${printContent}
              </div>
            </body>
          </html>
        `);
        iframe.contentWindow.document.close();
        
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      });
    }
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
    try { controller.syncMonthHScroll?.(); } catch (e) { /* silently ignored */ }
    bindMonthNav();
    bindSaveExportImport();
    bindSummaryEditor();
    bindTableHost();
    bindPdfModal();
    try { wireUserMenu(); } catch (e) { /* silently ignored */ }
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
