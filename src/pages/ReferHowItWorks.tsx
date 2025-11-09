import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { apiFetch } from "../lib/api";
import { useProfile } from "../hooks/useProfile";

type ReferralSettings = {
  levelRates: number[];
  minWithdrawal: number;
};

// Settings are fetched from the API; do not use local defaults.

export default function ReferHowItWorks() {
  const { user } = useProfile();
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const referralCode = user?.referralId ?? "REFTEST123";
  const signupUrl = useMemo(() => `${window.location.origin}/signup?referredBy=${referralCode}`, [referralCode]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ status: string; data: { settings: ReferralSettings } }>("/api/referrals/settings");
        if (!alive) return;
        setSettings(res?.data?.settings ?? null);
      } catch {
        // no local defaults; rely only on API
        setSettings(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-4">
      <PageMeta title="How Refer & Earn Works" description="Understand referral earning, levels, and withdrawals." />
      <PageBreadcrumb pageTitle="How Refer & Earn Works" />

      {/* Hero */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 px-6 py-8 text-white">
        <h1 className="mb-2 text-2xl font-bold">Share. Grow. Earn for Life.</h1>
        <p className="mb-4 max-w-2xl text-white/90">
          Invite friends with your referral code and earn commissions across multiple levels whenever they purchase subscriptions.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-white/20 px-3 py-1 text-sm">Your Code: <strong>{referralCode}</strong></span>
          <a href="/refer-earn" className="rounded-md bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-white/90">
            Go to Refer & Earn
          </a>
          <a href={signupUrl} target="_blank" className="rounded-md bg-black/20 px-3 py-2 text-sm font-medium hover:bg-black/30">
            Share signup link
          </a>
        </div>
      </section>

      {/* The Process */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">How it works</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ title: "Share your code", desc: "Copy your code and send it to friends via WhatsApp, Telegram, or anywhere." },
            { title: "Friends join", desc: "They sign up using your code. Their account links back to you." },
            { title: "They subscribe", desc: "When they purchase a plan, commissions are generated across referral levels." },
            { title: "You withdraw", desc: "Your earnings accumulate in your wallet. Request withdrawal once you hit the minimum." }].map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                {idx + 1}
              </div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Levels & Rates */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Commission levels</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading settings…</p>
        ) : settings && Array.isArray(settings.levelRates) ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {settings.levelRates.map((rate, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-300">Level {i + 1}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(rate * 100)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Commission settings are not available.</p>
        )}
        {settings && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Minimum withdrawal: ₹{settings.minWithdrawal}</p>
        )}
      </section>

      {/* Visual chain */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Your earning chain</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="relative">
            {/* Simple visual path */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              {[
                { label: "You", hint: "Share your code" },
                { label: "Level 1", hint: "Direct referrals subscribe" },
                { label: "Level 2", hint: "Friends of your referrals" },
                { label: "Level 3+", hint: "Earnings continue across levels" },
              ].map((n, idx) => (
                <div key={idx} className="relative flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white">
                    {n.label}
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">{n.hint}</div>
                  {idx < 3 && (
                    <div className="absolute left-full top-8 hidden h-0.5 w-16 bg-brand-500 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            Each time someone in your chain purchases a subscription, you earn a commission based on their level. Earnings can continue as your network grows.
          </p>
        </div>
      </section>

      {/* Lifetime earnings */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Lifetime earning potential</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <ul className="list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
            <li>Earn for every subscription purchase across your referral chain.</li>
            <li>Higher levels may have smaller rates, but your reach multiplies as the network expands.</li>
            <li>Track balances and request withdrawals directly from your wallet.</li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="/refer-earn" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Open Refer & Earn</a>
            <a href={signupUrl} target="_blank" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-white/20 dark:hover:bg-white/10">Share signup link</a>
          </div>
        </div>
      </section>
    </div>
  );
}