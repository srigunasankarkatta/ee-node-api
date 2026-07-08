'use strict';

const { loadWorkbook, parseAllPlanSheets } = require('./utils/xceedExcel');

module.exports = {
  async up(queryInterface) {
    const { workbook } = loadWorkbook();
    const { allProjections } = parseAllPlanSheets(workbook);

    const byPlan = {};
    for (const record of allProjections) {
      byPlan[record.plan_id] = (byPlan[record.plan_id] || 0) + 1;
    }

    if (allProjections.length === 0) {
      throw new Error('No plan projection rows found — check src/data/Xceed Code & Value.xlsx');
    }

    await queryInterface.bulkInsert('plan_projections', allProjections, {});

    for (const [planId, count] of Object.entries(byPlan)) {
      console.log(`  Seeded ${count} days for plan ${planId}`);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('plan_projections', null, {});
  },
};
