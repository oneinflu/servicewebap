/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type UserLite = { _id: string; name?: string; email?: string; phone?: string };

type WithdrawalRequest = {
  _id: string;
  user: UserLite | string;
  amount: number;
  status: "requested" | "approved" | "rejected" | "paid" | string;
  createdAt?: string;
  approvedAt?: string;
  paidAt?: string;
  paidAmount?: number;
};

export default function AdminPayments() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
  const [payTarget, setPayTarget] = useState<WithdrawalRequest | null>(null);
  const [payTxnId, setPayTxnId] = useState<string>("");
  const [payMode, setPayMode] = useState<string>("UPI");
  const [payProofUrl, setPayProofUrl] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await apiFetch<{ status: string; results: number; data: { requests: WithdrawalRequest[] } }>("/api/wallet/withdrawals", { auth: true });
        if (!alive) return;
        const list = (resp as any)?.data?.requests || [];
        setWithdrawals(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load withdrawals");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const refresh = async () => {
    try {
      const resp = await apiFetch<{ status: string; results: number; data: { requests: WithdrawalRequest[] } }>("/api/wallet/withdrawals", { auth: true });
      const list = (resp as any)?.data?.requests || [];
      setWithdrawals(Array.isArray(list) ? list : []);
    } catch {
      // keep previous data
    }
  };

  const str = (v: any) => String(v ?? "").toLowerCase();
  const q = query.trim().toLowerCase();

  const enriched = useMemo(() => {
    return withdrawals.map((r) => ({
      ...r,
      paidAmount: r.paidAmount ?? 0,
      remainingAmount: Math.max(0, (r.amount ?? 0) - (r.paidAmount ?? 0))
    }));
  }, [withdrawals]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (statusFilter) arr = arr.filter((r) => r.status === statusFilter);
    if (!q) return arr;
    return arr.filter((r) => {
      const u = r.user as UserLite;
      return [u?.name, u?.email, u?.phone, r.status, r.amount, r.paidAmount]
        .filter(Boolean)
        .some((v) => str(v).includes(q));
    });
  }, [enriched, statusFilter, q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const openPayModal = (r: WithdrawalRequest) => {
    setPayTarget(r);
    const remaining = Math.max(0, (r.amount || 0) - (r.paidAmount || 0));
    setPayAmount(remaining > 0 ? String(remaining) : "");
    setPayTxnId("");
    setPayMode("UPI");
    setPayProofUrl("");
    setPayError(null);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setPayTarget(null);
    setPayTxnId("");
    setPayMode("UPI");
    setPayProofUrl("");
    setPayAmount("");
    setPaySubmitting(false);
    setPayError(null);
  };

  const approveRequest = async (id: string) => {
    try {
      await apiFetch(`/api/wallet/withdrawals/${id}/approve`, { method: "PATCH", auth: true });
      await refresh();
    } catch {
      // Could show toast
    }
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    setPaySubmitting(true);
    setPayError(null);
    try {
      const remaining = Math.max(0, (payTarget.amount || 0) - (payTarget.paidAmount || 0));
      const amt = Number(payAmount);
      if (!amt || amt <= 0) {
        setPayError("Paid amount must be greater than 0");
        setPaySubmitting(false);
        return;
      }
      if (amt > remaining) {
        setPayError(`Paid amount cannot exceed remaining ₹${remaining}`);
        setPaySubmitting(false);
        return;
      }

      await apiFetch(`/api/wallet/withdrawals/${payTarget._id}/pay`, {
        method: "POST",
        auth: true,
        body: {
          paymentTxnId: payTxnId || undefined,
          paymentMode: payMode || undefined,
          proofUrl: payProofUrl || undefined,
          paidAmount: amt,
        },
      });
      await refresh();
      closePayModal();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPayError(msg || "Failed to record payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div>
      <PageMeta title="Admin Payments" description="Manage withdrawal requests and record payouts" />
      <PageBreadcrumb pageTitle="Admin Payments" />

      {/* Filters */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Withdrawal Requests</div>
        <div className="flex gap-2 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent">
            <option value="">All</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/30">
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Requested</th>
              <th className="text-left px-3 py-2">Paid</th>
              <th className="text-left px-3 py-2">Remaining</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Requested At</th>
              <th className="text-left px-3 py-2">Approved At</th>
              <th className="text-left px-3 py-2">Paid At</th>
              <th className="text-left px-3 py-2">Payment Details</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-red-600">{error}</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-gray-500">No withdrawal requests found</td></tr>
            ) : (
              paged.map((r) => {
                const u = r.user as UserLite;
                const paid = r.paidAmount ?? 0;
                const remaining = Math.max(0, (r.amount || 0) - paid);
                const canApprove = r.status === 'requested';
                const canPay = ['requested', 'approved'].includes(r.status) && remaining > 0;
                return (
                  <tr key={r._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{u?.name || '-'}</span>
                        <span className="text-xs text-gray-500">{u?.email || ''}{u?.phone ? ` • ${u.phone}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">₹{r.amount ?? 0}</td>
                    <td className="px-3 py-2">₹{paid}</td>
                    <td className="px-3 py-2">₹{remaining}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${r.status === 'paid' ? 'bg-green-100 text-green-700' : r.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2">{fmtDate(r.approvedAt)}</td>
                    <td className="px-3 py-2">{fmtDate(r.paidAt)}</td>
                    <td className="px-3 py-2">
                      {((r as any).paymentMode || (r as any).paymentTxnId || (r as any).paymentProofUrl) ? (
                        <div className="flex flex-col gap-1">
                          {(r as any).paymentMode && <div>Mode: {(r as any).paymentMode}</div>}
                          {(r as any).paymentTxnId && <div>Txn: {(r as any).paymentTxnId}</div>}
                          {(r as any).paymentProofUrl && <a href={(r as any).paymentProofUrl} target="_blank" rel="noreferrer" className="text-primary underline">View Proof</a>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className={`px-3 py-1 rounded-md border text-xs ${canApprove ? 'border-blue-600 text-blue-700' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`} disabled={!canApprove} onClick={() => approveRequest(r._id)}>Approve</button>
                        <button className={`px-3 py-1 rounded-md border text-xs ${canPay ? 'border-green-600 text-green-700' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`} disabled={!canPay} onClick={() => openPayModal(r)}>Record Payment</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <button className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1}>Prev</button>
        <div className="text-xs">Page {currentPage} / {totalPages}</div>
        <button className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</button>
      </div>

      {/* Pay Modal */}
      {payModalOpen && payTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-md w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Record Payment</div>
              <button className="text-sm" onClick={closePayModal}>✕</button>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-gray-600">Requested: ₹{payTarget.amount} • Paid: ₹{payTarget.paidAmount ?? 0} • Remaining: ₹{Math.max(0, (payTarget.amount || 0) - (payTarget.paidAmount || 0))}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Paid Amount</label>
                  <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" min={0} step="0.01" className="mt-1 w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent" placeholder="e.g., 500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Payment Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="mt-1 w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent">
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="IMPS">IMPS</option>
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Payment Txn ID (optional)</label>
                  <input value={payTxnId} onChange={(e) => setPayTxnId(e.target.value)} className="mt-1 w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent" placeholder="e.g., UPI-1234" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Proof URL (optional)</label>
                  <input value={payProofUrl} onChange={(e) => setPayProofUrl(e.target.value)} className="mt-1 w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm bg-transparent" placeholder="Link to receipt/screenshot" />
                </div>
              </div>
              {payError && <div className="text-xs text-red-600">{payError}</div>}
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-sm" onClick={closePayModal} disabled={paySubmitting}>Cancel</button>
                <button className={`px-4 py-2 rounded-md text-white ${paySubmitting ? 'bg-gray-400' : 'bg-primary'}`} onClick={submitPayment} disabled={paySubmitting}>{paySubmitting ? 'Saving...' : 'Save Payment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}