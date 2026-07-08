import { useEffect, useState } from 'react';
import { admin, fmtDate, fmtMoney, qs } from '../api/client';

function RejectModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Reject withdrawal</h3>
        <div className="form-group">
          <label>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Invalid bank details…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason)}>Reject</button>
        </div>
      </div>
    </div>
  );
}

export default function Withdrawals() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState(null);
  const [busy, setBusy] = useState(null);

  function load() {
    admin.withdrawals(qs({ page, limit: 20, status: status || undefined }))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [page, status]);

  async function approve(id) {
    setBusy(id);
    try {
      await admin.approveWd(id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function reject(id, reason) {
    setBusy(id);
    setRejectId(null);
    try {
      await admin.rejectWd(id, reason);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Withdrawals</h1>
        <p>Review and process withdrawal requests</p>
      </header>

      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!data ? <div className="loading">Loading…</div> : (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Net</th>
                  <th>Bank</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div>{w.userName}</div>
                      <small style={{ color: 'var(--muted)' }}>{w.userPhone}</small>
                    </td>
                    <td>
                      {fmtMoney(w.grossAmount || w.amount)}
                      {w.deductionPercent > 0 && (
                        <small style={{ display: 'block', color: 'var(--warning)' }}>-{w.deductionPercent}% early</small>
                      )}
                    </td>
                    <td>{fmtMoney(w.amount)}</td>
                    <td>
                      {w.bankAccount ? (
                        <>
                          <div>{w.bankAccount.bank_name}</div>
                          <small style={{ color: 'var(--muted)' }}>{w.bankAccount.account_number}</small>
                        </>
                      ) : '—'}
                    </td>
                    <td><span className={`badge ${w.status}`}>{w.status}</span></td>
                    <td>{fmtDate(w.requestedAt)}</td>
                    <td>
                      {w.status === 'pending' && (
                        <div className="actions">
                          <button type="button" className="primary" disabled={busy === w.id} onClick={() => approve(w.id)}>Approve</button>
                          <button type="button" className="danger" disabled={busy === w.id} onClick={() => setRejectId(w.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>No withdrawals</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {data.page} of {data.pages || 1}</span>
            <button className="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}

      {rejectId && (
        <RejectModal onClose={() => setRejectId(null)} onConfirm={(reason) => reject(rejectId, reason)} />
      )}
    </>
  );
}
