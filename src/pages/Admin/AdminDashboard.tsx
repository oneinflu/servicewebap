/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type Item = { _id: string; name?: string; title?: string; createdAt?: string };
type ServiceItem = Item & {
  categoryPrices?: Array<{ category?: { name?: string }; price?: number }>;
  location?: { address?: string; country?: string; state?: string; city?: string; district?: string; pincode?: string };
  user?: { name?: string; email?: string; phone?: string };
};
type JobItem = Item & {
  categories?: Array<{ name?: string }>;
  location?: { address?: string; country?: string; state?: string; city?: string; district?: string; pincode?: string };
  user?: { name?: string; email?: string; phone?: string };
};

// API base and Authorization are handled globally by apiFetch

export default function AdminDashboard() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [companies, setCompanies] = useState<Item[]>([]);
  const [govJobs, setGovJobs] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Finance
  type PaymentTxn = {
    _id: string;
    subscriptionType?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
  };
  type PaymentSummary = {
    totalAmount: number;
    counts: { total: number; completed: number; pending: number; failed: number };
  };
  type WalletSummary = {
    totalPaid: number;
    totalRequested: number;
    counts: { total: number; requested: number; paid: number };
  };
  type WithdrawalRequest = {
    _id: string;
    amount?: number;
    status?: string; // requested | approved | paid | rejected
    createdAt?: string;
    approvedAt?: string;
    paidAt?: string;
    paidAmount?: number;
  };
  const [payments, setPayments] = useState<PaymentTxn[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"service" | "job" | null>(null);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | JobItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchJson = async (path: string, protectedRoute = false) => {
      try {
        // Use the global API client; it will attach Authorization when protectedRoute=true
        return await apiFetch<any>(path, { auth: protectedRoute });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(message || "Request failed");
      }
    };

    (async () => {
      try {
        const [sv, jb, cp, gj, ct, payResp, wdResp, wtResp] = await Promise.all([
          fetchJson("/api/services", true),
          fetchJson("/api/jobs", true),
          fetchJson("/api/companies", true),
          fetchJson("/api/government-jobs", false),
          fetchJson("/api/categories", false),
          fetchJson("/api/payments/all-transactions", true),
          fetchJson("/api/wallet/withdrawals", true),
          fetchJson("/api/wallet/all-transactions", true),
        ]);
        if (!isMounted) return;
        // Normalize backend responses to arrays
        const servicesArr = (sv as any)?.data?.services || (sv as any)?.services || [];
        const jobsArr = (jb as any)?.data?.jobs || (jb as any)?.jobs || [];
        const companiesArr = (cp as any)?.data?.companies || (cp as any)?.companies || [];
        const govJobsArr = (gj as any)?.data?.governmentJobs || (gj as any)?.governmentJobs || [];
        const categoriesArr = (ct as any)?.data?.categories || (ct as any)?.categories || [];

        const paymentTxns = (payResp as any)?.data?.transactions || [];
        const paymentSum = (payResp as any)?.data?.summary || null;
        const wdList = (wdResp as any)?.data?.requests || [];
        const wtSum = (wtResp as any)?.data?.summary || null;

        setServices(Array.isArray(servicesArr) ? servicesArr : []);
        setJobs(Array.isArray(jobsArr) ? jobsArr : []);
        setCompanies(Array.isArray(companiesArr) ? companiesArr : []);
        setGovJobs(Array.isArray(govJobsArr) ? govJobsArr : []);
        setCategories(Array.isArray(categoriesArr) ? categoriesArr : []);
        setPayments(Array.isArray(paymentTxns) ? paymentTxns : []);
        setPaymentSummary(paymentSum);
        setWithdrawals(Array.isArray(wdList) ? wdList : []);
        setWalletSummary(wtSum);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const StatCard = ({ label, count }: { label: string; count: number }) => (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-800 dark:text-white/90">{count}</div>
    </div>
  );

  const FinanceCard = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">₹{Math.round((value || 0) * 100) / 100}</div>
    </div>
  );

  const formatDate = (d?: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return ""; }
  };

  const ServiceCards = ({ items }: { items: ServiceItem[] }) => {
    const recent = useMemo(() => items.slice(0, 6), [items]);
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recent.map((s) => {
            const categoryNames = (s.categoryPrices || []).map(cp => cp.category?.name).filter(Boolean);
            const title = categoryNames.length ? categoryNames.join(", ") : s.name || "Service";
            const loc = s.location?.address || s.location?.city || s.location?.district || s.location?.state || s.location?.country || "";
            return (
              <button
                key={s._id}
                onClick={() => { setSelectedItem(s); setModalType("service"); setModalOpen(true); }}
                className="text-left rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{s.user?.name ? `by ${s.user.name}` : ""}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{loc}</div>
                <div className="text-xs text-gray-500">{formatDate(s.createdAt)}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const JobCards = ({ items }: { items: JobItem[] }) => {
    const recent = useMemo(() => items.slice(0, 6), [items]);
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Jobs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recent.map((j) => {
            const title = (j.categories || []).map(c => c.name).filter(Boolean).join(", ") || j.title || "Job";
            const loc = j.location?.address || j.location?.city || j.location?.district || j.location?.state || j.location?.country || "";
            return (
              <button
                key={j._id}
                onClick={() => { setSelectedItem(j); setModalType("job"); setModalOpen(true); }}
                className="text-left rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{j.user?.name ? `by ${j.user.name}` : ""}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{loc}</div>
                <div className="text-xs text-gray-500">{formatDate(j.createdAt)}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const DetailModal = () => {
    if (!modalOpen || !selectedItem || !modalType) return null;
    const close = () => { setModalOpen(false); setSelectedItem(null); setModalType(null); };
    const item = selectedItem as any;
    const isService = modalType === "service";
    return (
      <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {isService ? "Service Details" : "Job Details"}
            </h3>
            <button onClick={close} className="text-sm px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700">Close</button>
          </div>

          {isService ? (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium">Categories:</span> {(item.categoryPrices || []).map((cp: any) => cp?.category?.name).filter(Boolean).join(", ")}</div>
              <div><span className="font-medium">Prices:</span> {(item.categoryPrices || []).map((cp: any) => `${cp?.category?.name || ""}: ₹${cp?.price || 0}`).join(", ")}</div>
              <div><span className="font-medium">Location:</span> {[item.location?.address, item.location?.city, item.location?.district, item.location?.state, item.location?.country].filter(Boolean).join(", ")}{item.location?.pincode ? `, ${item.location.pincode}` : ""}</div>
              <div><span className="font-medium">Posted By:</span> {[item.user?.name, item.user?.email, item.user?.phone].filter(Boolean).join(" • ")}</div>
              <div><span className="font-medium">Created:</span> {formatDate(item.createdAt)}</div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium">Categories:</span> {(item.categories || []).map((c: any) => c?.name).filter(Boolean).join(", ")}</div>
              <div><span className="font-medium">Location:</span> {[item.location?.address, item.location?.city, item.location?.district, item.location?.state, item.location?.country].filter(Boolean).join(", ")}{item.location?.pincode ? `, ${item.location.pincode}` : ""}</div>
              <div><span className="font-medium">Posted By:</span> {[item.user?.name, item.user?.email, item.user?.phone].filter(Boolean).join(" • ")}</div>
              <div><span className="font-medium">Created:</span> {formatDate(item.createdAt)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Admin Dashboard" description="Platform stats overview" />
      <PageBreadcrumb pageTitle="Admin Dashboard" />
      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading admin stats…</div>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Finance Overview */}
          <div className="col-span-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Finance Overview</h3>
                <div className="flex gap-2">
                  <a href="/admin/transactions" className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800">Transactions</a>
                  <a href="/admin/payments" className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800">Withdrawals & Payouts</a>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(() => {
                  const incomingTotal = paymentSummary?.totalAmount ?? 0;
                  const gstTotal = Math.round(incomingTotal * 0.18 * 100) / 100;
                  const netPaymentTotal = Math.max(0, incomingTotal - gstTotal);
                  const payoutsPaid = walletSummary?.totalPaid ?? 0;
                  const payoutsRequested = walletSummary?.totalRequested ?? 0;
                  const netProfitToCompany = Math.max(0, netPaymentTotal - payoutsPaid);
                  return (
                    <>
                      <FinanceCard label="Incoming (completed)" value={incomingTotal} />
                      <FinanceCard label="GST (18%) total" value={gstTotal} />
                      <FinanceCard label="Net Payment Total" value={netPaymentTotal} />
                      <FinanceCard label="Payouts Paid" value={payoutsPaid} />
                      <FinanceCard label="Payouts Requested" value={payoutsRequested} />
                      <FinanceCard label="Net Profit to Company" value={netProfitToCompany} />
                    </>
                  );
                })()}
              </div>
              {/* Snapshot */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
                  <div className="text-xs text-gray-500 mb-2">Withdrawal Snapshot</div>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Requested: {(withdrawals || []).filter(w => w.status === 'requested').length}</li>
                    <li>Approved: {(withdrawals || []).filter(w => w.status === 'approved').length}</li>
                    <li>Paid: {(withdrawals || []).filter(w => w.status === 'paid').length}</li>
                  </ul>
                </div>
                <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 md:col-span-2">
                  <div className="text-xs text-gray-500 mb-2">Recent Payments</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(payments || []).slice(0, 6).map((p) => (
                      <div key={p._id} className="rounded border border-gray-200 dark:border-gray-800 p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">{p.subscriptionType || 'Payment'}</span>
                          <span className="font-semibold">₹{p.amount ?? 0}</span>
                        </div>
                        <div className="text-xs text-gray-500">{p.status || '—'} • {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Services" count={services.length} />
            <StatCard label="Jobs" count={jobs.length} />
            <StatCard label="Companies" count={companies.length} />
            <StatCard label="Government Jobs" count={govJobs.length} />
            <StatCard label="Categories" count={categories.length} />
          </div>

          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceCards items={services} />
            <JobCards items={jobs} />
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Companies</h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300">
                {companies.slice(0, 6).map((c) => (
                  <li key={c._id}>{c.name || "Company"}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Government Jobs</h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300">
                {govJobs.slice(0, 6).map((g) => (
                  <li key={g._id}>{g.title || g.name || "Govt Job"}</li>
                ))}
              </ul>
            </div>
          </div>

          {error && (
            <div className="text-sm text-error-600">Some data failed to load: {error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <a href="/admin/government-jobs" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Manage Government Jobs</a>
            <a href="/admin/categories" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Manage Categories</a>
            <a href="/admin/transactions" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Admin Transactions</a>
            <a href="/admin/payments" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Admin Payments</a>
          </div>
          <DetailModal />
        </div>
      )}
    </>
  );
}