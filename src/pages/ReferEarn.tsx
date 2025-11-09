import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { apiFetch } from "../lib/api";
import { CopyIcon } from "../icons";
import { useProfile } from "../hooks/useProfile";

type Commission = {
  _id: string;
  amount: number;
  level: number;
  subscriptionType?: string;
  sourceUser?: { name?: string; email?: string; referralId?: string } | string;
  transaction?: { _id: string; createdAt?: string } | string | null;
  createdAt?: string;
};

type ReferralNode = {
  id: string;
  name?: string;
  email?: string;
  referralId?: string;
  level: number;
  children: ReferralNode[];
};

type Summary = {
  walletBalance: number;
  availableBalance: number;
  minWithdrawal: number;
  pendingWithdrawalAmount: number;
  hasPendingWithdrawal: boolean;
  referralId: string | null;
  referralCount: number;
  byLevel: Array<{ level: number; total: number; count: number }>;
  totalEarned: number;
};

type WalletTxn = {
  _id: string;
  amount: number;
  status: string; // requested | paid
  createdAt?: string;
};

type WithdrawalRequest = {
  _id: string;
  amount: number;
  status: "requested" | "approved" | "rejected" | "paid";
  createdAt?: string;
};

export default function ReferEarnPage() {
  const { user } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tree, setTree] = useState<ReferralNode[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Pagination state
  const [groupPage, setGroupPage] = useState<number>(1);
  const [groupLimit] = useState<number>(6);
  const [groupTotal, setGroupTotal] = useState<number>(0);
  const groupTotalPages = useMemo(() => Math.max(Math.ceil(groupTotal / groupLimit), 1), [groupTotal, groupLimit]);

  const [comPage, setComPage] = useState<number>(1);
  const [comLimit] = useState<number>(6);
  const [comTotal, setComTotal] = useState<number>(0);
  const comTotalPages = useMemo(() => Math.max(Math.ceil(comTotal / comLimit), 1), [comTotal, comLimit]);

  const directGroups = useMemo(() => tree.filter(n => n.level === 1), [tree]);
  const myLevelReached = useMemo(() => {
    const levelsWithEarnings = (summary?.byLevel || []).filter(l => l.count > 0).map(l => l.level);
    return levelsWithEarnings.length ? Math.max(...levelsWithEarnings) : 0;
  }, [summary]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [sumRes, wRes] = await Promise.all([
          apiFetch<{ status: string; data: Summary }>("/api/referrals/my-summary"),
          apiFetch<{ status: string; results: number; data: { transactions: WalletTxn[] } }>("/api/wallet/my-transactions"),
        ]);
        if (!alive) return;
        setSummary(sumRes?.data || null);
        setWalletTxns(wRes?.data?.transactions || []);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Fetch paginated referral tree (Level 1 pagination)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const treeRes = await apiFetch<{ status: string; data: { tree: ReferralNode[] }; meta?: { pagination?: { total?: number } } }>(
          `/api/referrals/my-tree?maxDepth=10&page=${groupPage}&limit=${groupLimit}`
        );
        if (!alive) return;
        setTree(treeRes?.data?.tree || []);
        const total = treeRes?.meta?.pagination?.total ?? 0;
        setGroupTotal(Number(total) || 0);
      } catch {
        // ignore errors here, surface in main error banner if needed
      }
    })();
    return () => { alive = false; };
  }, [groupPage, groupLimit]);

  // Fetch paginated commissions
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const comRes = await apiFetch<{
          status: string;
          results: number;
          data: { commissions: Commission[] };
          meta?: { pagination?: { total?: number } };
        }>(`/api/referrals/my-commissions?page=${comPage}&limit=${comLimit}`);
        if (!alive) return;
        setCommissions(comRes?.data?.commissions || []);
        const total = comRes?.meta?.pagination?.total ?? 0;
        setComTotal(Number(total) || 0);
      } catch {
        // ignore errors here, surface in main error banner if needed
      }
    })();
    return () => { alive = false; };
  }, [comPage, comLimit]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Copied to clipboard");
    }
  };

  const shareMessage = useMemo(() => {
    const rid = summary?.referralId || user?.referralId || "";
    const signupUrl = `${window.location.origin}/signup?referredBy=${encodeURIComponent(rid)}`;
    return `Join ServiceInfotek! Use my referral code ${rid} to sign up: ${signupUrl}`;
  }, [summary?.referralId, user?.referralId]);

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };
  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };
  const shareNative = async () => {
    try {
      const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ title: "Refer & Earn", text: shareMessage, url: window.location.origin });
      } else {
        alert("Native share not supported on this browser.");
      }
    } catch {
      // ignore
    }
  };

  const requestWithdrawal = async () => {
    try {
      setWithdrawing(true);
      await apiFetch<{ status: string; data: { request: WithdrawalRequest } }>("/api/wallet/withdrawals/request", { method: "POST" });
      // Refresh summary and wallet transactions
      const [sumRes, wRes] = await Promise.all([
        apiFetch<{ status: string; data: Summary }>("/api/referrals/my-summary"),
        apiFetch<{ status: string; results: number; data: { transactions: WalletTxn[] } }>("/api/wallet/my-transactions"),
      ]);
      setSummary(sumRes?.data || null);
      setWalletTxns(wRes?.data?.transactions || []);
      alert("Withdrawal requested successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || "Failed to request withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const currency = (n: number) => `₹${(n || 0).toFixed(2)}`;

  const TreeNode = ({ node }: { node: ReferralNode }) => (
    <div className="ml-4 border-l pl-4 border-gray-200 dark:border-gray-800">
      <div className="py-1 text-sm text-gray-700 dark:text-gray-300">
        <span className="font-medium">{node.name || node.email || node.referralId || node.id}</span>
        <span className="ml-2 text-xs text-gray-500">L{node.level}</span>
        {node.referralId && <span className="ml-2 text-xs text-gray-400">[{node.referralId}]</span>}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="ml-2">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <PageMeta title="Refer & Earn" description="Your referral tree, commissions, and wallet" />
      <PageBreadcrumb pageTitle="Refer & Earn" />

      {loading && <div className="mb-4 text-sm text-gray-500">Loading…</div>}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Wallet</h3>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{currency(summary?.walletBalance || 0)}</div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Available: {currency(summary?.availableBalance || 0)} • Min withdrawal: {currency(summary?.minWithdrawal || 200)}</div>
          {summary?.pendingWithdrawalAmount && summary.pendingWithdrawalAmount > 0 && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">On hold: {currency(summary.pendingWithdrawalAmount)}</div>
          )}
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Total earned: {currency(summary?.totalEarned || 0)}</div>
          <button
            className="mt-3 inline-flex items-center rounded-lg px-3 h-9 text-sm border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            disabled={
              withdrawing ||
              !!summary?.hasPendingWithdrawal ||
              (summary?.availableBalance || 0) < (summary?.minWithdrawal || 200)
            }
            onClick={requestWithdrawal}
          >
            {withdrawing ? "Requesting…" : summary?.hasPendingWithdrawal ? "Withdrawal Pending" : "Request Withdrawal"}
          </button>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Referral Code</h3>
          <div className="flex items-center gap-2">
            <div className="text-lg font-mono text-gray-800 dark:text-white">{summary?.referralId || user?.referralId || "—"}</div>
            <button
              title="Copy"
              className="p-2 rounded border border-gray-200 dark:border-gray-700"
              onClick={() => handleCopy(String(summary?.referralId || user?.referralId || ""))}
            >
              <CopyIcon className="size-4" />
            </button>
            <Link
              to="/refer/how-it-works"
              className="ml-2 text-xs text-brand-700 font-bold hover:underline"
              aria-label="Learn how referrals work"
            >
              How it works
            </Link>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded px-3 h-9 text-sm border border-gray-200" onClick={shareWhatsApp}>Share WhatsApp</button>
            <button className="rounded px-3 h-9 text-sm border border-gray-200" onClick={shareTelegram}>Share Telegram</button>
            <button className="rounded px-3 h-9 text-sm border border-gray-200" onClick={shareNative}>Share…</button>
          </div>
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">Direct referrals: {summary?.referralCount ?? 0} • Levels earning: L{myLevelReached}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Level Earnings</h3>
          <div className="space-y-1 text-sm">
            {(summary?.byLevel || []).length === 0 && (
              <div className="text-gray-500">No earnings yet</div>
            )}
            {(summary?.byLevel || []).map((l) => (
              <div key={l.level} className="flex justify-between">
                <span>Level {l.level}</span>
                <span>{currency(l.total)} ({l.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Your Groups (Level 1)</h3>
          {directGroups.length === 0 && <div className="text-sm text-gray-500">No direct referrals yet.</div>}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">Page {groupPage} of {groupTotalPages}</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded px-2 h-7 text-xs border border-gray-200 disabled:opacity-50"
                disabled={groupPage <= 1}
                onClick={() => setGroupPage(p => Math.max(p - 1, 1))}
              >Prev</button>
              <button
                className="rounded px-2 h-7 text-xs border border-gray-200 disabled:opacity-50"
                disabled={groupPage >= groupTotalPages}
                onClick={() => setGroupPage(p => Math.min(p + 1, groupTotalPages))}
              >Next</button>
            </div>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {directGroups.map((g) => (
              <li key={g.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white">{g.name || g.email || g.referralId || g.id}</div>
                    <div className="text-xs text-gray-500">Group • L{g.level} • Members: {countNodes(g)}</div>
                  </div>
                  <button className="rounded px-3 h-8 text-xs border border-gray-200" onClick={() => toggleGroup(g.id)}>
                    {expandedGroups[g.id] ? "Hide" : "View Tree"}
                  </button>
                </div>
                {expandedGroups[g.id] && (
                  <div className="mt-2">
                    <TreeNode node={g} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Commissions</h3>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">Page {comPage} of {comTotalPages}</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded px-2 h-7 text-xs border border-gray-200 disabled:opacity-50"
                disabled={comPage <= 1}
                onClick={() => setComPage(p => Math.max(p - 1, 1))}
              >Prev</button>
              <button
                className="rounded px-2 h-7 text-xs border border-gray-200 disabled:opacity-50"
                disabled={comPage >= comTotalPages}
                onClick={() => setComPage(p => Math.min(p + 1, comTotalPages))}
              >Next</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">From</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 && (
                  <tr><td className="py-3 text-gray-500" colSpan={5}>No commissions yet.</td></tr>
                )}
                {commissions.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4">{formatDate(c.createdAt)}</td>
                    <td className="py-2 pr-4">L{c.level}</td>
                    <td className="py-2 pr-4">{formatUser(c.sourceUser)}</td>
                    <td className="py-2 pr-4">{c.subscriptionType || "—"}</td>
                    <td className="py-2 pr-4">{currency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Wallet Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {walletTxns.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={3}>No wallet transactions.</td></tr>
              )}
              {walletTxns.map((t) => (
                <tr key={t._id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">{formatDate(t.createdAt)}</td>
                  <td className="py-2 pr-4">{currency(t.amount)}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function countNodes(node: ReferralNode): number {
    let count = 1;
    for (const c of node.children || []) count += countNodes(c);
    return count;
  }

  function formatDate(d?: string) {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch { return d; }
  }

  function formatUser(u?: { name?: string; email?: string; referralId?: string } | string) {
    if (!u) return "—";
    if (typeof u === "string") return u;
    return [u.name, u.email, u.referralId].filter(Boolean).join(" • ");
  }
}