const db = require('./src/core/database/mysql');

async function run() {
  try {
    const [cols] = await db.query(`DESCRIBE attendance`);
    console.log(cols);
    
    // Check if checkIn is nullable
    const checkInCol = cols.find(c => c.Field === 'checkIn');
    if (checkInCol.Null === 'NO') {
      console.log('Altering checkIn to be NULL...');
      await db.query(`ALTER TABLE attendance MODIFY checkIn DATETIME NULL`);
      console.log('Done!');
    } else {
      console.log('checkIn is already nullable.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();