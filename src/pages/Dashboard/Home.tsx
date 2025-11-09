/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { apiFetch } from "../../lib/api";

type Service = { _id: string; title?: string; name?: string; createdAt?: string };
type Job = { _id: string; title?: string; createdAt?: string };
type Company = { _id: string; name?: string; createdAt?: string };
type GovernmentJob = { _id: string; title?: string; createdAt?: string };
type Subscription = { _id: string; type?: string; endDate?: string };
type Transaction = { _id: string; amount?: number; status?: string; createdAt?: string };
type Profile = { _id: string; name?: string; email?: string; role?: string; createdAt?: string };

// API base and Authorization are handled globally by apiFetch

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [govJobs, setGovJobs] = useState<GovernmentJob[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [firstTime, setFirstTime] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSubscription = useMemo(
    () => subscriptions[0] || null,
    [subscriptions]
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchJson = async (path: string, withAuth = true): Promise<any> => {
      // Use global client; type to 'any' here to avoid TS errors when accessing nested 'data' fields
      return apiFetch<any>(path, { auth: withAuth });
    };

    (async () => {
      try {
        // Always load public lists (government jobs are public)
        const gjRes = await fetchJson("/api/government-jobs", false);

        // Load personalized data only if token exists
        const token = localStorage.getItem("token");
        if (token) {
          const [pRes, subsRes, myServicesRes, myJobsRes, myCompaniesRes, txRes, ftRes] = await Promise.all([
            fetchJson("/api/auth/profile"),
            fetchJson("/api/subscriptions/my-subscriptions"),
            fetchJson("/api/services/my-services"),
            fetchJson("/api/jobs/my-jobs"),
            fetchJson("/api/companies/my-companies"),
            fetchJson("/api/payments/my-transactions"),
            fetchJson("/api/usage/check-first-use?type=DASHBOARD"),
          ]);

          if (!isMounted) return;
          setProfile(pRes?.data?.user || null);
          setSubscriptions(subsRes?.data?.subscriptions || []);
          setMyServices(myServicesRes?.data?.services || []);
          setMyJobs(myJobsRes?.data?.jobs || []);
          setMyCompany((myCompaniesRes?.data?.companies?.[0]) || null);
          setTransactions(txRes?.data?.transactions || []);
          setFirstTime(Boolean(ftRes?.isFirstTime));

        } else {
          // No token: initialize personalized sections to defaults
          setProfile(null);
          setSubscriptions([]);
          setMyServices([]);
          setMyJobs([]);
          setMyCompany(null);
          setTransactions([]);
          setFirstTime(null);
        }

        // Set public government jobs list
        setGovJobs(gjRes?.data?.governmentJobs || gjRes?.governmentJobs || []);
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

  const Stat = ({ label, value, sublabel }: { label: string; value: React.ReactNode; sublabel?: React.ReactNode }) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</div>
      {sublabel ? (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{sublabel}</div>
      ) : null}
    </div>
  );

  return (
    <>
      <PageMeta title="Dashboard" description="User dashboard overview" />
      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading dashboard…</div>
      ) : (
        <div className="space-y-6">
          {/* Profile summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Welcome{profile?.name ? `, ${profile.name}` : ""}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {firstTime === null ? "" : firstTime ? "Nice to meet you!" : "Glad to see you again."}
                </p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {profile ? (
                  <span>{profile.email}</span>
                ) : (
                  <span>Sign in to personalize your dashboard.</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Stat label="Services Posted" value={myServices.length} />
            <Stat label="Jobs Posted" value={myJobs.length} />
            <Stat label="Transactions" value={transactions.length} sublabel={
              (() => {
                const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
                return total ? `₹${total.toLocaleString()}` : undefined;
              })()
            } />
            <Stat label="Subscription" value={activeSubscription ? (activeSubscription.type || "Active") : "None"} />
            <Stat label="Company" value={myCompany ? (myCompany.name || "Available") : "Not Set"} />
            <Stat label="Govt Jobs" value={govJobs.length} />
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/services" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Go to Services</a>
            <a href="/jobs" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Go to Jobs</a>
            <a href="/company" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800">Go to Company</a>
          </div>

          {error && (
            <div className="text-sm text-error-600">Some data failed to load: {error}</div>
          )}
        </div>
      )}
    </>
  );
}
