import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin, fmtMoney } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    admin.stats()
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <div className="loading">Loading dashboard…</div>;

  const planEntries = Object.entries(stats.plans.byPlan || {});

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Platform overview at a glance</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="label">Total Users</div>
          <div className="value">{stats.users.total}</div>
          <div className="sub">{stats.users.recentSignups7d} joined last 7 days</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Users</div>
          <div className="value">{stats.users.active}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Plans</div>
          <div className="value">{stats.plans.activeSubscriptions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Withdrawals</div>
          <div className="value">{stats.withdrawals.pending}</div>
          <div className="sub"><Link to="/withdrawals">Review →</Link></div>
        </div>
        <div className="stat-card">
          <div className="label">Pending KYC</div>
          <div className="value">{stats.kyc.pending}</div>
          <div className="sub"><Link to="/kyc">Review →</Link></div>
        </div>
        <div className="stat-card">
          <div className="label">Total Wallet Balance</div>
          <div className="value" style={{ fontSize: '1.25rem' }}>{fmtMoney(stats.finance.totalWalletBalance)}</div>
        </div>
      </div>

      {planEntries.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Active plans by tier</h3>
          <div className="detail-grid">
            {planEntries.map(([plan, count]) => (
              <div className="detail-item" key={plan}>
                <label>{plan}</label>
                <span>{count} users</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
