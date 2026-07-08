'use strict';

const path = require('path');
const XLSX = require('xlsx');

const EXCEL_FILENAME = 'Xceed Code & Value.xlsx';

const CODE_COLUMNS = {
  welcome:    4,
  regular_am: 5,
  regular_pm: 11,
  referral:   12,
};

const COL = {
  dayLabelAm: 0,
  amTradeValue: 1,
  amProfit: 2,
  amClosing: 3,
  pmTradeValue: 8,
  pmProfit: 9,
  pmClosing: 10,
};

function getExcelPath() {
  return path.resolve(__dirname, '../../../data', EXCEL_FILENAME);
}

function sheetNameToPlanId(sheetName) {
  const match = String(sheetName).match(/^P([1-5])-/);
  return match ? `P${match[1]}` : null;
}

function loadWorkbook() {
  const filePath = getExcelPath();
  const workbook = XLSX.readFile(filePath);
  return { workbook, filePath };
}

function parsePlanSheet(rows, planId) {
  const projections = [];
  const codeRows = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[COL.dayLabelAm] || !String(row[COL.dayLabelAm]).startsWith('DAY')) continue;

    const dayNumber = parseInt(String(row[COL.dayLabelAm]).replace('DAY ', ''), 10);
    if (isNaN(dayNumber) || dayNumber <= 0) continue;

    const welcome    = String(row[CODE_COLUMNS.welcome]    || '').trim();
    const regularAm  = String(row[CODE_COLUMNS.regular_am] || '').trim();
    const regularPm  = String(row[CODE_COLUMNS.regular_pm] || '').trim();
    const referral   = String(row[CODE_COLUMNS.referral]   || '').trim();

    if (!welcome || !regularAm || !regularPm || !referral) continue;

    const amTradeValue = parseFloat(row[COL.amTradeValue]);
    const amProfit     = parseFloat(row[COL.amProfit]);
    const amClosing    = parseFloat(row[COL.amClosing]);
    const pmTradeValue = parseFloat(row[COL.pmTradeValue]);
    const pmProfit     = parseFloat(row[COL.pmProfit]);
    const pmClosing    = parseFloat(row[COL.pmClosing]);

    if ([amTradeValue, amProfit, amClosing, pmTradeValue, pmProfit, pmClosing].some(Number.isNaN)) {
      continue;
    }

    projections.push({
      plan_id:          planId,
      day_number:       dayNumber,
      am_position:      'UP',
      am_trade_count:   1,
      am_rate:          null,
      am_trade_value:   amTradeValue,
      am_profit:        amProfit,
      am_closing:       amClosing,
      pm_position:      'Down',
      pm_trade_count:   1,
      pm_rate:          null,
      pm_trade_value:   pmTradeValue,
      pm_profit:        pmProfit,
      pm_closing:       pmClosing,
      total_day_profit: +(amProfit + pmProfit).toFixed(6),
      created_at:       new Date(),
      updated_at:       new Date(),
    });

    codeRows.push({
      day_number: dayNumber,
      plan_id:    planId,
      welcome,
      regular_am: regularAm,
      regular_pm: regularPm,
      referral,
    });
  }

  return { projections, codeRows };
}

function parseAllPlanSheets(workbook) {
  const allProjections = [];
  const allCodeRows = [];

  for (const sheetName of workbook.SheetNames) {
    const planId = sheetNameToPlanId(sheetName);
    if (!planId) continue;

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
    });

    const { projections, codeRows } = parsePlanSheet(rows, planId);
    allProjections.push(...projections);
    allCodeRows.push(...codeRows);
  }

  return { allProjections, allCodeRows };
}

module.exports = {
  EXCEL_FILENAME,
  CODE_COLUMNS,
  getExcelPath,
  sheetNameToPlanId,
  loadWorkbook,
  parsePlanSheet,
  parseAllPlanSheets,
};
