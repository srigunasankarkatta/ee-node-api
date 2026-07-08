import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin, fmtDate, fmtMoney, qs } from '../api/client';

export default function Users() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setError('');
    admin.users(qs({ page, limit: 20, search, status, role }))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [page, search, status, role]);

  return (
    <>
      <header className="page-header">
        <h1>Users</h1>
        <p>Manage registered members</p>
      </header>

      <div className="toolbar">
        <input placeholder="Search name, phone, email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="frozen">Frozen</option>
        </select>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="new_joiner">New joiner</option>
          <option value="member">Member</option>
          <option value="inviter">Inviter</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!data ? <div className="loading">Loading users…</div> : (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Balance</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.phone}</td>
                    <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.status}`}>{u.status}</span></td>
                    <td>{u.activePlanId || '—'}</td>
                    <td>{fmtMoney(u.walletBalance)}</td>
                    <td>{fmtDate(u.joinedAt)}</td>
                    <td><Link to={`/users/${u.id}`}>View</Link></td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>No users found</td></tr>
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
