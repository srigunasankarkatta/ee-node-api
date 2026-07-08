import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { admin, fmtDate, fmtMoney } from '../api/client';

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    admin.user(id).then((r) => {
      setData(r.data);
      setStatus(r.data.user.status);
    }).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus() {
    setSaving(true);
    try {
      await admin.userStatus(id, status);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="loading">Loading user…</div>;

  const { user, activePlan, referredBy, team, ranks, kyc, bankAccounts, recentTransactions, codeSubmissions } = data;

  return (
    <>
      <header className="page-header">
        <Link to="/users" style={{ fontSize: '0.85rem' }}>← Back to users</Link>
        <h1>{user.name}</h1>
        <p>{user.phone} · <span className={`badge ${user.role}`}>{user.role}</span></p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Account</h3>
        <div className="detail-grid">
          <div className="detail-item"><label>Status</label><span className={`badge ${user.status}`}>{user.status}</span></div>
          <div className="detail-item"><label>Wallet</label><span>{fmtMoney(user.walletBalance)}</span></div>
          <div className="detail-item"><label>Referral code</label><span>{user.referralCode}</span></div>
          <div className="detail-item"><label>Joined</label><span>{fmtDate(user.joinedAt)}</span></div>
          <div className="detail-item"><label>Last login</label><span>{fmtDate(user.lastLogin)}</span></div>
          {referredBy && (
            <div className="detail-item"><label>Referred by</label><span>{referredBy.name} ({referredBy.referral_code})</span></div>
          )}
        </div>
        <div className="toolbar" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="frozen">Frozen</option>
          </select>
          <button type="button" className="primary" disabled={saving || status === user.status} onClick={updateStatus}>
            Update status
          </button>
        </div>
      </div>

      {activePlan && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Active plan</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Plan</label><span>{activePlan.planId}</span></div>
            <div className="detail-item"><label>Tenure</label><span>{activePlan.tenureMonths} months</span></div>
            <div className="detail-item"><label>Multiplier</label><span>{activePlan.multiplier}x</span></div>
            <div className="detail-item"><label>Subscribed</label><span>{fmtDate(activePlan.subscribedAt)}</span></div>
            <div className="detail-item"><label>Locked until</label><span>{activePlan.lockedUntil || '—'}</span></div>
          </div>
        </div>
      )}

      {ranks.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Ranks</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Status</th><th>Weeks left</th><th>Since</th></tr></thead>
              <tbody>
                {ranks.map((r) => (
                  <tr key={r.rankId + r.activatedAt}>
                    <td>{r.rankId}</td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                    <td>{r.remainingWeeks}</td>
                    <td>{fmtDate(r.activatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Direct team ({team.directCount})</h3>
        {team.directMembers.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No direct referrals</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {team.directMembers.map((m) => (
                  <tr key={m.userId}>
                    <td><Link to={`/users/${m.userId}`}>{m.name}</Link></td>
                    <td>{m.phone}</td>
                    <td>{m.planId || '—'}</td>
                    <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                    <td>{fmtDate(m.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {kyc && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>KYC — <span className={`badge ${kyc.status}`}>{kyc.status}</span></h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Document</label><span>{kyc.documentType}</span></div>
            <div className="detail-item"><label>Number</label><span>{kyc.documentNumber || '—'}</span></div>
          </div>
        </div>
      )}

      {codeSubmissions.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Code submissions ({codeSubmissions.length})</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan · Day</th>
                  <th>Slot</th>
                  <th>Code</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {codeSubmissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.planId} · Day {s.dayNumber}</td>
                    <td>{s.codeLabel}</td>
                    <td><code className="code-value inline">{s.submittedCode}</code></td>
                    <td>{fmtMoney(s.profitAmount)}</td>
                    <td><span className={`badge ${s.creditStatus}`}>{s.creditStatus}</span></td>
                    <td>{fmtDate(s.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentTransactions.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Recent transactions</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.type}</td>
                    <td>{t.category}</td>
                    <td>{fmtMoney(t.amount)}</td>
                    <td>{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
