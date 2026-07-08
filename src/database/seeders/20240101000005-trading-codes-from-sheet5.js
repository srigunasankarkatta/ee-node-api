'use strict';

const { v4: uuidv4 } = require('uuid');
const { loadWorkbook, parseAllPlanSheets } = require('./utils/xceedExcel');

const CODE_TYPES = ['welcome', 'regular_am', 'regular_pm', 'referral'];

const SLOT_META = {
  welcome:    { start: '10:00:00', end: '10:15:00' },
  regular_am: { start: '11:00:00', end: '11:15:00' },
  regular_pm: { start: '14:00:00', end: '14:15:00' },
  referral:   { start: '15:00:00', end: '15:15:00' },
};

module.exports = {
  async up(queryInterface) {
    const [adminRows] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    const adminId = adminRows[0] && adminRows[0].id;
    if (!adminId) throw new Error('Admin user not found — run 20240101000004-admin-user seeder first');

    const { workbook } = loadWorkbook();
    const { allCodeRows } = parseAllPlanSheets(workbook);

    const records = [];

    for (const row of allCodeRows) {
      for (const codeType of CODE_TYPES) {
        const code = row[codeType];
        if (!code) continue;

        records.push({
          id:           uuidv4(),
          code_date:    '2024-01-01', // unused sentinel; lookup is by day_number
          day_number:   row.day_number,
          plan_id:      row.plan_id,
          code_type:    codeType,
          codes:        JSON.stringify([code]),
          slot_start:   SLOT_META[codeType].start,
          slot_end:     SLOT_META[codeType].end,
          published_by: adminId,
          created_at:   new Date(),
          updated_at:   new Date(),
        });
      }
    }

    if (records.length === 0) {
      throw new Error('No trading code rows found — check src/data/Xceed Code & Value.xlsx');
    }

    await queryInterface.bulkInsert('trading_codes', records, {});
    console.log(
      `  Seeded ${records.length} trading code entries from Xceed Code & Value.xlsx (${allCodeRows.length} days × ${CODE_TYPES.length} slots × 5 plans)`
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('trading_codes', null, {});
  },
};
