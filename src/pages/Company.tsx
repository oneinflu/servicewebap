/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { apiFetch,  } from "../lib/api";
import { useProfile } from "../hooks/useProfile";

type Company = {
  _id?: string;
  name?: string;
  website?: string;
  about?: string;
  logo?: string;
  location?: {
    address?: string;
    country?: string;
    state?: string;
    city?: string;
    district?: string;
    pincode?: string;
  };
};

export default function CompanyPage() {
  const { user, refreshProfile } = useProfile();
  const existing = user?.company as Company | undefined;

  const [form, setForm] = useState<Company>({
    name: existing?.name || "",
    website: existing?.website || "",
    about: existing?.about || "",
    logo: existing?.logo || "",
    location: {
      address: existing?.location?.address || "",
      country: existing?.location?.country || "",
      state: existing?.location?.state || "",
      city: existing?.location?.city || "",
      district: existing?.location?.district || "",
      pincode: existing?.location?.pincode || "",
    },
  });

  useEffect(() => {
    setForm({
      name: existing?.name || "",
      website: existing?.website || "",
      about: existing?.about || "",
      logo: existing?.logo || "",
      location: {
        address: existing?.location?.address || "",
        country: existing?.location?.country || "",
        state: existing?.location?.state || "",
        city: existing?.location?.city || "",
        district: existing?.location?.district || "",
        pincode: existing?.location?.pincode || "",
      },
    });
  }, [existing?._id]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const onChange = (field: keyof Company, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  const onLocChange = (field: keyof NonNullable<Company["location"]>, value: string) => {
    setForm(prev => ({ ...prev, location: { ...(prev.location || {}), [field]: value } }));
  };

  const save = async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        website: form.website,
        about: form.about,
        logo: form.logo,
        location: {
          address: form.location?.address || "",
          country: form.location?.country || "",
          state: form.location?.state || "",
          city: form.location?.city || "",
          district: form.location?.district || "",
          pincode: form.location?.pincode || "",
        },
      };
      if (existing?._id) {
        await apiFetch(`/api/companies/${existing._id}`, { method: "PATCH", body: payload });
      } else {
        await apiFetch(`/api/companies`, { method: "POST", body: payload });
      }
      setMessage(existing?._id ? "Company updated." : "Company created.");
      await refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to save company.");
    } finally {
      setSaving(false);
    }
  };

  const geocodeAddress = async () => {
    const q = (form.location?.address || "").trim();
    if (!q) {
      setLocationError("Please enter an address to geocode.");
      return;
    }
    setGeocoding(true);
    setLocationError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1`);
      const arr = await res.json();
      const best = Array.isArray(arr) ? arr[0] : null;
      const addr = best?.address || {};
      const city = addr.city || addr.town || addr.village || "";
      const district = addr.state_district || addr.county || addr.district || "";
      const state = addr.state || "";
      const country = addr.country || "";
      const pincode = addr.postcode || "";
      const addressLine = best?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
      setForm(prev => ({ ...prev, location: { ...(prev.location || {}), address: addressLine || prev.location?.address || "", city, district, state, country, pincode } }));
      if (!best) {
        setLocationError("No results found for that address.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocationError(`Address lookup failed: ${msg}`);
    } finally {
      setGeocoding(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const district = addr.state_district || addr.county || addr.district || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const addressLine = data?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
          setForm(prev => ({ ...prev, location: { ...(prev.location || {}), address: addressLine || prev.location?.address || "", city, district, state, country, pincode } }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLocationError(`Reverse geocoding failed: ${msg}`);
        } finally {
          setLocating(false);
        }
      },
      async (error) => {
        const codeMsg = error?.message || "Location service error.";
        try {
          const res = await fetch("https://ipapi.co/json");
          const ipData = await res.json();
          setForm(prev => ({
            ...prev,
            location: {
              ...(prev.location || {}),
              address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || prev.location?.address || "",
              city: ipData?.city || prev.location?.city || "",
              district: prev.location?.district || "",
              state: ipData?.region || prev.location?.state || "",
              country: ipData?.country_name || prev.location?.country || "",
              pincode: ipData?.postal || prev.location?.pincode || "",
            },
          }));
          setLocationError(`${codeMsg} Approximated via IP.`);
        } catch (ipErr) {
          const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
          setLocationError(`${codeMsg} IP lookup failed: ${ipMsg}`);
        } finally {
          setLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <>
      <PageMeta title="Company" description="Create or update your company" />
      <PageBreadcrumb pageTitle="Company" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {message && (
          <div className="mb-4 rounded bg-green-50 text-green-700 px-3 py-2 text-sm dark:bg-green-900/20 dark:text-green-300">{message}</div>
        )}
        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Company Name</label>
            <input
              type="text"
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
              value={form.name || ""}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Website</label>
            <input
              type="url"
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
              value={form.website || ""}
              onChange={(e) => onChange("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">About</label>
            <textarea
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
              rows={3}
              value={form.about || ""}
              onChange={(e) => onChange("about", e.target.value)}
              placeholder="Brief description about your company"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Logo URL</label>
            <input
              type="url"
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
              value={form.logo || ""}
              onChange={(e) => onChange("logo", e.target.value)}
              placeholder="https://...logo.png"
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">Location</h4>
          {locationError && (
            <div className="mb-3 rounded bg-yellow-50 text-yellow-700 px-3 py-2 text-sm dark:bg-yellow-900/20 dark:text-yellow-300">{locationError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Address</label>
              <input
                type="text"
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                value={form.location?.address || ""}
                onChange={(e) => onLocChange("address", e.target.value)}
                placeholder="Full address"
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={geocodeAddress} disabled={geocoding}>{geocoding ? "Geocoding..." : "Geocode Address"}</Button>
                <Button size="sm" variant="outline" onClick={useMyLocation} disabled={locating}>{locating ? "Locating..." : "Use My Location"}</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">City</label>
              <input type="text" className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" value={form.location?.city || ""} onChange={(e) => onLocChange("city", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">District</label>
              <input type="text" className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" value={form.location?.district || ""} onChange={(e) => onLocChange("district", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">State</label>
              <input type="text" className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" value={form.location?.state || ""} onChange={(e) => onLocChange("state", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Country</label>
              <input type="text" className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" value={form.location?.country || ""} onChange={(e) => onLocChange("country", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Pincode</label>
              <input type="text" className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" value={form.location?.pincode || ""} onChange={(e) => onLocChange("pincode", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button onClick={save} disabled={saving}>{saving ? (existing?._id ? "Updating..." : "Creating...") : (existing?._id ? "Update Company" : "Create Company")}</Button>
          {message && <span className="text-xs text-gray-600 dark:text-gray-300">{message}</span>}
        </div>
      </div>
    </>
  );
}