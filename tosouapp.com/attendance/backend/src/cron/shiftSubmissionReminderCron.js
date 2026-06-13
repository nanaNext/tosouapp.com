const cron = require('node-cron');
const db = require('../core/database/mysql');
const emailService = require('../core/notifications/email.service');

async function processMonthlyShiftReminders() {
    console.log('[ShiftReminderCron] Bắt đầu kiểm tra nhắc nhở nộp lịch ca tháng sau...');
    try {
        if (!emailService.canSendMail()) {
            console.log('[ShiftReminderCron] Email service not configured. Skipping.');
            return;
        }

        const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
        const day = nowJST.getUTCDate();

        // Kiểm tra xem hôm nay có phải là ngày 15, 25 hoặc ngày cuối tháng không
        const isLastDayOfMonth = new Date(nowJST.getUTCFullYear(), nowJST.getUTCMonth() + 1, 0).getDate() === day;
        
        if (day !== 15 && day !== 25 && !isLastDayOfMonth) {
            console.log('[ShiftReminderCron] Hôm nay không phải ngày gửi nhắc nhở (15, 25, cuối tháng). Bỏ qua.');
            return;
        }

        // Tháng mục tiêu là tháng tiếp theo
        const nextMonthDate = new Date(nowJST.getUTCFullYear(), nowJST.getUTCMonth() + 1, 1);
        const y = nextMonthDate.getUTCFullYear();
        const m = String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0');
        const targetMonthStr = `${y}-${m}`;

        console.log(`[ShiftReminderCron] Gửi nhắc nhở nộp lịch cho tháng: ${targetMonthStr}`);

        // Lấy danh sách nhân viên đang active
        const [users] = await db.query(`
            SELECT u.id, u.email, u.username, u.employment_type, d.name as departmentName 
            FROM users u 
            LEFT JOIN departments d ON u.departmentId = d.id 
            WHERE u.employment_status = 'active' AND u.role IN ('employee', 'manager')
        `);

        if (!users || users.length === 0) return;

        // Lấy trạng thái nộp lịch của tháng tiếp theo
        const [monthStatuses] = await db.query(`
            SELECT userId, status FROM shift_month_status 
            WHERE month = ?
        `, [targetMonthStr]);

        const statusMap = new Map();
        monthStatuses.forEach(row => {
            statusMap.set(row.userId, row.status);
        });

        for (const user of users) {
            const status = statusMap.get(user.id);
            // Nếu đã nộp (PENDING) hoặc đã được duyệt (APPROVED), không nhắc nữa
            if (status === 'PENDING' || status === 'APPROVED') continue;

            const isSeishain = user.employment_type === 'full_time' || user.employment_type === '正社員';
            const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
            const senderFrom = process.env.MAIL_FROM || '"飯塚塗研株式会社" <iizuka_token@tosouapp.com>';
            
            let subject = `[飯塚塗研株式会社] 【重要】来月（${targetMonthStr}）のシフト提出のお願い`;
            let text = '';
            let html = '';

            if (isSeishain) {
                text = `
${user.username} 様

お疲れ様です。
来月（${targetMonthStr}）のシフト提出に関する重要なお知らせです。

正社員の皆様は、基本的にカレンダー通りの出勤となりますが、
有給休暇の取得や、その他のお休みを希望される場合は、
必ずシステムよりシフト（休暇）の申請を行ってください。

※申請がない場合は、規定の出勤日として処理されます。

▼ シフト（休暇）申請はこちらから
${appUrl}ui/shifts

■ シフト提出の手順：
1. 上記のURLからシフト登録画面にアクセスします。
2. 休みを希望する日付のプルダウンから「休」または「有給」を選択します。
3. 最後に必ず画面上部の「シフト提出」ボタンを押してください。

詳しい操作方法は、以下のマニュアルもご参照ください。
▼ 操作マニュアル
${appUrl}ui/manual

このメッセージはシステムにより自動的に送信されております。
ご不明な点がございましたら、公式LINEまでお問い合わせください。
公式LINE： https://lin.ee/zBKnhkd
                `.trim();

                html = `
<p>${user.username} 様</p>
<br/>
<p>お疲れ様です。<br/>来月（<strong>${targetMonthStr}</strong>）のシフト提出に関する重要なお知らせです。</p>
<p>正社員の皆様は、基本的にカレンダー通りの出勤となりますが、<br/>
<strong>有給休暇の取得や、その他のお休みを希望される場合</strong>は、<br/>
必ずシステムよりシフト（休暇）の申請を行ってください。</p>
<p style="color: #dc2626; font-weight: bold;">※申請がない場合は、規定の出勤日として処理されます。</p>
<br/>
<p>▼ シフト（休暇）申請はこちらから<br/>
<a href="${appUrl}ui/shifts">${appUrl}ui/shifts</a></p>
<br/>
<p><strong>■ シフト提出の手順：</strong><br/>
1. 上記のURLからシフト登録画面にアクセスします。<br/>
2. 休みを希望する日付のプルダウンから「休」または「有給」を選択します。<br/>
3. 最後に必ず画面上部の「シフト提出」ボタンを押してください。</p>
<br/>
<p>詳しい操作方法は、以下のマニュアルもご参照ください。<br/>
▼ 操作マニュアル<br/>
<a href="${appUrl}ui/manual">${appUrl}ui/manual</a></p>
<br/>
<hr/>
<p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送信されております。<br/>
ご不明な点がございましたら、公式LINEまでお問い合わせください。<br/>
<strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
                `;
            } else {
                // Baito
                text = `
${user.username} 様

お疲れ様です。
来月（${targetMonthStr}）のシフト提出のお願いです。

出勤可能な日・時間帯をシステムよりご提出ください。
未提出の場合はシフトを組むことができませんので、お早めにご対応をお願いいたします。

▼ シフト提出はこちらから
${appUrl}ui/shifts

■ シフト提出の手順：
1. 上記のURLからシフト登録画面にアクセスします。
2. 出勤できる日のプルダウンから「出勤」を選択します。（休みの日は「休み」を選択）
3. 最後に必ず画面上部の「シフト提出」ボタンを押してください。

詳しい操作方法は、以下のマニュアルもご参照ください。
▼ 操作マニュアル
${appUrl}ui/manual

このメッセージはシステムにより自動的に送信されております。
ご不明な点がございましたら、公式LINEまでお問い合わせください。
公式LINE： https://lin.ee/zBKnhkd
                `.trim();

                html = `
<p>${user.username} 様</p>
<br/>
<p>お疲れ様です。<br/>来月（<strong>${targetMonthStr}</strong>）のシフト提出のお願いです。</p>
<p>出勤可能な日・時間帯をシステムよりご提出ください。<br/>
<span style="color: #dc2626; font-weight: bold;">未提出の場合はシフトを組むことができません</span>ので、お早めにご対応をお願いいたします。</p>
<br/>
<p>▼ シフト提出はこちらから<br/>
<a href="${appUrl}ui/shifts">${appUrl}ui/shifts</a></p>
<br/>
<p><strong>■ シフト提出の手順：</strong><br/>
1. 上記のURLからシフト登録画面にアクセスします。<br/>
2. 出勤できる日のプルダウンから「出勤」を選択します。（休みの日は「休み」を選択）<br/>
3. 最後に必ず画面上部の「シフト提出」ボタンを押してください。</p>
<br/>
<p>詳しい操作方法は、以下のマニュアルもご参照ください。<br/>
▼ 操作マニュアル<br/>
<a href="${appUrl}ui/manual">${appUrl}ui/manual</a></p>
<br/>
<hr/>
<p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送信されております。<br/>
ご不明な点がございましたら、公式LINEまでお問い合わせください。<br/>
<strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
                `;
            }

            try {
                if (typeof emailService.sendViaResend === 'function') {
                    await emailService.sendViaResend({
                        from: senderFrom,
                        to: user.email,
                        subject,
                        html,
                        text
                    });
                    console.log(`[ShiftReminderCron] Đã gửi nhắc nhở nộp lịch cho ${user.email}`);
                }
            } catch (err) {
                console.error(`[ShiftReminderCron] Lỗi khi gửi email cho ${user.email}:`, err);
            }
        }
    } catch (err) {
        console.error('[ShiftReminderCron] Lỗi trong quá trình xử lý nhắc nhở nộp lịch:', err);
    }
}

function initShiftSubmissionReminderCron() {
    // Chạy vào 10:00 sáng mỗi ngày
    // (Bên trong hàm sẽ tự check xem hôm nay có phải 15, 25, hoặc cuối tháng không)
    cron.schedule('0 10 * * *', () => {
        processMonthlyShiftReminders();
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
    console.log('[Cron Job] Đã lên lịch tự động gửi nhắc nhở nộp lịch ca vào 10:00 sáng mỗi ngày (kiểm tra điều kiện ngày 15, 25, cuối tháng).');
}

module.exports = {
    initShiftSubmissionReminderCron,
    processMonthlyShiftReminders
};
