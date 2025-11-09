/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { UserIcon } from "../icons";
import { apiFetch, API_BASE, getToken } from "../lib/api";
import { useProfile } from "../hooks/useProfile";

type Subscription = { _id: string; type: string; endDate?: string };
type Category = { _id: string; name: string };
  type Service = {
    _id: string;
    categoryPrices: Array<{ category: Category; price: number }>;
    location: { address: string; district: string; city: string; state: string; country: string; pincode: string };
    user?: { name?: string; email?: string; phone?: string };
    createdAt?: string;
    isCompanyPost?: boolean;
    companyId?: string | null;
  };

type Tab = "find" | "post";

export default function ServicesPage() {
  const { user, refreshProfile } = useProfile();
  const [tab, setTab] = useState<Tab>("find");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [myServicesCount, setMyServicesCount] = useState<number>(0);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasSearchAccess = useMemo(() => subs.some(s => ["SERVICE_SEARCH", "SERVICE_POST"].includes(s.type)), [subs]);
  const hasPostSub = useMemo(() => subs.some(s => s.type === "SERVICE_POST"), [subs]);
  const firstPostFreeEligible = useMemo(() => !hasPostSub && myServicesCount === 0, [hasPostSub, myServicesCount]);
  const tokenParam = (() => {
    const t = getToken();
    return t ? `&token=${encodeURIComponent(t)}` : "";
  })();

  // Find Services state
  const [keyword, setKeyword] = useState<string>("");
  const [searchLocation, setSearchLocation] = useState({ address: "", city: "", district: "", state: "", country: "", pincode: "" });
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Post Service state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoryPrices, setCategoryPrices] = useState<Record<string, number>>({});
  const [location, setLocation] = useState({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
  const [posting, setPosting] = useState<boolean>(false);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  // Company posting toggle and modal state
  const [postAsCompany, setPostAsCompany] = useState<boolean>(false);
  const [companyModalOpen, setCompanyModalOpen] = useState<boolean>(false);
  const [companySaving, setCompanySaving] = useState<boolean>(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>(user?.company?.name ?? "");
  const [companyWebsite, setCompanyWebsite] = useState<string>(user?.company?.website ?? "");
  const [companyAbout, setCompanyAbout] = useState<string>(user?.company?.about ?? "");
  const [companyLogo, setCompanyLogo] = useState<string>(user?.company?.logo ?? "");
  const [companyLocation, setCompanyLocation] = useState({
    address: user?.company?.location?.address ?? "",
    country: user?.company?.location?.country ?? "",
    state: user?.company?.location?.state ?? "",
    city: user?.company?.location?.city ?? "",
    district: user?.company?.location?.district ?? "",
    pincode: user?.company?.location?.pincode ?? "",
  });
  const [companyAddress, setCompanyAddress] = useState<string>("");
  const [companyLocating, setCompanyLocating] = useState<boolean>(false);
  const [companyLocationError, setCompanyLocationError] = useState<string | null>(null);
  const [companyGeocoding, setCompanyGeocoding] = useState<boolean>(false);
  const [companyGeocodingError, setCompanyGeocodingError] = useState<string | null>(null);

  useEffect(() => {
    // Align toggle with presence of company by default, and sync form values
    setPostAsCompany(Boolean(user?.company));
    setCompanyName(user?.company?.name ?? "");
    setCompanyWebsite(user?.company?.website ?? "");
    setCompanyAbout(user?.company?.about ?? "");
    setCompanyLogo(user?.company?.logo ?? "");
    setCompanyLocation({
      address: user?.company?.location?.address ?? "",
      country: user?.company?.location?.country ?? "",
      state: user?.company?.location?.state ?? "",
      city: user?.company?.location?.city ?? "",
      district: user?.company?.location?.district ?? "",
      pincode: user?.company?.location?.pincode ?? "",
    });
  }, [user?.company]);

  // When posting as company, pre-fill the post location inputs with company location (still editable)
  useEffect(() => {
    if (postAsCompany && user?.company?.location) {
      const compLoc = user.company.location;
      setLocation({
        address: compLoc.address || "",
        country: compLoc.country || "",
        state: compLoc.state || "",
        city: compLoc.city || "",
        district: compLoc.district || "",
        pincode: compLoc.pincode || "",
      });
    }
  }, [postAsCompany, user?.company?._id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (token) {
          const [subsRes, myServicesRes] = await Promise.all([
            apiFetch<any>("/api/subscriptions/my-subscriptions"),
            apiFetch<any>("/api/services/my-services"),
          ]);
          if (mounted) {
            setSubs(subsRes?.data?.subscriptions ?? []);
            const ms = myServicesRes?.data?.services ?? [];
            setMyServices(ms);
            setMyServicesCount(ms.length);
          }
        }
        const catRes = await apiFetch<any>("/api/categories/type/Service", { auth: false });
        if (mounted) {
          setCategories(catRes?.data?.categories ?? []);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (mounted) {
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleTab = (next: Tab) => setTab(next);

  // Find Services: search
  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostMessage(null);
    setError(null);
    setSearching(true);
    try {
      const params = new URLSearchParams();
      const effectiveKeyword = (keyword || "").trim() || (searchLocation.address || "").trim();
      if (!effectiveKeyword) {
        setError("Please enter a keyword or address.");
        setSearching(false);
        return;
      }
      params.set("keyword", effectiveKeyword);
      if (searchLocation.city) params.set("city", searchLocation.city);
      if (searchLocation.district) params.set("district", searchLocation.district);
      if (searchLocation.state) params.set("state", searchLocation.state);
      if (searchLocation.country) params.set("country", searchLocation.country);
      if (searchLocation.pincode) params.set("pincode", searchLocation.pincode);
      const res = await apiFetch<any>(`/api/services/search?${params.toString()}`);
      setSearchResults(res?.data?.services ?? []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Auto-fill location using browser geolocation and reverse geocoding
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeAddressForSearch = async () => {
    const q = (searchLocation.address || "").trim();
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
      setSearchLocation(prev => ({ ...prev, address: addressLine, city, district, state, country, pincode }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLocationError(`Address lookup failed: ${message}`);
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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const district = addr.state_district || addr.county || addr.district || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const addressLine = data?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
          setSearchLocation((prev) => ({
            ...prev,
            address: addressLine,
            city,
            district,
            state,
            country,
            pincode,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setLocationError(message);
          // Fallback to IP-based geolocation if reverse geocoding fails
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            const ipData = await ipRes.json();
            setSearchLocation((prev) => ({
              ...prev,
              address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || prev.address || "",
              city: ipData?.city || prev.city || "",
              district: prev.district || "",
              state: ipData?.region || prev.state || "",
              country: ipData?.country_name || prev.country || "",
              pincode: ipData?.postal || prev.pincode || "",
            }));
            setLocationError("Device location unavailable; approximated via IP.");
          } catch (ipErr) {
            const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
            setLocationError(`Location unavailable and IP lookup failed: ${ipMsg}`);
          }
        } finally {
          setLocating(false);
        }
      },
      async (err) => {
        // Map common geolocation errors
        const codeMsg =
          err.code === 1
            ? "Permission denied for location access."
            : err.code === 2
            ? "Position unavailable from device."
            : err.code === 3
            ? "Location request timed out."
            : "Unable to get current location.";
        setLocationError(codeMsg);
        // Fallback to IP-based geolocation
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          setSearchLocation((prev) => ({
            ...prev,
            address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || prev.address || "",
            city: ipData?.city || prev.city || "",
            district: prev.district || "",
            state: ipData?.region || prev.state || "",
            country: ipData?.country_name || prev.country || "",
            pincode: ipData?.postal || prev.pincode || "",
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

  // Auto-fill posting location using browser geolocation and reverse geocoding
  const [postingLocating, setPostingLocating] = useState(false);
  const [postingLocationError, setPostingLocationError] = useState<string | null>(null);
  const [postingGeocoding, setPostingGeocoding] = useState(false);
  const geocodeAddressForPost = async () => {
    const q = (location.address || "").trim();
    if (!q) {
      setPostingLocationError("Please enter an address to geocode.");
      return;
    }
    setPostingGeocoding(true);
    setPostingLocationError(null);
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
      setLocation(prev => ({ ...prev, address: addressLine, city, district, state, country, pincode }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPostingLocationError(`Address lookup failed: ${message}`);
    } finally {
      setPostingGeocoding(false);
    }
  };
  const useMyLocationForPost = () => {
    if (!navigator.geolocation) {
      setPostingLocationError("Geolocation not supported in this browser.");
      return;
    }
    setPostingLocating(true);
    setPostingLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const district = addr.state_district || addr.county || addr.district || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const addressLine = data?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
          setLocation((prev) => ({
            ...prev,
            address: addressLine,
            city,
            district,
            state,
            country,
            pincode,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setPostingLocationError(message);
          // Fallback to IP-based geolocation if reverse geocoding fails
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            const ipData = await ipRes.json();
            setLocation((prev) => ({
              ...prev,
              address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || (prev as any).address || "",
              city: ipData?.city || prev.city || "",
              district: prev.district || "",
              state: ipData?.region || prev.state || "",
              country: ipData?.country_name || prev.country || "",
              pincode: ipData?.postal || prev.pincode || "",
            }));
            setPostingLocationError("Device location unavailable; approximated via IP.");
          } catch (ipErr) {
            const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
            setPostingLocationError(`Location unavailable and IP lookup failed: ${ipMsg}`);
          }
        } finally {
          setPostingLocating(false);
        }
      },
      async (err) => {
        const codeMsg =
          err.code === 1
            ? "Permission denied for location access."
            : err.code === 2
            ? "Position unavailable from device."
            : err.code === 3
            ? "Location request timed out."
            : "Unable to get current location.";
        setPostingLocationError(codeMsg);
        // Fallback to IP-based geolocation
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          setLocation((prev) => ({
            ...prev,
            address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || (prev as any).address || "",
            city: ipData?.city || prev.city || "",
            district: prev.district || "",
            state: ipData?.region || prev.state || "",
            country: ipData?.country_name || prev.country || "",
            pincode: ipData?.postal || prev.pincode || "",
          }));
          setPostingLocationError(`${codeMsg} Approximated via IP.`);
        } catch (ipErr) {
          const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
          setPostingLocationError(`${codeMsg} IP lookup failed: ${ipMsg}`);
        } finally {
          setPostingLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Company Modal: detect current location for company
  const useMyLocationForCompany = () => {
    if (!navigator.geolocation) {
      setCompanyLocationError("Geolocation not supported in this browser.");
      return;
    }
    setCompanyLocating(true);
    setCompanyLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const district = addr.state_district || addr.county || addr.district || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const addressLine = data?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
          setCompanyAddress(addressLine || "");
          setCompanyLocation((prev) => ({
            ...prev,
            address: addressLine || prev.address || "",
            city,
            district,
            state,
            country,
            pincode,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCompanyLocationError(message);
          // Fallback to IP-based geolocation
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            const ipData = await ipRes.json();
            const ipAddressLine = [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ");
            setCompanyAddress(ipAddressLine);
            setCompanyLocation((prev) => ({
              ...prev,
              address: ipAddressLine || prev.address || "",
              city: ipData?.city || prev.city || "",
              district: prev.district || "",
              state: ipData?.region || prev.state || "",
              country: ipData?.country_name || prev.country || "",
              pincode: ipData?.postal || prev.pincode || "",
            }));
            setCompanyLocationError("Device location unavailable; approximated via IP.");
          } catch (ipErr) {
            const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
            setCompanyLocationError(`Location unavailable and IP lookup failed: ${ipMsg}`);
          }
        } finally {
          setCompanyLocating(false);
        }
      },
      async (err) => {
        const codeMsg =
          err.code === 1
            ? "Permission denied for location access."
            : err.code === 2
            ? "Position unavailable from device."
            : err.code === 3
            ? "Location request timed out."
            : "Unable to get current location.";
        setCompanyLocationError(codeMsg);
        // Fallback to IP-based geolocation
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          const ipAddressLine2 = [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ");
          setCompanyAddress(ipAddressLine2);
          setCompanyLocation((prev) => ({
            ...prev,
            address: ipAddressLine2 || prev.address || "",
            city: ipData?.city || prev.city || "",
            district: prev.district || "",
            state: ipData?.region || prev.state || "",
            country: ipData?.country_name || prev.country || "",
            pincode: ipData?.postal || prev.pincode || "",
          }));
          setCompanyLocationError(`${codeMsg} Approximated via IP.`);
        } catch (ipErr) {
          const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
          setCompanyLocationError(`${codeMsg} IP lookup failed: ${ipMsg}`);
        } finally {
          setCompanyLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Company Modal: forward geocode from address input
  const geocodeAddressForCompany = async () => {
    const q = (companyAddress || "").trim();
    if (!q) {
      setCompanyGeocodingError("Please enter an address to geocode.");
      return;
    }
    setCompanyGeocoding(true);
    setCompanyGeocodingError(null);
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
      setCompanyAddress(addressLine || "");
      setCompanyLocation(prev => ({ ...prev, address: addressLine || prev.address || "", city, district, state, country, pincode }));
      if (!best) {
        setCompanyGeocodingError("No results found for that address.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCompanyGeocodingError(`Address lookup failed: ${message}`);
    } finally {
      setCompanyGeocoding(false);
    }
  };

  const openCompanyModalForCreate = () => {
    setCompanyError(null);
    setCompanyName("");
    setCompanyWebsite("");
    setCompanyAbout("");
    setCompanyLogo("");
    setCompanyAddress("");
    setCompanyLocation({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
    setCompanyModalOpen(true);
  };
  const openCompanyModalForEdit = () => {
    setCompanyError(null);
    setCompanyName(user?.company?.name ?? "");
    setCompanyWebsite(user?.company?.website ?? "");
    setCompanyAbout(user?.company?.about ?? "");
    setCompanyLogo(user?.company?.logo ?? "");
    setCompanyAddress("");
    setCompanyLocation({
      address: user?.company?.location?.address ?? "",
      country: user?.company?.location?.country ?? "",
      state: user?.company?.location?.state ?? "",
      city: user?.company?.location?.city ?? "",
      district: user?.company?.location?.district ?? "",
      pincode: user?.company?.location?.pincode ?? "",
    });
    setCompanyModalOpen(true);
  };
  const closeCompanyModal = () => setCompanyModalOpen(false);
  const handleCompanySave = async () => {
    setCompanyError(null);
    if (!companyName || !companyLocation.country || !companyLocation.state || !companyLocation.city || !companyLocation.district) {
      setCompanyError("Please fill company name and full location (country, state, city, district).");
      return;
    }
    setCompanySaving(true);
    try {
      const payload = { name: companyName, location: companyLocation, website: companyWebsite, about: companyAbout, logo: companyLogo };
      if (user?.company?._id) {
        await apiFetch(`/api/companies/${user.company._id}`, { method: "PATCH", body: payload });
      } else {
        await apiFetch(`/api/companies`, { method: "POST", body: payload });
      }
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }
      setCompanyModalOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setCompanyError(message || "Unable to save company.");
    } finally {
      setCompanySaving(false);
    }
  };

  // Post Service: submit
  const onPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPostMessage(null);
    if (selectedCategoryIds.length === 0) {
      setError("Please select at least one category.");
      return;
    }
    // first-post-free: only allow single category if no subscription and first post
    if (!hasPostSub && myServicesCount >= 1) {
      setError("You have used your free service post. Please subscribe to post more services.");
      return;
    }
    if (!hasPostSub && selectedCategoryIds.length > 1) {
      setError("Multiple categories require a Service Post subscription.");
      return;
    }
    // build categoryPrices array
    const payloadCategoryPrices = selectedCategoryIds.map(id => ({ category: id, price: Number(categoryPrices[id] || 0) }));
    // basic validation of prices
    if (payloadCategoryPrices.some(cp => !cp.price || cp.price <= 0)) {
      setError("Please set a positive price for each selected category.");
      return;
    }
    // location handling: always use the location inputs; if posting as company, inputs are prefilled from company but remain editable
    const { address, country, state, city, district, pincode } = location;
    if (!address || !country || !state || !city || !district || !pincode) {
      setError("Please fill complete location (address, country, state, city, district, pincode).");
      return;
    }
    const finalLocation = location;
    setPosting(true);
    try {
      const res = await apiFetch<any>("/api/services", {
        method: "POST",
        body: {
          categoryPrices: payloadCategoryPrices,
          location: finalLocation,
          isCompanyPost: Boolean(postAsCompany),
          companyId: postAsCompany ? (user?.company?._id ?? null) : null,
        },
      });
      const created = res?.data?.service;
      setPostMessage(created ? "Service posted successfully." : "Posted.");
      // update local myServicesCount and list immediately
      setMyServicesCount(prev => prev + 1);
      if (created) {
        setMyServices(prev => [created, ...prev]);
      }
      // reset form
      setSelectedCategoryIds([]);
      setCategoryPrices({});
      setLocation({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setPosting(false);
    }
  };

  // Post Service: edit/delete helpers
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<Record<string, number>>({});
  const [editLocation, setEditLocation] = useState({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editLocating, setEditLocating] = useState(false);
  const [editLocationError, setEditLocationError] = useState<string | null>(null);
  const [editGeocoding, setEditGeocoding] = useState(false);
  const [editGeocodingError, setEditGeocodingError] = useState<string | null>(null);

  const startEdit = (svc: Service) => {
    setEditingId(svc._id);
    const initialPrices: Record<string, number> = {};
    for (const cp of svc.categoryPrices) {
      if (cp.category?._id) initialPrices[cp.category._id] = cp.price;
    }
    setEditPrices(initialPrices);
    setEditLocation({
      address: svc.location?.address || "",
      country: svc.location?.country || "",
      state: svc.location?.state || "",
      city: svc.location?.city || "",
      district: svc.location?.district || "",
      pincode: svc.location?.pincode || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrices({});
    setEditLocation({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError(null);
    // Require full location including address when editing
    if (!editLocation.address || !editLocation.country || !editLocation.state || !editLocation.city || !editLocation.district || !editLocation.pincode) {
      setError("Please fill complete location (address, country, state, city, district, pincode).");
      return;
    }
    setSavingEdit(true);
    try {
      const svc = myServices.find(s => s._id === editingId);
      const payloadCategoryPrices = (svc?.categoryPrices || []).map(cp => ({
        category: cp.category?._id as string,
        price: Number(editPrices[cp.category?._id as string] || cp.price || 0)
      }));
      if (payloadCategoryPrices.some(cp => !cp.price || cp.price <= 0)) {
        setError("Please set a positive price for each category.");
        setSavingEdit(false);
        return;
      }
      const res = await apiFetch<any>(`/api/services/${editingId}`, {
        method: "PUT",
        body: {
          categoryPrices: payloadCategoryPrices,
          location: editLocation,
        },
      });
      const updated: Service | undefined = res?.data?.service;
      if (updated) {
        setMyServices(prev => prev.map(s => (s._id === editingId ? updated : s)));
        cancelEdit();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Edit Service: auto-fill location using browser geolocation
  const useMyLocationForEdit = () => {
    if (!navigator.geolocation) {
      setEditLocationError("Geolocation not supported in this browser.");
      return;
    }
    setEditLocating(true);
    setEditLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const district = addr.state_district || addr.county || addr.district || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const addressLine = data?.display_name || [addr.house_number, addr.road, addr.suburb, city, district, state, country, pincode].filter(Boolean).join(", ");
          setEditLocation((prev) => ({
            ...prev,
            address: addressLine || prev.address || "",
            city,
            district,
            state,
            country,
            pincode,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setEditLocationError(message);
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            const ipData = await ipRes.json();
            setEditLocation((prev) => ({
              ...prev,
              address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || prev.address || "",
              city: ipData?.city || prev.city || "",
              district: prev.district || "",
              state: ipData?.region || prev.state || "",
              country: ipData?.country_name || prev.country || "",
              pincode: ipData?.postal || prev.pincode || "",
            }));
            setEditLocationError("Device location unavailable; approximated via IP.");
          } catch (ipErr) {
            const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
            setEditLocationError(`Location unavailable and IP lookup failed: ${ipMsg}`);
          }
        } finally {
          setEditLocating(false);
        }
      },
      async (err) => {
        const codeMsg =
          err.code === 1
            ? "Permission denied for location access."
            : err.code === 2
            ? "Position unavailable from device."
            : err.code === 3
            ? "Location request timed out."
            : "Unable to get current location.";
        setEditLocationError(codeMsg);
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          setEditLocation((prev) => ({
            ...prev,
            address: [ipData?.city, ipData?.region, ipData?.country_name, ipData?.postal].filter(Boolean).join(", ") || prev.address || "",
            city: ipData?.city || prev.city || "",
            district: prev.district || "",
            state: ipData?.region || prev.state || "",
            country: ipData?.country_name || prev.country || "",
            pincode: ipData?.postal || prev.pincode || "",
          }));
          setEditLocationError(`${codeMsg} Approximated via IP.`);
        } catch (ipErr) {
          const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
          setEditLocationError(`${codeMsg} IP lookup failed: ${ipMsg}`);
        } finally {
          setEditLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Edit Service: forward geocode from address input
  const geocodeAddressForEdit = async () => {
    const q = (editLocation.address || "").trim();
    if (!q) {
      setEditGeocodingError("Please enter an address to geocode.");
      return;
    }
    setEditGeocoding(true);
    setEditGeocodingError(null);
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
      setEditLocation(prev => ({ ...prev, address: addressLine || prev.address || "", city, district, state, country, pincode }));
      if (!best) {
        setEditGeocodingError("No results found for that address.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEditGeocodingError(`Address lookup failed: ${message}`);
    } finally {
      setEditGeocoding(false);
    }
  };

  const deleteService = async (id: string) => {
    setError(null);
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete this service?");
    if (!ok) return;
    try {
      await apiFetch(`/api/services/${id}`, { method: "DELETE" });
      setMyServices(prev => prev.filter(s => s._id !== id));
      setMyServicesCount(prev => Math.max(0, prev - 1));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  return (
    <>
      <PageMeta title="Services" description="Find and post services" />
      <PageBreadcrumb pageTitle="Services" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {loading && (
          <div className="mb-4 rounded bg-gray-50 text-gray-700 px-3 py-2 text-sm dark:bg-white/5 dark:text-gray-300">
            Loading...
          </div>
        )}
        <div className="flex gap-2 mb-6">
          <button
            className={`rounded-lg px-4 h-10 text-sm border ${tab === "find" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-700"}`}
            onClick={() => toggleTab("find")}
          >
            Find Services
          </button>
          <button
            className={`rounded-lg px-4 h-10 text-sm border ${tab === "post" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-700"}`}
            onClick={() => toggleTab("post")}
          >
            Post Service
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {tab === "find" && (
          <div className="space-y-6">
            {!hasSearchAccess && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Search Services Subscription</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">100 Rs per annum, unlimited usage.</p>
                <div className="mt-4">
                  <a href={`${API_BASE}/payment?type=SERVICE_SEARCH${tokenParam}`} className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                    Subscribe Now
                  </a>
                </div>
              </div>
            )}

            {hasSearchAccess && (
              <div className="space-y-4">
                <form onSubmit={onSearch} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Search by any keyword: category, location, etc."
                    className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <input
                    className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                    placeholder="Full Address (optional)"
                    value={searchLocation.address}
                    onChange={(e) => setSearchLocation({ ...searchLocation, address: e.target.value })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="City" value={searchLocation.city} onChange={(e) => setSearchLocation({ ...searchLocation, city: e.target.value })} />
                    <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="District" value={searchLocation.district} onChange={(e) => setSearchLocation({ ...searchLocation, district: e.target.value })} />
                    <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="State" value={searchLocation.state} onChange={(e) => setSearchLocation({ ...searchLocation, state: e.target.value })} />
                    <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Country" value={searchLocation.country} onChange={(e) => setSearchLocation({ ...searchLocation, country: e.target.value })} />
                    <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Pincode" value={searchLocation.pincode} onChange={(e) => setSearchLocation({ ...searchLocation, pincode: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={useMyLocation}
                      disabled={locating}
                      startIcon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                        </svg>
                      }
                    >
                      {locating ? "Detecting..." : "Use My Location"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={geocodeAddressForSearch}
                      disabled={geocoding}
                    >
                      {geocoding ? "Resolving..." : "Fill from Address"}
                    </Button>
                    {locationError && (
                      <span className="text-xs text-red-600">{locationError}</span>
                    )}
                  </div>
                  <button className="rounded-lg border border-gray-200 px-4 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" disabled={searching}>
                    {searching ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((svc) => (
                    <div key={svc._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      {/* Categories */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categories</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-2">
                        {svc.categoryPrices.map(cp => cp.category?.name).filter(Boolean).join(", ")}
                      </p>

                      {/* Location */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-3">
                        {[svc.location?.district, svc.location?.city, svc.location?.state, svc.location?.country].filter(Boolean).join(", ")}
                        {svc.location?.pincode ? `, ${svc.location.pincode}` : ""}
                      </p>

                      {/* Contact */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                          <UserIcon className="size-4" />
                          <span className="text-sm">{svc.user?.name || "—"}</span>
                        </div>
                        <div className="flex items-center">
                          {svc.user?.phone ? (
                            <a
                              href={`tel:${svc.user.phone}`}
                              aria-label={`Call ${svc.user?.name || "provider"}`}
                            >
                              <Button
                                size="sm"
                                variant="primary"
                                startIcon={
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="size-4"
                                  >
                                    <path d="M2.003 5.884c-.14-1.12.76-2.07 1.89-2.07h3.063c.9 0 1.678.61 1.86 1.49l.53 2.563c.16.78-.23 1.58-.94 1.94l-1.44.75a14.49 14.49 0 006.56 6.56l.75-1.44c.36-.71 1.16-1.1 1.94-.94l2.563.53c.88.182 1.49.96 1.49 1.86v3.063c0 1.13-.95 2.03-2.07 1.89-9.66-1.21-17.36-8.91-18.57-18.57z" />
                                  </svg>
                                }
                              >
                                Call
                              </Button>
                            </a>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              startIcon={
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="size-4"
                                >
                                  <path d="M2.003 5.884c-.14-1.12.76-2.07 1.89-2.07h3.063c.9 0 1.678.61 1.86 1.49l.53 2.563c.16.78-.23 1.58-.94 1.94l-1.44.75a14.49 14.49 0 006.56 6.56l.75-1.44c.36-.71 1.16-1.1 1.94-.94l2.563.53c.88.182 1.49.96 1.49 1.86v3.063c0 1.13-.95 2.03-2.07 1.89-9.66-1.21-17.36-8.91-18.57-18.57z" />
                                </svg>
                              }
                            >
                              Call
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "post" && (
          <div className="space-y-6">
            {myServices.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">Your Services</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myServices.map((svc) => (
                    <div key={svc._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categories</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-2">
                        {svc.categoryPrices.map(cp => cp.category?.name).filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-3">
                        {[svc.location?.district, svc.location?.city, svc.location?.state, svc.location?.country].filter(Boolean).join(", ")}
                        {svc.location?.pincode ? `, ${svc.location.pincode}` : ""}
                      </p>

                      {editingId === svc._id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {svc.categoryPrices.map(cp => (
                              <div key={cp.category?._id || String(Math.random())} className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 dark:text-gray-400">Price for {cp.category?.name} (Rs)</label>
                                <input
                                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                                  type="number"
                                  min={1}
                                  value={editPrices[cp.category?._id as string] ?? cp.price}
                                  onChange={(e) => setEditPrices(prev => ({ ...prev, [cp.category?._id as string]: Number(e.target.value) }))}
                                />
                              </div>
                            ))}
                          </div>
                          {svc.isCompanyPost && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Prefilled from company. You can edit if needed.</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent sm:col-span-2" placeholder="Full Address" value={editLocation.address} onChange={(e) => setEditLocation({ ...editLocation, address: e.target.value })} />
                            <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Country" value={editLocation.country} onChange={(e) => setEditLocation({ ...editLocation, country: e.target.value })} />
                            <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="State" value={editLocation.state} onChange={(e) => setEditLocation({ ...editLocation, state: e.target.value })} />
                            <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="City" value={editLocation.city} onChange={(e) => setEditLocation({ ...editLocation, city: e.target.value })} />
                            <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="District" value={editLocation.district} onChange={(e) => setEditLocation({ ...editLocation, district: e.target.value })} />
                            <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Pincode" value={editLocation.pincode} onChange={(e) => setEditLocation({ ...editLocation, pincode: e.target.value })} />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={useMyLocationForEdit}
                              disabled={editLocating}
                              startIcon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>}
                            >
                              {editLocating ? "Detecting..." : "Use My Location"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={geocodeAddressForEdit}
                              disabled={editGeocoding}
                            >
                              {editGeocoding ? "Resolving..." : "Fill from Address"}
                            </Button>
                            {(editLocationError || editGeocodingError) && (
                              <span className="text-xs text-red-600">{editLocationError || editGeocodingError}</span>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={cancelEdit}>
                              Cancel
                            </button>
                            <button className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={saveEdit} disabled={savingEdit}>
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => startEdit(svc)}>
                            Edit
                          </button>
                          <button className="rounded-lg border border-red-200 px-3 h-9 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300" onClick={() => deleteService(svc._id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!hasPostSub && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Service Post Plan</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Multiple categories require subscription (Rs 500 per annum).</p>
                {firstPostFreeEligible ? (
                  <p className="mt-2 text-sm text-brand-700">You can post one service for free (single category).</p>
                ) : (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">You have used your free service post. Subscribe to post more services.</p>
                )}
                <div className="mt-4">
                  <a href={`${API_BASE}/payment?type=SERVICE_POST${tokenParam}`} className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                    Subscribe Now
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={onPost} className="space-y-4">
              {postMessage && (
                <div className="rounded bg-green-50 text-green-700 px-3 py-2 text-sm dark:bg-green-900/20 dark:text-green-300">{postMessage}</div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat._id}
                      type="button"
                      className={`rounded-full px-3 h-8 text-sm border ${selectedCategoryIds.includes(cat._id) ? "border-brand-200 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-700"}`}
                      onClick={() => toggleCategory(cat._id)}
                      disabled={posting}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {!hasPostSub && selectedCategoryIds.length > 1 && (
                  <p className="mt-2 text-xs text-red-600">Multiple categories require subscription.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCategoryIds.map(id => (
                  <div key={id} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Price for {categories.find(c => c._id === id)?.name} (Rs)</label>
                    <input
                      className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                      type="number"
                      min={1}
                      value={categoryPrices[id] ?? ""}
                      onChange={(e) => setCategoryPrices(prev => ({ ...prev, [id]: Number(e.target.value) }))}
                      disabled={posting}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Company Post</p>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={postAsCompany} onChange={(e) => setPostAsCompany(e.target.checked)} disabled={posting} />
                    Post as Company
                  </label>
                  {postAsCompany && (
                    user?.company ? (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>Using:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{user.company.name}</span>
                        <button type="button" className="rounded-lg border border-gray-200 px-2 h-7 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={openCompanyModalForEdit}>
                          Edit Company
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <span>No company on file.</span>
                        <button type="button" className="rounded-lg border border-brand-200 bg-brand-50 px-2 h-7 text-xs text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300" onClick={openCompanyModalForCreate}>
                          Add Company
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Location</p>
                {postAsCompany && user?.company && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Prefilled from company. You can edit if needed.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent sm:col-span-2" placeholder="Full Address" value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} disabled={posting} />
                  <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Country" value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} disabled={posting} />
                  <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="State" value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} disabled={posting} />
                  <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="City" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} disabled={posting} />
                  <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="District" value={location.district} onChange={(e) => setLocation({ ...location, district: e.target.value })} disabled={posting} />
                  <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Pincode" value={location.pincode} onChange={(e) => setLocation({ ...location, pincode: e.target.value })} disabled={posting} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={useMyLocationForPost}
                    disabled={postingLocating || posting}
                    startIcon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                      </svg>
                    }
                  >
                    {postingLocating ? "Detecting..." : "Use My Location"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={geocodeAddressForPost}
                    disabled={postingGeocoding || posting}
                  >
                    {postingGeocoding ? "Resolving..." : "Fill from Address"}
                  </Button>
                  {postingLocationError && (
                    <span className="text-xs text-red-600">{postingLocationError}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button className="rounded-lg border border-gray-200 px-4 h-10 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" disabled={posting}>
                  {posting ? "Posting..." : "Post Service"}
                </button>
              </div>
            </form>

            {companyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h5 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">{user?.company ? "Edit Company" : "Add Company"}</h5>
                  {companyError && (
                    <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{companyError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company Name</label>
                      <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent w-full" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Website</label>
                      <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent w-full" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">About</label>
                      <textarea className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent w-full" rows={3} value={companyAbout} onChange={(e) => setCompanyAbout(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Logo URL</label>
                      <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent w-full" value={companyLogo} onChange={(e) => setCompanyLogo(e.target.value)} />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Company Location</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent sm:col-span-2" placeholder="Full Address" value={companyAddress} onChange={(e) => { const v = e.target.value; setCompanyAddress(v); setCompanyLocation({ ...companyLocation, address: v }); }} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Country" value={companyLocation.country} onChange={(e) => setCompanyLocation({ ...companyLocation, country: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="State" value={companyLocation.state} onChange={(e) => setCompanyLocation({ ...companyLocation, state: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="City" value={companyLocation.city} onChange={(e) => setCompanyLocation({ ...companyLocation, city: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="District" value={companyLocation.district} onChange={(e) => setCompanyLocation({ ...companyLocation, district: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Pincode" value={companyLocation.pincode} onChange={(e) => setCompanyLocation({ ...companyLocation, pincode: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={useMyLocationForCompany} disabled={companyLocating} startIcon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>}>
                          {companyLocating ? "Detecting..." : "Use My Location"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={geocodeAddressForCompany} disabled={companyGeocoding} startIcon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>}>
                          {companyGeocoding ? "Resolving..." : "Fill from Address"}
                        </Button>
                        {(companyLocationError || companyGeocodingError) && (
                          <span className="text-xs text-red-600 dark:text-red-400">{companyLocationError || companyGeocodingError}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-4">
                    <button type="button" className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeCompanyModal}>Cancel</button>
                    <button type="button" className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={handleCompanySave} disabled={companySaving}>{companySaving ? "Saving..." : "Save"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}