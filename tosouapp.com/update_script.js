const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('C:/tosouapp.com/attendance/backend/src/static/js/admin/employees/employees.page.js');
let code = fs.readFileSync(targetPath, 'utf8');

const styleBlock = `
      <style>
        .modern-emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; margin-bottom: 24px; }
        .modern-emp-section { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .modern-emp-section-full { grid-column: 1 / -1; margin-bottom: 0; }
        .modern-emp-header { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 20px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modern-emp-group { margin-bottom: 16px; }
        .modern-emp-group:last-child { margin-bottom: 0; }
        .modern-emp-label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .modern-emp-req { color: #ef4444; margin-left: 4px; }
        .modern-emp-input, .modern-emp-select, .modern-emp-textarea { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #0f172a; outline: none; box-sizing: border-box; background: #fff; transition: all 0.2s; }
        .modern-emp-input:focus, .modern-emp-select:focus, .modern-emp-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .modern-emp-readonly { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
        .modern-emp-row { display: flex; gap: 16px; margin-bottom: 16px; }
        .modern-emp-col { flex: 1; min-width: 0; }
        .audit-info { font-size: 12px; color: #64748b; display: flex; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0; }
        @media (max-width: 768px) {
          .modern-emp-grid { grid-template-columns: 1fr; }
          .modern-emp-row { flex-direction: column; gap: 0; }
          .modern-emp-col { margin-bottom: 16px; }
          .modern-emp-col:last-child { margin-bottom: 0; }
        }
      </style>
`;

const getAddHtml = () => `
      \${styleBlock}
      <div class="form-title" style="margin-bottom: 24px; font-size: 20px;">新規社員登録</div>
      
      <div class="modern-emp-grid">
        <!-- Cột trái: Personal -->
        <div class="modern-emp-section" style="margin-bottom: 0;">
          <h3 class="modern-emp-header">基本情報</h3>
          
          <div class="modern-emp-row">
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">社員番号</label>
                <input id="empCode" class="modern-emp-input" placeholder="例: 001">
              </div>
            </div>
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">氏名 <span class="modern-emp-req">*</span></label>
                <input id="empName" class="modern-emp-input" placeholder="山田 太郎">
              </div>
            </div>
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">メールアドレス <span class="modern-emp-req">*</span></label>
            <input id="empEmail" class="modern-emp-input" type="email" placeholder="taro.yamada@example.com">
          </div>
          
          <div class="modern-emp-group">
            <label class="modern-emp-label">初期パスワード <span class="modern-emp-req">*</span></label>
            <input id="empPass" class="modern-emp-input" type="password" placeholder="6文字以上">
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">※後でユーザー自身で変更可能です</div>
          </div>

          <div class="modern-emp-row">
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">生年月日</label>
                <input id="empBirth" type="date" class="modern-emp-input">
              </div>
            </div>
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">性別</label>
                <select id="empGender" class="modern-emp-select">
                  <option value="">未選択</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">電話番号</label>
            <input id="empPhone" class="modern-emp-input" placeholder="090-0000-0000">
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">住所</label>
            <input id="empAddr" class="modern-emp-input" placeholder="東京都...">
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">緊急連絡先</label>
            <input id="empEmergencyContact" class="modern-emp-input" placeholder="氏名・続柄・電話番号など">
          </div>
        </div>

        <!-- Cột phải: Work & HR -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="modern-emp-section" style="margin-bottom: 0;">
            <h3 class="modern-emp-header">職務情報</h3>
            
            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">部署</label>
                  <select id="empDept" class="modern-emp-select"><option value="">未設定</option>\${depts.map(d=>'<option value="'+d.id+'">'+d.name+'</option>').join('')}</select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">役割 <span class="modern-emp-req">*</span></label>
                  <select id="empRole" class="modern-emp-select">
                    <option value="employee">従業員</option>
                    <option value="manager">マネージャー</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">雇用形態 <span class="modern-emp-req">*</span></label>
                  <select id="empType" class="modern-emp-select">
                    <option value="full_time">正社員</option>
                    <option value="part_time">パート・アルバイト</option>
                    <option value="contract">契約社員</option>
                  </select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">レベル</label>
                  <select id="empLevel" class="modern-emp-select">
                    <option value="">未設定</option>
                    <option value="Junior">Junior</option>
                    <option value="Middle">Middle</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">直属マネージャー</label>
                  <select id="empManager" class="modern-emp-select"><option value="">未設定</option>\${managerOptions}</select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">勤務地</label>
                  <select id="empWorkLocation" class="modern-emp-select">
                    <option value="">未設定</option>
                    <option value="本社">本社</option>
                    <option value="支社A">支社A</option>
                    <option value="リモート">リモート</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">入社日</label>
                  <input id="empJoinDate" type="date" class="modern-emp-input">
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">試用期間終了</label>
                  <input id="empProbDate" type="date" class="modern-emp-input">
                </div>
              </div>
            </div>
          </div>

          <div class="modern-emp-section" style="margin-bottom: 0;">
            <h3 class="modern-emp-header">給与・状態</h3>
            
            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">ステータス <span class="modern-emp-req">*</span></label>
                  <select id="empStatus" class="modern-emp-select">
                    <option value="active">在職 (Active)</option>
                    <option value="leave">休職 (Leave of absence)</option>
                    <option value="retired">退職 (Retired)</option>
                    <option value="terminated">解雇 (Terminated)</option>
                    <option value="inactive">無効 (Inactive)</option>
                  </select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">休暇規則グループ</label>
                  <select id="empPtoPolicy" class="modern-emp-select">
                    <option value="">デフォルト</option>
                    <option value="A">正社員規則A</option>
                    <option value="B">契約社員規則B</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">基本給 (閲覧のみ)</label>
                  <input id="empBaseSalary" class="modern-emp-input modern-emp-readonly" readonly placeholder="給与管理で設定">
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">契約終了日</label>
                  <input id="empContractEnd" type="date" class="modern-emp-input">
                </div>
              </div>
            </div>
            
            <div class="modern-emp-group">
              <label class="modern-emp-label">備考</label>
              <textarea id="empNotes" class="modern-emp-textarea" style="height: 60px; resize: vertical;" placeholder="特記事項..."></textarea>
            </div>
          </div>
        </div>

        <!-- Section 3: Avatar Full width -->
        <div class="modern-emp-section modern-emp-section-full">
          <h3 class="modern-emp-header">プロフィール写真</h3>
          <div class="modern-emp-group">
            <div style="display: flex; gap: 24px; align-items: flex-start;">
              <div id="avatarPreviewBox" style="width: 120px; height: 120px; border-radius: 12px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; color: #94a3b8; font-size: 12px;">
                No Image
              </div>
              <div style="flex: 1;">
                <label class="modern-emp-label" style="margin-bottom: 8px;">画像をアップロード (Drag & Drop または クリック)</label>
                <input id="empAvatarFile" type="file" accept="image/*" class="modern-emp-input" style="padding: 16px; border: 2px dashed #cbd5e1; background: #f8fafc; cursor: pointer;">
                <div style="font-size: 11px; color: #64748b; margin-top: 8px;">推奨サイズ: 400x400px (JPG, PNG)。アップロード後、左側にプレビューが表示されます。</div>
                <input type="hidden" id="empAvatarUrl">
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;">
        <button type="submit" class="btn-primary" style="padding: 10px 24px; font-size: 15px; border-radius: 8px;">作成</button>
      </div>
      <div id="empCreateMsg" style="margin-top:10px;color:#0f172a;font-weight:600;"></div>
`;

const getEditHtml = () => `
      \${styleBlock}
      <div style="margin-bottom: 16px;"><a id="editBack" class="btn" href="#list" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; color: #334155; text-decoration: none; font-size: 13px;">← 社員一覧へ戻る</a></div>
      <div class="form-title" style="margin-bottom: 24px; font-size: 20px;">社員編集（\${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))}）</div>
      
      <div class="modern-emp-grid">
        <!-- Cột trái: Personal -->
        <div class="modern-emp-section" style="margin-bottom: 0;">
          <h3 class="modern-emp-header">基本情報</h3>
          
          <div class="modern-emp-row">
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">社員番号</label>
                <input id="empCode" class="modern-emp-input modern-emp-readonly" readonly value="\${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))}">
              </div>
            </div>
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">氏名 <span class="modern-emp-req">*</span></label>
                <input id="empName" class="modern-emp-input" value="\${u.username || ''}">
              </div>
            </div>
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">メールアドレス <span class="modern-emp-req">*</span></label>
            <input id="empEmail" class="modern-emp-input" type="email" value="\${u.email || ''}">
          </div>
          
          <div class="modern-emp-group">
            <label class="modern-emp-label">パスワードの変更</label>
            <input id="empPw" class="modern-emp-input" type="password" placeholder="空欄なら変更なし">
          </div>

          <div class="modern-emp-row">
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">生年月日</label>
                <input id="empBirth" type="date" class="modern-emp-input" value="\${(u.birth_date || '').slice(0, 10)}">
              </div>
            </div>
            <div class="modern-emp-col">
              <div class="modern-emp-group">
                <label class="modern-emp-label">性別</label>
                <select id="empGender" class="modern-emp-select">
                  <option value="">未選択</option>
                  <option value="male" \${u.gender==='male'?'selected':''}>男性</option>
                  <option value="female" \${u.gender==='female'?'selected':''}>女性</option>
                  <option value="other" \${u.gender==='other'?'selected':''}>その他</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">電話番号</label>
            <input id="empPhone" class="modern-emp-input" value="\${u.phone || ''}">
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">住所</label>
            <input id="empAddr" class="modern-emp-input" value="\${u.address || ''}">
          </div>

          <div class="modern-emp-group">
            <label class="modern-emp-label">緊急連絡先</label>
            <input id="empEmergencyContact" class="modern-emp-input" placeholder="氏名・続柄・電話番号など">
          </div>
          
          <div class="audit-info">
            <div>作成日: \${u.created_at ? new Date(u.created_at).toLocaleString('ja-JP') : '不明'}</div>
            <div>更新日: \${u.updated_at ? new Date(u.updated_at).toLocaleString('ja-JP') : '不明'}</div>
          </div>
        </div>

        <!-- Cột phải: Work & HR -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="modern-emp-section" style="margin-bottom: 0;">
            <h3 class="modern-emp-header">職務情報</h3>
            
            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">部署</label>
                  <select id="empDept" class="modern-emp-select"><option value="">未設定</option>\${depts.map(d=>'<option value="'+d.id+'" '+(String(u.departmentId||'')===String(d.id)?'selected':'')+'>'+d.name+'</option>').join('')}</select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">役割 <span class="modern-emp-req">*</span></label>
                  <select id="empRole" class="modern-emp-select">
                    <option value="employee" \${u.role==='employee'?'selected':''}>従業員</option>
                    <option value="manager" \${u.role==='manager'?'selected':''}>マネージャー</option>
                    <option value="admin" \${u.role==='admin'?'selected':''}>管理者</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">雇用形態 <span class="modern-emp-req">*</span></label>
                  <select id="empType" class="modern-emp-select">
                    <option value="full_time" \${u.employment_type==='full_time'?'selected':''}>正社員</option>
                    <option value="part_time" \${u.employment_type==='part_time'?'selected':''}>パート・アルバイト</option>
                    <option value="contract" \${u.employment_type==='contract'?'selected':''}>契約社員</option>
                  </select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">レベル</label>
                  <select id="empLevel" class="modern-emp-select">
                    <option value="" \${!u.level?'selected':''}>未設定</option>
                    <option value="Junior" \${u.level==='Junior'?'selected':''}>Junior</option>
                    <option value="Middle" \${u.level==='Middle'?'selected':''}>Middle</option>
                    <option value="Senior" \${u.level==='Senior'?'selected':''}>Senior</option>
                    <option value="Lead" \${u.level==='Lead'?'selected':''}>Lead</option>
                    <option value="Manager" \${u.level==='Manager'?'selected':''}>Manager</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">直属マネージャー</label>
                  <select id="empManager" class="modern-emp-select"><option value="">未設定</option>\${users.filter(x=>x.role==='manager').map(m=>'<option value="'+m.id+'" '+(String(u.manager_id||'')===String(m.id)?'selected':'')+'>'+(m.username || m.email)+'</option>').join('')}</select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">勤務地</label>
                  <select id="empWorkLocation" class="modern-emp-select">
                    <option value="">未設定</option>
                    <option value="本社">本社</option>
                    <option value="支社A">支社A</option>
                    <option value="リモート">リモート</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">入社日</label>
                  <input id="empHireDate" type="date" class="modern-emp-input" value="\${(u.hire_date || u.join_date || '').slice(0, 10)}">
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">試用期間終了</label>
                  <input id="empProbDate" type="date" class="modern-emp-input" value="\${(u.probation_date || '').slice(0, 10)}">
                </div>
              </div>
            </div>
            
            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">正社員化</label>
                  <input id="empOfficialDate" type="date" class="modern-emp-input" value="\${(u.official_date || '').slice(0, 10)}">
                </div>
              </div>
            </div>
          </div>

          <div class="modern-emp-section" style="margin-bottom: 0;">
            <h3 class="modern-emp-header">給与・状態</h3>
            
            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">ステータス <span class="modern-emp-req">*</span></label>
                  <select id="empStatus" class="modern-emp-select">
                    <option value="active" \${String(u.employment_status||'')==='active'?'selected':''}>在職 (Active)</option>
                    <option value="leave" \${String(u.employment_status||'')==='leave'?'selected':''}>休職 (Leave of absence)</option>
                    <option value="retired" \${String(u.employment_status||'')==='retired'?'selected':''}>退職 (Retired)</option>
                    <option value="terminated" \${String(u.employment_status||'')==='terminated'?'selected':''}>解雇 (Terminated)</option>
                    <option value="inactive" \${String(u.employment_status||'')==='inactive'?'selected':''}>無効 (Inactive)</option>
                  </select>
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">休暇規則グループ</label>
                  <select id="empPtoPolicy" class="modern-emp-select">
                    <option value="">デフォルト</option>
                    <option value="A">正社員規則A</option>
                    <option value="B">契約社員規則B</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modern-emp-row">
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">基本給 (閲覧のみ)</label>
                  <input id="empBaseSalary" class="modern-emp-input modern-emp-readonly" readonly value="\${u.base_salary == null ? '' : u.base_salary}" placeholder="給与管理で設定">
                </div>
              </div>
              <div class="modern-emp-col">
                <div class="modern-emp-group">
                  <label class="modern-emp-label">契約終了日</label>
                  <input id="empContractEnd" type="date" class="modern-emp-input" value="\${(u.contract_end || '').slice(0, 10)}">
                </div>
              </div>
            </div>
            
            <div class="modern-emp-group">
              <label class="modern-emp-label">備考</label>
              <textarea id="empNotes" class="modern-emp-textarea" style="height: 60px; resize: vertical;" placeholder="特記事項..."></textarea>
            </div>
          </div>
        </div>

        <!-- Section 3: Avatar Full width -->
        <div class="modern-emp-section modern-emp-section-full">
          <h3 class="modern-emp-header">プロフィール写真</h3>
          <div class="modern-emp-group">
            <div style="display: flex; gap: 24px; align-items: flex-start;">
              <div id="avatarPreviewBox" style="width: 120px; height: 120px; border-radius: 12px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; color: #94a3b8; font-size: 12px;">
                \${u.avatar_url ? '<img src="'+u.avatar_url+'" style="width:100%;height:100%;object-fit:cover;">' : 'No Image'}
              </div>
              <div style="flex: 1;">
                <label class="modern-emp-label" style="margin-bottom: 8px;">画像をアップロード (Drag & Drop または クリック)</label>
                <input id="empAvatarFile" type="file" accept="image/*" class="modern-emp-input" style="padding: 16px; border: 2px dashed #cbd5e1; background: #f8fafc; cursor: pointer;">
                <div style="font-size: 11px; color: #64748b; margin-top: 8px;">推奨サイズ: 400x400px (JPG, PNG)。アップロード後、左側にプレビューが表示されます。</div>
                <div style="margin-top: 12px;">
                  <button type="button" id="btnAvatarUpload" class="btn" style="background: #fff; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; color: #334155;">アップロード実行</button>
                  <span id="avatarUploadStatus" style="margin-left:8px;color:#334155;font-size:13px;"></span>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 24px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
              <label class="modern-emp-label">保存済み写真ギャラリー</label>
              <div id="empAvatarGallery" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;">
        <button type="submit" class="btn-primary" style="padding: 10px 24px; font-size: 15px; border-radius: 8px;">更新</button>
        <a class="btn" id="btnCancelEdit" href="#list" style="padding: 10px 24px; font-size: 15px; border-radius: 8px; margin-left: 12px;">キャンセル</a>
      </div>
`;

// Thay thế nội dung HTML cho mode === 'add'
const addRegex = /form\.innerHTML = \`[\s\S]*?<div id="empCreateMsg"[^>]*><\/div>\s*\`;/;
code = code.replace(addRegex, 'form.innerHTML = `\\n' + getAddHtml() + '\\n    `;');

// Thay thế nội dung HTML cho mode === 'edit'
const editRegex = /formEdit\.innerHTML = \`[\s\S]*?<a class="btn" id="btnCancelEdit" href="#list">キャンセル<\/a>\s*<\/div>\s*\`;/;
code = code.replace(editRegex, 'formEdit.innerHTML = `\\n' + getEditHtml() + '\\n    `;');

fs.writeFileSync(targetPath, code);
console.log('Successfully updated HTML template in employees.page.js');
