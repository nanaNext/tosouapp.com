const db=require('./attendance/backend/src/core/database/mysql');
const repo=require('./attendance/backend/src/modules/notices/notices.repository');
(async()=>{
  try {
    const [users]=await db.query("SELECT id,role,username,email FROM users WHERE role='admin' OR role='manager' ORDER BY id LIMIT 3");
    console.log('admins=', users);
    if (users && users[0]) {
      const out=await repo.listAdminFeed({ userId: users[0].id, role: users[0].role, limit: 20 });
      console.log('feed', { total: out.total, unread: out.unread });
      console.log('first', out.items.slice(0,5));
    }
  } catch(e){ console.error('ERR', e.message); }
  finally { try{ await db.end(); }catch{} }
})();
