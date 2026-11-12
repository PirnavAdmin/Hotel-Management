const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vikas@123',
    database: 'hotel_management_db_test'
  });

  const [tables] = await conn.query(`
    SHOW TABLES WHERE 
      Tables_in_hotel_management_db_test LIKE '%kot%' OR 
      Tables_in_hotel_management_db_test LIKE '%kitchen%' OR 
      Tables_in_hotel_management_db_test LIKE '%bar%' OR 
      Tables_in_hotel_management_db_test LIKE '%order%'
  `);
  console.log("Matching tables:", tables);

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await conn.query(`DESCRIBE \`${tableName}\``);
    console.log(`\n--- ${tableName} ---`);
    console.log(cols.map(c => `${c.Field} (${c.Type}, Null:${c.Null}, Key:${c.Key}, Default:${c.Default})`).join('\n'));
  }

  await conn.end();
}

main().catch(console.error);
