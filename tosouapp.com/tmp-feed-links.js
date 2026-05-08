const db=require('./attendance/backend/src/core/database/mysql');
const repo=require('./attendance/backend/src/modules/notices/notices.repository');
(async()=>{
  try {
    const [users]=await db.query("SELECT id,role,username FROM users WHERE role='admin' OR role='manager' ORDER BY id LIMIT 1");
    const u=users&&users[0];
    if(!u){console.log('no admin user');return;}
    const feed=await repo.listAdminFeed({userId:u.id,role:u.role,limit:30});
    console.log('user=',u,'unread=',feed.unread,'total=',feed.total);
    console.table((feed.items||[]).slice(0,12).map(x=>({id:x.id,kind:x.kind,title:x.title,link:x.linkUrl,isRead:x.isRead,createdAt:x.createdAt})));
  } catch(e){ console.error(e); }
  finally { try{ await db.end(); }catch{} }
})();
