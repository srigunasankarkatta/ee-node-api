import { useEffect, useState } from 'react';
import { admin, fmtDate, qs } from '../api/client';

function RejectModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Reject KYC</h3>
        <div className="form-group">
          <label>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Document unclear…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason)}>Reject</button>
        </div>
      </div>
    </div>
  );
}

function imgUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `/${path}`;
}

export default function Kyc() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [busy, setBusy] = useState(null);

  function load() {
    admin.kyc(qs({ page, limit: 10, status: status || undefined }))
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [page, status]);

  async function approve(id) {
    setBusy(id);
    try {
      await admin.approveKyc(id);
      setSelected(null);
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
    setSelected(null);
    try {
      await admin.rejectKyc(id, reason);
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
        <h1>KYC Review</h1>
        <p>Verify identity documents submitted by users</p>
      </header>

      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
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
                  <th>Document</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <div>{k.userName}</div>
                      <small style={{ color: 'var(--muted)' }}>{k.userPhone}</small>
                    </td>
                    <td>{k.documentType} · {k.documentNumber || '—'}</td>
                    <td><span className={`badge ${k.status}`}>{k.status}</span></td>
                    <td>{fmtDate(k.submittedAt)}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="ghost" onClick={() => setSelected(k)}>Review</button>
                        {k.status === 'pending' && (
                          <>
                            <button type="button" className="primary" disabled={busy === k.id} onClick={() => approve(k.id)}>Approve</button>
                            <button type="button" className="danger" disabled={busy === k.id} onClick={() => setRejectId(k.id)}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No KYC submissions</td></tr>
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

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3>{selected.userName} — KYC</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {selected.documentType} · {selected.documentNumber}
            </p>
            <div className="kyc-images">
              {['frontImage', 'backImage', 'selfieWithId'].map((key) => {
                const src = imgUrl(selected[key]);
                return src ? (
                  <div key={key}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                    <a href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt={key} />
                    </a>
                  </div>
                ) : null;
              })}
            </div>
            {selected.status === 'pending' && (
              <div className="modal-actions">
                <button type="button" className="primary" disabled={busy === selected.id} onClick={() => approve(selected.id)}>Approve</button>
                <button type="button" className="danger" onClick={() => { setRejectId(selected.id); setSelected(null); }}>Reject</button>
              </div>
            )}
          </div>
        </div>
      )}

      {rejectId && (
        <RejectModal onClose={() => setRejectId(null)} onConfirm={(reason) => reject(rejectId, reason)} />
      )}
    </>
  );
}
