import { useEffect, useState } from 'react';
import { admin, qs } from '../api/client';

const PLANS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const CODE_TYPES = [
  { value: '', label: 'All types' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'regular_am', label: 'AM Regular' },
  { value: 'regular_pm', label: 'PM Regular' },
  { value: 'referral', label: 'Referral' },
];

export default function DailyCodes() {
  const [planId, setPlanId] = useState('P1');
  const [dayNumber, setDayNumber] = useState('1');
  const [codeType, setCodeType] = useState('');
  const [dayView, setDayView] = useState(null);
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('day'); // day | browse

  useEffect(() => {
    setError('');
    if (viewMode === 'day' && planId && dayNumber) {
      admin.tradingCodesDay(planId, dayNumber)
        .then((r) => setDayView(r.data))
        .catch((e) => { setDayView(null); setError(e.message); });
    }
  }, [viewMode, planId, dayNumber]);

  useEffect(() => {
    if (viewMode !== 'browse') return;
    setError('');
    admin.tradingCodes(qs({ page, limit: 50, plan_id: planId, day_number: dayNumber || undefined, code_type: codeType || undefined }))
      .then((r) => setList(r.data))
      .catch((e) => setError(e.message));
  }, [viewMode, page, planId, dayNumber, codeType]);

  return (
    <>
      <header className="page-header">
        <h1>Daily Codes</h1>
        <p>Published trading codes from the master Excel (300 days × 5 plans)</p>
      </header>

      <div className="toolbar">
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="day">Day view (all slots)</option>
          <option value="browse">Browse / search</option>
        </select>
        <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="number"
          min="1"
          max="300"
          placeholder="Day 1–300"
          value={dayNumber}
          onChange={(e) => setDayNumber(e.target.value)}
          style={{ width: 100 }}
        />
        {viewMode === 'browse' && (
          <select value={codeType} onChange={(e) => { setCodeType(e.target.value); setPage(1); }}>
            {CODE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {viewMode === 'day' && (
        <>
          {!dayView && !error && <div className="loading">Loading day {dayNumber} codes…</div>}
          {dayView && (
            <div className="code-day-header card" style={{ marginBottom: '1rem' }}>
              <strong>{dayView.planId}</strong> · Day {dayView.dayNumber}
            </div>
          )}
          {dayView && (
            <div className="code-slots-grid">
              {dayView.slots.map((slot) => (
                <div className="code-slot-card card" key={slot.id}>
                  <div className="code-slot-type">{slot.codeLabel}</div>
                  <div className="code-slot-window">{slot.slot}</div>
                  <div className="code-values">
                    {slot.codes.map((c) => (
                      <code key={c} className="code-value">{c}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'browse' && (
        <>
          {!list ? <div className="loading">Loading codes…</div> : (
            <>
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Day</th>
                      <th>Slot</th>
                      <th>Code(s)</th>
                      <th>Window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((row) => (
                      <tr key={row.id}>
                        <td>{row.planId}</td>
                        <td>{row.dayNumber}</td>
                        <td>{row.codeLabel}</td>
                        <td>{row.codes.join(', ')}</td>
                        <td>{row.slot}</td>
                      </tr>
                    ))}
                    {list.data.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No codes match filters</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span>Page {list.page} of {list.pages || 1} ({list.total} total)</span>
                <button className="ghost" disabled={page >= list.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
