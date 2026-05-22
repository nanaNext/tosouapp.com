require('dotenv').config();
const db = require('./backend/src/core/database/mysql');
const { processReminders } = require('./backend/src/services/shiftReminder.service');

async function test() {
  const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
  const todayStr = nowJST.toISOString().slice(0, 10);
  const currentMin = nowJST.getUTCHours() * 60 + nowJST.getUTCMinutes(); 
  console.log('JST Date:', todayStr);
  console.log('Current JST Min:', currentMin);
  console.log('Current JST Time:', Math.floor(currentMin / 60) + ':' + (currentMin % 60));

  const [users] = await db.query(`
    SELECT u.id, u.email, u.username, d.name as departmentName 
    FROM users u 
    LEFT JOIN departments d ON u.departmentId = d.id 
    WHERE u.employment_status = 'active' AND u.role IN ('employee', 'manager')
  `);

  const [assignments] = await db.query(`
    SELECT a.userId, s.name, s.start_time, s.end_time 
    FROM user_shift_assignments a
    JOIN shift_definitions s ON a.shiftId = s.id
    WHERE a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
  `, [todayStr, todayStr]);

  const [plans] = await db.query(`
    SELECT userId, shiftId FROM attendance_plan WHERE date = ?
  `, [todayStr]);

  const assignMap = new Map(assignments.map(a => [a.userId, a]));
  const planMap = new Map(plans.map(p => [p.userId, p.shiftId]));

  let isRedDay = false;
  let calendarExplanation = null;
  try {
    const calendarRepo = require('./backend/src/modules/calendar/calendar.repository');
    calendarExplanation = await calendarRepo.explainDate(todayStr);
    isRedDay = !!calendarExplanation?.is_off;
  } catch (e) {
    console.log('Calendar error', e.message);
  }
  const isSunday = new Date(todayStr).getUTCDay() === 0;

  const [dailies] = await db.query(`SELECT userId, kubun FROM attendance_daily WHERE date = ?`, [todayStr]);
  const dailyMap = new Map(dailies.map(d => [d.userId, String(d.kubun || '').trim()]));

  console.log(`Found ${users.length} users`);
  console.log(`Is Sunday? ${isSunday}, Is Red Day? ${isRedDay}`);
  console.log('Assignments:', assignments.length);
  
  for (const user of users) {
    const userId = user.id;
    const isKoujiUser = String(user.departmentName || '').includes('工事部');
    
    let isUserOffDay = false;
    if (!isKoujiUser) {
      isUserOffDay = isSunday || isRedDay;
    } else {
      const hasSundayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'sunday');
      const hasLastSaturdayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'saturday_4th');
      const hasHolidayReason = calendarExplanation?.reasons?.some(x => x.is_off && ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge'].includes(x.type));
      isUserOffDay = hasSundayReason || hasLastSaturdayReason || hasHolidayReason;
    }
    
    const userKubun = dailyMap.get(userId) || '';
    const isExplicitOff = ['休日', '有給休暇', '欠勤', '無給休暇', '代替休日'].includes(userKubun);
    const isExplicitWork = ['出勤', '休日出勤', '代替出勤', '半休'].includes(userKubun);
    
    let shiftStartHm = '08:00';
    let shiftEndHm = '17:00';
    const assign = assignMap.get(userId);
    if (assign) {
      shiftStartHm = assign.start_time;
      shiftEndHm = assign.end_time;
    }
    const planShiftId = planMap.get(userId);
    
    // Only log for user 27 or if we hit the assignment branch
    if (userId === 27 || assign) {
        console.log(`User ${userId} (${user.username}):`);
        console.log(`  Kouji? ${isKoujiUser}, OffDay? ${isUserOffDay}`);
        console.log(`  Kubun: ${userKubun}, ExplicitOff? ${isExplicitOff}, ExplicitWork? ${isExplicitWork}`);
        console.log(`  Assign:`, assign);
        console.log(`  PlanShift:`, planShiftId);
        console.log(`  Final Shift: ${shiftStartHm} - ${shiftEndHm}`);
        
        if (isExplicitOff) console.log('  -> SKIPPED (Explicit Off)');
        else if (isUserOffDay && !isExplicitWork) console.log('  -> SKIPPED (Off Day)');
        else console.log('  -> WILL CHECK REMINDERS');
    }
  }

  process.exit(0);
}
test();