exports.up = async function(knex) {
  // Drop redundant indexes safely
  const dropIndexIfExists = async (tableName, indexName) => {
    try {
      const [rows] = await knex.raw(`SHOW INDEX FROM ?? WHERE Key_name = ?`, [tableName, indexName]);
      if (rows.length > 0) {
        await knex.schema.alterTable(tableName, table => {
          table.dropIndex([], indexName);
        });
        console.log(`Dropped redundant index ${indexName} from ${tableName}`);
      }
    } catch (err) {
      console.warn(`Could not drop index ${indexName} on ${tableName}:`, err.message);
    }
  };

  // We keep: 
  // - PRIMARY (id)
  // - unique_user_checkin (userId, checkIn) -> unique
  // - idx_att_user_open (userId, checkOut) -> good for finding active shifts
  // - idx_att_user_range (userId, checkIn, checkOut) -> good for range queries
  // - idx_att_labels (labels) -> good for filtering
  // - idx_shift (shiftId) -> good for joins
  // - idx_checkin (checkIn) -> good for daily reports

  // We drop redundant:
  await dropIndexIfExists('attendance', 'idx_user_checkin');
  await dropIndexIfExists('attendance', 'idx_att_user_checkin');
  await dropIndexIfExists('attendance', 'idx_user_checkout');
  await dropIndexIfExists('attendance', 'idx_att_user_checkout');
};

exports.down = async function(knex) {
  // We won't restore redundant indexes
};