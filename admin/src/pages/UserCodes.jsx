import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin, fmtDate, fmtMoney, qs } from '../api/client';

const PLANS = ['', 'P1', 'P2', 'P3', 'P4', 'P5'];
const CODE_TYPES = [
  { value: '', label: 'All types' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'regular_am', label: 'AM Regular' },
  { value: 'regular_pm', label: 'PM Regular' },
  { value: 'referral', label: 'Referral' },
];

export default function UserCodes() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [planId, setPlanId] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [codeType, setCodeType] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [creditStatus, setCreditStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setError('');
    admin.codeSubmissions(qs({
      page,
      limit: 30,
      search,
      plan_id: planId || undefined,
      day_number: dayNumber || undefined,
      code_type: codeType || undefined,
      submission_date: submissionDate || undefined,
      credit_status: creditStatus || undefined,
    }))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [page, search, planId, dayNumber, codeType, submissionDate, creditStatus]);

  const summary = data?.summary;

  return (
    <>
      <header className="page-header">
        <h1>User Code Submissions</h1>
        <p>Track which codes each user submitted and profit credit status</p>
      </header>

      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card">
            <div className="label">Pending credits</div>
            <div className="value">{summary.pending}</div>
            <div className="sub">{fmtMoney(summary.pendingAmount)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Credited</div>
            <div className="value">{summary.credited}</div>
            <div className="sub">{fmtMoney(summary.creditedAmount)}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          placeholder="Search user name or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }}>
          {PLANS.map((p) => <option key={p || 'all'} value={p}>{p || 'All plans'}</option>)}
        </select>
        <input
          type="number"
          min="1"
          max="300"
          placeholder="Day"
          value={dayNumber}
          onChange={(e) => { setDayNumber(e.target.value); setPage(1); }}
          style={{ width: 80 }}
        />
        <select value={codeType} onChange={(e) => { setCodeType(e.target.value); setPage(1); }}>
          {CODE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="date"
          value={submissionDate}
          onChange={(e) => { setSubmissionDate(e.target.value); setPage(1); }}
          style={{ width: 'auto' }}
        />
        <select value={creditStatus} onChange={(e) => { setCreditStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="credited">Credited</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!data ? <div className="loading">Loading submissions…</div> : (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan · Day</th>
                  <th>Slot</th>
                  <th>Submitted code</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Credited</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/users/${row.userId}`}>{row.userName}</Link>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>{row.userPhone}</small>
                    </td>
                    <td>{row.planId} · Day {row.dayNumber}</td>
                    <td>{row.codeLabel}</td>
                    <td><code className="code-value inline">{row.submittedCode}</code></td>
                    <td>{fmtMoney(row.profitAmount)}</td>
                    <td><span className={`badge ${row.creditStatus}`}>{row.creditStatus}</span></td>
                    <td>{fmtDate(row.submittedAt)}</td>
                    <td>{row.creditedAt ? fmtDate(row.creditedAt) : '—'}</td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>No submissions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {data.page} of {data.pages || 1} ({data.total} total)</span>
            <button className="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
