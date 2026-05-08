const db=require('./attendance/backend/src/core/database/mysql');
const repo=require('./attendance/backend/src/modules/notices/notices.repository');
(async()=>{
  try {
    const [users]=await db.query("SELECT id,role FROM users WHERE role='admin' ORDER BY id LIMIT 1");
    const u=users&&users[0];
    if(!u){console.log('no admin');return;}
    const out=await repo.listAdminFeed({userId:u.id,role:u.role,limit:20});
    console.log({unread:out.unread,total:out.total,first:out.items.slice(0,3).map(x=>({id:x.id,isRead:x.isRead,title:x.title}))});
  } catch(e){ console.error(e.message); }
  finally { try{ await db.end(); }catch{} }
})();
