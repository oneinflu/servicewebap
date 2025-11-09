import { useMemo, useState } from "react";
import { useProfile } from "../hooks/useProfile";

export default function SidebarWidget() {
  const { user } = useProfile();
  const [copied, setCopied] = useState(false);
  const referralCode = user?.referralId ?? "REFTEST123";
  const signupUrl = useMemo(() => {
    try {
      return `${window.location.origin}/signup?referredBy=${referralCode}`;
    } catch {
      return `/signup?referredBy=${referralCode}`;
    }
  }, [referralCode]);

  const shareMessage = `Join ServiceInfotek with my referral code ${referralCode}. Sign up here: ${signupUrl}`;
  const share = async () => {
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (typeof nav.share === "function") {
        await nav.share({ title: "Refer & Earn", text: shareMessage, url: signupUrl });
      } else {
        await navigator.clipboard.writeText(signupUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto mb-10 w-full rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Refer & Earn</h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Share your referral code. Earn commissions across levels.
      </p>

      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-900 dark:bg-white/10 dark:text-white">
          {referralCode}
        </span>
        <button
          onClick={share}
          className="inline-flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {copied ? "Link Copied" : "Share"}
        </button>
      </div>
      <a
        href="/refer/how-it-works"
        className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        How it works
      </a>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Invite friends using your code and earn when they subscribe.
      </p>
    </div>
  );
}
