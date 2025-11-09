/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type UserLite = { _id: string; name?: string; email?: string; phone?: string };

type PaymentTxn = {
  _id: string;
  user: UserLite | string;
  subscriptionType: "SERVICE_SEARCH" | "JOB_SEARCH" | "SERVICE_POST" | string;
  amount: number;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  status: "pending" | "completed" | "failed" | string;
  createdAt?: string;
};

type PaymentSummary = {
  totalAmount: number;
  counts: { total: number; completed: number; pending: number; failed: number };
  byType: Record<string, { amount: number; count: number }>;
};

type WalletTxn = {
  _id: string;
  user: UserLite | string;
  type: "payout" | string;
  amount: number;
  status: "requested" | "paid" | string;
  withdrawalRequest?: { amount?: number; status?: string; createdAt?: string; approvedAt?: string; paidAt?: string } | string;
  createdAt?: string;
};

type WalletSummary = {
  totalPaid: number;
  totalRequested: number;
  counts: { total: number; requested: number; paid: number };
};

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

type TabKey = "incoming" | "withdrawals" | "payouts";

export default function AdminTransactions() {
  const [tab, setTab] = useState<TabKey>("incoming");
  const [query, setQuery] = useState<string>("");

  const [payments, setPayments] = useState<PaymentTxn[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState<boolean>(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState<boolean>(true);
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
  const [payTarget, setPayTarget] = useState<WithdrawalRequest | null>(null);
  const [payTxnId, setPayTxnId] = useState<string>("");
  const [payMode, setPayMode] = useState<string>("UPI");
  const [payProofUrl, setPayProofUrl] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Payments
      try {
        setPaymentsLoading(true);
        const resp = await apiFetch<{ status: string; results: number; data: { transactions: PaymentTxn[]; summary: PaymentSummary } }>("/api/payments/all-transactions", { auth: true });
        if (!alive) return;
        const txns = (resp as any)?.data?.transactions || [];
        const sum = (resp as any)?.data?.summary || null;
        setPayments(Array.isArray(txns) ? txns : []);
        setPaymentSummary(sum);
        setPaymentsError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setPaymentsError(msg || "Failed to load payments");
      } finally {
        setPaymentsLoading(false);
      }

      // Withdrawals
      try {
        setWithdrawalsLoading(true);
        const resp = await apiFetch<{ status: string; results: number; data: { requests: WithdrawalRequest[] } }>("/api/wallet/withdrawals", { auth: true });
        if (!alive) return;
        const list = (resp as any)?.data?.requests || [];
        setWithdrawals(Array.isArray(list) ? list : []);
        setWithdrawalsError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setWithdrawalsError(msg || "Failed to load withdrawals");
      } finally {
        setWithdrawalsLoading(false);
      }

      // Wallet payouts
      try {
        setWalletLoading(true);
        const resp = await apiFetch<{ status: string; results: number; data: { transactions: WalletTxn[]; summary: WalletSummary } }>("/api/wallet/all-transactions", { auth: true });
        if (!alive) return;
        const list = (resp as any)?.data?.transactions || [];
        const sum = (resp as any)?.data?.summary || null;
        setWalletTxns(Array.isArray(list) ? list : []);
        setWalletSummary(sum);
        setWalletError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setWalletError(msg || "Failed to load wallet transactions");
      } finally {
        setWalletLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const str = (v: any) => String(v ?? "").toLowerCase();
  const q = query.trim().toLowerCase();

  const filteredPayments = useMemo(() => {
    if (!q) return payments;
    return payments.filter((t) => {
      const u = t.user as UserLite;
      return [u?.name, u?.email, u?.phone, t.subscriptionType, t.razorpayPaymentId, t.razorpayOrderId, t.status]
        .filter(Boolean)
        .some((v) => str(v).includes(q));
    });
  }, [payments, q]);

  const filteredWithdrawals = useMemo(() => {
    if (!q) return withdrawals;
    return withdrawals.filter((r) => {
      const u = r.user as UserLite;
      return [u?.name, u?.email, u?.phone, r.status, r.amount]
        .filter(Boolean)
        .some((v) => str(v).includes(q));
    });
  }, [withdrawals, q]);

  const filteredWalletTxns = useMemo(() => {
    if (!q) return walletTxns;
    return walletTxns.filter((t) => {
      const u = t.user as UserLite;
      const wr = t.withdrawalRequest as any;
      return [u?.name, u?.email, u?.phone, t.status, t.amount, wr?.status]
        .filter(Boolean)
        .some((v) => str(v).includes(q));
    });
  }, [walletTxns, q]);

  const dataForTab = tab === "incoming" ? filteredPayments : tab === "withdrawals" ? filteredWithdrawals : filteredWalletTxns;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(dataForTab.length / pageSize)), [dataForTab.length, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return dataForTab.slice(start, start + pageSize);
  }, [dataForTab, currentPage, pageSize]);

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const exportCsv = () => {
    const headersIncoming = ["UserName","UserEmail","UserPhone","Type","Amount","GST18","Net","PaymentId","OrderId","Status","Created","Id"];
    const headersWithdrawals = ["UserName","UserEmail","UserPhone","Amount","Status","RequestedAt","ApprovedAt","PaidAt","Id"];
    const headersPayouts = ["UserName","UserEmail","UserPhone","Amount","Status","RequestedStatus","Created","Id"];

    const toCsv = (headers: string[], rows: string[][], name: string) => {
      const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (tab === "incoming") {
      const rows = filteredPayments.map((t) => {
        const u = t.user as UserLite;
        const amt = Number(t.amount || 0);
        const gst = Math.round(amt * 0.18 * 100) / 100;
        const net = Math.max(0, Math.round((amt - gst) * 100) / 100);
        return [u?.name || "", u?.email || "", u?.phone || "", t.subscriptionType || "", String(amt), String(gst), String(net), t.razorpayPaymentId || "", t.razorpayOrderId || "", t.status || "", t.createdAt ? new Date(t.createdAt).toISOString() : "", t._id];
      });
      toCsv(headersIncoming, rows, "incoming_payments");
    } else if (tab === "withdrawals") {
      const rows = filteredWithdrawals.map((r) => {
        const u = r.user as UserLite;
        return [u?.name || "", u?.email || "", u?.phone || "", String(r.amount ?? ""), r.status || "", r.createdAt ? new Date(r.createdAt).toISOString() : "", r.approvedAt ? new Date(r.approvedAt).toISOString() : "", r.paidAt ? new Date(r.paidAt).toISOString() : "", r._id];
      });
      toCsv(headersWithdrawals, rows, "withdrawal_requests");
    } else {
      const rows = filteredWalletTxns.map((t) => {
        const u = t.user as UserLite;
        const wr = t.withdrawalRequest as any;
        return [u?.name || "", u?.email || "", u?.phone || "", String(t.amount ?? ""), t.status || "", wr?.status || "", t.createdAt ? new Date(t.createdAt).toISOString() : "", t._id];
      });
      toCsv(headersPayouts, rows, "wallet_payouts");
    }
  };

  const renderSummary = () => {
    const incomingTotal = paymentSummary?.totalAmount ?? 0;
    const payoutsPaid = walletSummary?.totalPaid ?? 0;
    const gstTotal = Math.round(incomingTotal * 0.18 * 100) / 100;
    const netPaymentTotal = Math.max(0, incomingTotal - gstTotal);
    const netProfitToCompany = Math.max(0, netPaymentTotal - payoutsPaid);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Incoming (completed)</div>
          <div className="text-lg font-semibold">₹{incomingTotal}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Payments: completed / total</div>
          <div className="text-lg font-semibold">{paymentSummary?.counts.completed ?? 0} / {paymentSummary?.counts.total ?? 0}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">GST (18%) total</div>
          <div className="text-lg font-semibold">₹{gstTotal}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Net Payment Total</div>
          <div className="text-lg font-semibold">₹{netPaymentTotal}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Payouts: requested</div>
          <div className="text-lg font-semibold">₹{walletSummary?.totalRequested ?? 0}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Payouts: paid</div>
          <div className="text-lg font-semibold">₹{payoutsPaid}</div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500">Net Profit to Company</div>
          <div className="text-lg font-semibold">₹{netProfitToCompany}</div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (tab === "incoming") {
      if (paymentsLoading) return <div className="text-sm text-gray-600 dark:text-gray-300">Loading payments...</div>;
      if (paymentsError) return <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{paymentsError}</div>;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">GST (18%)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Net</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Payment ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Order ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paged.map((t: any) => {
                const u = t.user as UserLite;
                return (
                  <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                      <div className="truncate">{u?.name || "Unknown"}</div>
                      <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.email || ""}</div>
                      <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.phone || ""}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{t.subscriptionType}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">₹{t.amount}</td>
                    {(() => {
                      const amt = Number(t.amount || 0);
                      const gst = Math.round(amt * 0.18 * 100) / 100;
                      const net = Math.max(0, Math.round((amt - gst) * 100) / 100);
                      return (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">₹{gst}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">₹{net}</td>
                        </>
                      );
                    })()}
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{t.razorpayPaymentId}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{t.razorpayOrderId}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{t.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (tab === "withdrawals") {
      if (withdrawalsLoading) return <div className="text-sm text-gray-600 dark:text-gray-300">Loading withdrawals...</div>;
      if (withdrawalsError) return <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{withdrawalsError}</div>;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Requested</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Approved</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Paid</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paged.map((r: any) => {
                const u = r.user as UserLite;
                return (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                      <div className="truncate">{u?.name || "Unknown"}</div>
                      <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.email || ""}</div>
                      <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.phone || ""}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">₹{r.amount}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{r.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(r.approvedAt)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(r.paidAt)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                      {(['requested','approved'] as string[]).includes(r.status) ? (
                        <button
                          className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => { 
                            setPayTarget(r); 
                            setPayTxnId(""); 
                            setPayMode("UPI"); 
                            setPayProofUrl(""); 
                            const remaining = Math.max(0, (r.amount || 0) - (r.paidAmount || 0));
                            setPayAmount(String(remaining));
                            setPayError(null);
                            setPayModalOpen(true); 
                          }}
                        >Mark Paid</button>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // payouts
    if (walletLoading) return <div className="text-sm text-gray-600 dark:text-gray-300">Loading payouts...</div>;
    if (walletError) return <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{walletError}</div>;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Withdrawal Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {paged.map((t: any) => {
              const u = t.user as UserLite;
              const wr = t.withdrawalRequest as any;
              return (
                <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                    <div className="truncate">{u?.name || "Unknown"}</div>
                    <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.email || ""}</div>
                    <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.phone || ""}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">₹{t.amount}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{t.status}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{wr?.status || ""}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(t.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Admin Transactions" description="Incoming payments and outgoing payouts" />
      <PageBreadcrumb pageTitle="Admin Transactions" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {renderSummary()}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border ${tab === 'incoming' ? 'bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800'}`}
              onClick={() => { setTab('incoming'); setPage(1); }}
            >Incoming Payments</button>
            <button
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border ${tab === 'withdrawals' ? 'bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800'}`}
              onClick={() => { setTab('withdrawals'); setPage(1); }}
            >Withdrawal Requests</button>
            <button
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border ${tab === 'payouts' ? 'bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800'}`}
              onClick={() => { setTab('payouts'); setPage(1); }}
            >Wallet Payouts</button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by user, type, status, id"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full md:w-96 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            />
            <button
              onClick={exportCsv}
              className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Download CSV</button>
          </div>
        </div>

        {renderTable()}

        {/* Pay modal */}
        {payModalOpen && payTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Record Payout</h3>
                <button className="text-sm text-gray-500" onClick={() => { setPayModalOpen(false); setPayTarget(null); }}>✕</button>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  User: {(payTarget.user as UserLite)?.name || 'Unknown'} • Requested: ₹{payTarget.amount}
                  {typeof payTarget.paidAmount !== 'undefined' && (
                    <> • Paid: ₹{payTarget.paidAmount} • Remaining: ₹{Math.max(0, (payTarget.amount || 0) - (payTarget.paidAmount || 0))}</>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Paid Amount</label>
                  <input 
                    type="number" 
                    min={0} 
                    step="0.01" 
                    value={payAmount} 
                    onChange={(e) => setPayAmount(e.target.value)} 
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" 
                    placeholder="Enter amount to mark as paid" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transaction ID</label>
                    <input value={payTxnId} onChange={(e) => setPayTxnId(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="e.g. UPI/NEFT reference" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
                    <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent">
                      <option value="UPI">UPI</option>
                      <option value="NEFT">NEFT</option>
                      <option value="IMPS">IMPS</option>
                      <option value="BankTransfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Proof URL (optional)</label>
                    <input value={payProofUrl} onChange={(e) => setPayProofUrl(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Link to receipt or screenshot" />
                  </div>
                </div>
                {payError && <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{payError}</div>}
                <div className="flex items-center justify-end gap-2">
                  <button className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800" onClick={() => { setPayModalOpen(false); setPayTarget(null); setPayAmount(""); setPayTxnId(""); setPayProofUrl(""); setPayError(null); }}>Cancel</button>
                  <button
                    disabled={paySubmitting || !payTxnId}
                    className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        setPaySubmitting(true);
                        setPayError(null);
                        // validations
                        if (!payTxnId) { setPayError('Transaction ID is required'); return; }
                        const amtNum = Number(payAmount);
                        const remaining = Math.max(0, (payTarget?.amount || 0) - (payTarget?.paidAmount || 0));
                        if (!amtNum || amtNum <= 0) { setPayError('Enter a valid paid amount'); return; }
                        if (amtNum > remaining) { setPayError('Paid amount exceeds remaining'); return; }
                        await apiFetch(`/api/wallet/withdrawals/${payTarget?._id}/pay`, {
                          method: 'POST',
                          auth: true,
                          body: { paymentTxnId: payTxnId, paymentMode: payMode, proofUrl: payProofUrl, paidAmount: amtNum }
                        });
                        // Refresh withdrawals and wallet payouts
                        const [wdResp, wtResp] = await Promise.all([
                          apiFetch<{ status: string; results: number; data: { requests: WithdrawalRequest[] } }>("/api/wallet/withdrawals", { auth: true }),
                          apiFetch<{ status: string; results: number; data: { transactions: WalletTxn[]; summary: WalletSummary } }>("/api/wallet/all-transactions", { auth: true })
                        ]);
                        const wdList = (wdResp as any)?.data?.requests || [];
                        const wtList = (wtResp as any)?.data?.transactions || [];
                        const wtSummary = (wtResp as any)?.data?.summary || null;
                        setWithdrawals(Array.isArray(wdList) ? wdList : []);
                        setWalletTxns(Array.isArray(wtList) ? wtList : []);
                        setWalletSummary(wtSummary);
                        setPayModalOpen(false);
                        setPayTarget(null);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e);
                        setPayError(msg || 'Failed to record payout');
                      } finally {
                        setPaySubmitting(false);
                      }
                    }}
                  >{paySubmitting ? 'Saving…' : 'Mark as Paid'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border border-gray-200 px-2 py-1 dark:border-gray-800 dark:bg-transparent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              {dataForTab.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Prev</button>
            <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Next</button>
          </div>
        </div>
      </div>
    </>
  );
}