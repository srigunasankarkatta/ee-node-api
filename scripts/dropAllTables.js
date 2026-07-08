'use strict';

// Drops every table in the configured database for a clean slate.
// Used by `npm run db:fresh` instead of `migrate:undo:all`, which replays each
// migration's down() against seeded data and can fail on constraints/indexes
// that are incompatible with the pre-seeded rows (e.g. sentinel code_date).

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function dropAllTables() {
  const database = process.env.DB_NAME;
  const sequelize = new Sequelize(database, process.env.DB_USER, process.env.DB_PASS, {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();

    const [tables] = await sequelize.query(
      `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = :database`,
      { replacements: { database } }
    );

    if (tables.length === 0) {
      console.log('  No tables to drop — database already empty.');
      return;
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`  Dropped ${tables.length} table(s) from ${database}.`);
  } finally {
    await sequelize.close();
  }
}

dropAllTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('  dropAllTables failed:', err.message);
    process.exit(1);
  });
