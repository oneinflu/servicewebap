import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export type CompanyLocation = {
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  pincode?: string;
};

export type Company = {
  _id: string;
  name?: string;
  location?: CompanyLocation;
  website?: string;
  about?: string;
  logo?: string;
};

export type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  isAdmin?: boolean;
  skippedCompanyInfo?: boolean;
  referralId?: string;
  referralCount?: number;
  referredBy?: { name?: string; email?: string; referralId?: string } | null;
  referredUsers?: Array<{ name?: string; email?: string; referralId?: string }>;
  company?: Company | null;
  createdAt?: string;
  updatedAt?: string;
};

export function useProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    apiFetch<{ data: { user: UserProfile } }>("/api/auth/profile")
      .then((res) => {
        if (!mounted) return;
        setUser(res?.data?.user ?? null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setUser(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshProfile() {
    try {
      setLoading(true);
      const res = await apiFetch<{ data: { user: UserProfile } }>("/api/auth/profile");
      setUser(res?.data?.user ?? null);
      setError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(updates: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'skippedCompanyInfo'>>) {
    try {
      setLoading(true);
      const res = await apiFetch<{ data: { user: UserProfile } }>("/api/auth/profile", {
        method: "PUT",
        body: updates,
      });
      const updated = res?.data?.user ?? null;
      setUser(updated);
      return updated;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { user, loading, error, updateProfile, refreshProfile };
}