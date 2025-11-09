import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type ReferralSettings = {
  _id?: string;
  levelRates: number[];
  minWithdrawal: number;
  updatedBy?: string;
};

export default function AdminReferralSettings() {
  const [settings, setSettings] = useState<ReferralSettings>({ levelRates: [], minWithdrawal: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const levelCount = 10;
  const [applyAllPercent, setApplyAllPercent] = useState<string>("");
  const formatPercent = (rate: number) => {
    const v = rate * 100;
    if (!Number.isFinite(v)) return "0";
    return parseFloat(v.toFixed(6)).toString();
  };
  const [levelInputs, setLevelInputs] = useState<string[]>(Array.from({ length: levelCount }, () => ""));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ status: string; data: { settings: ReferralSettings | null } }>("/api/referrals/settings");
        if (!alive) return;
        const s = res?.data?.settings || { levelRates: [], minWithdrawal: 0 };
        setSettings({ levelRates: s.levelRates || [], minWithdrawal: s.minWithdrawal || 0 });
        const initialInputs = (s.levelRates && s.levelRates.length ? s.levelRates.slice(0, levelCount) : Array.from({ length: levelCount }, () => 0))
          .map((r) => formatPercent(r));
        while (initialInputs.length < levelCount) initialInputs.push("0");
        setLevelInputs(initialInputs);
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

  const handleRateChange = (idx: number, value: string) => {
    const cleaned = value.replace(/[^\d.]/g, ""); // allow digits and dot
    setLevelInputs((prev) => {
      const next = prev.slice();
      next[idx] = cleaned;
      return next;
    });
  };

  const applyAll = () => {
    const cleaned = applyAllPercent.replace(/[^\d.]/g, "");
    setLevelInputs(Array.from({ length: levelCount }, () => cleaned));
  };

  const handleMinWithdrawalChange = (value: string) => {
    const num = Number(value);
    setSettings((s) => ({ ...s, minWithdrawal: isNaN(num) ? 0 : num }));
  };

  const save = async () => {
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const parsedRates = levelInputs.map((str) => {
        const num = parseFloat(str);
        return Number.isFinite(num) ? num / 100 : 0; // convert % to decimal
      });
      const payload: Partial<ReferralSettings> = {
        levelRates: parsedRates.slice(0, levelCount),
        minWithdrawal: Number(settings.minWithdrawal),
      };
      await apiFetch<{ status: string; data: { settings: ReferralSettings } }>("/api/referrals/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSavedMsg("Referral settings saved successfully");
      setSettings((s) => ({ ...s, levelRates: parsedRates }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  return (
    <div>
      <PageMeta title="Admin Referral Settings" description="Configure referral commission rates and withdrawal minimum" />
      <PageBreadcrumb pageTitle="Admin Referral Settings" />

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {savedMsg}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Commission Rates by Level</h3>
        <p className="mb-4 text-xs text-gray-500">Enter percentage for each level. Example: 10 = 10% of subscription amount.</p>
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-300">Apply to all levels</label>
          <div className="relative">
            <input
              type="text"
              className="w-32 rounded-md border border-gray-300 bg-transparent px-2 py-1 pr-7 text-sm dark:border-gray-700"
              placeholder="e.g. 10"
              value={applyAllPercent}
              onChange={(e) => setApplyAllPercent(e.target.value)}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
          </div>
          <button
            type="button"
            onClick={applyAll}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/10"
          >Set</button>
        </div>
        <div className="flex flex-col gap-3">
          {levelInputs.map((input, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <label className="w-28 text-xs text-gray-600 dark:text-gray-300">Level {idx + 1}</label>
              <div className="relative w-full">
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 bg-transparent px-2 py-1 pr-7 text-sm dark:border-gray-700"
                  value={input}
                  onChange={(e) => handleRateChange(idx, e.target.value)}
                  placeholder="e.g. 0.001"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Minimum Withdrawal (₹)</label>
          <input
            type="number"
            min="0"
            className="w-60 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
            value={String(settings.minWithdrawal)}
            onChange={(e) => handleMinWithdrawalChange(e.target.value)}
          />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <span className="text-xs text-gray-500">Changes affect future commissions.</span>
        </div>
      </div>
    </div>
  );
}