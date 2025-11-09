/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { apiFetch } from "../lib/api";

type Subscription = {
  _id: string;
  type: "SERVICE_SEARCH" | "JOB_SEARCH" | "SERVICE_POST" | string;
  startDate?: string;
  endDate: string;
};

const PRICES: Record<string, number> = {
  SERVICE_SEARCH: 100,
  JOB_SEARCH: 100,
  SERVICE_POST: 500,
};

const BENEFITS: Record<string, string[]> = {
  SERVICE_SEARCH: [
    "Search and view services",
    "Filter by categories and location",
    "Contact service providers",
  ],
  JOB_SEARCH: [
    "Search and view jobs",
    "Save interests and upload resume",
    "Contact job posters",
  ],
  SERVICE_POST: [
    "Post services without limits",
    "Multiple categories per service",
    "Priority visibility",
  ],
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const loadSubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch("/api/subscriptions/my-subscriptions")) as any;
      const list: Subscription[] = res?.data?.subscriptions ?? res?.subscriptions ?? res ?? [];
      setSubs(Array.isArray(list) ? list : []);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const hasServicePost = useMemo(() => subs.some((s) => s.type === "SERVICE_POST"), [subs]);
  const hasSearchOnly = useMemo(
    () => subs.some((s) => s.type === "JOB_SEARCH" || s.type === "SERVICE_SEARCH"),
    [subs]
  );

  const onSubscribe = async (type: string) => {
    setMessage(null);
    setError(null);
    setCreating(type);
    try {
      await apiFetch("/api/subscriptions", { method: "POST", body: { type } });
      setMessage(`Subscribed to ${type}.`);
      await loadSubs();
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg || `Failed to subscribe to ${type}.`);
    } finally {
      setCreating(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <>
      <PageMeta title="Subscriptions" description="Manage your subscriptions" />
      <PageBreadcrumb pageTitle="Subscriptions" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {message && (
          <div className="mb-4 rounded bg-green-50 text-green-700 px-3 py-2 text-sm dark:bg-green-900/20 dark:text-green-300">{message}</div>
        )}
        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="rounded bg-blue-50 text-blue-700 px-3 py-2 text-sm dark:bg-blue-900/20 dark:text-blue-300">Loading subscriptions…</div>
        ) : subs.length === 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              No active subscriptions. Choose a plan below.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["SERVICE_SEARCH", "JOB_SEARCH", "SERVICE_POST"].map((type) => (
                <div
                  key={type}
                  className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                  style={{ minHeight: 260 }}
                >
                  <div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                      {type.replace("_", " ")}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">₹{PRICES[type]} / year</div>
                    <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
                      {(BENEFITS[type] || []).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <Button onClick={() => onSubscribe(type)} disabled={creating === type}>
                      {creating === type ? "Subscribing…" : "Subscribe"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">Your active subscriptions</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Start</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {subs.map((s) => (
                    <tr key={s._id}>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{s.type.replace("_", " ")}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(s.startDate)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(s.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upgrade banner */}
            {!hasServicePost && hasSearchOnly && (
              <div className="mt-4 flex items-center justify-between rounded bg-primary/10 px-3 py-3">
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  Upgrade to <span className="font-semibold">SERVICE POST</span> for posting services.
                </div>
                <Button onClick={() => onSubscribe("SERVICE_POST")} disabled={creating === "SERVICE_POST"}>
                  {creating === "SERVICE_POST" ? "Upgrading…" : "Upgrade"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}