/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { UserIcon } from "../icons";
import { apiFetch, API_BASE, getToken } from "../lib/api";
import { useProfile } from "../hooks/useProfile";
import MultiSelect from "../components/form/MultiSelect";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";

type Subscription = { _id: string; type: string; endDate?: string };
type Category = { _id: string; name: string };
  type Job = {
    _id: string;
    categories: Category[];
    location: { address: string; district: string; city: string; state: string; country: string; pincode: string };
    user?: { name?: string; email?: string; phone?: string };
    createdAt?: string;
    isCompanyPost?: boolean;
    companyId?: string | null;
  };

  type Candidate = {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    resumeUrl?: string;
    interestedJobCategories: Category[];
  };

type Tab = "find" | "post" | "candidates";

export default function JobsPage() {
  const { user, refreshProfile } = useProfile();
  const [tab, setTab] = useState<Tab>("find");
  // Unified Job Type selection: Private vs Government categories
  type JobKind = 'Private' | 'Govt Jobs' | 'PSU Jobs' | 'Semi Govt Jobs' | 'MSME Jobs';
  const [jobKind, setJobKind] = useState<JobKind>('Private');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [myJobsCount, setMyJobsCount] = useState<number>(0);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Allow JOB_SEARCH trial for 7 days from user signup
  const jobTrialActive = useMemo(() => {
    try {
      const createdAt = user?.createdAt ? new Date(user.createdAt).getTime() : null;
      if (!createdAt) return false;
      const now = Date.now();
      const trialMillis = 7 * 24 * 60 * 60 * 1000; // 7 days
      return (now - createdAt) < trialMillis;
    } catch {
      return false;
    }
  }, [user?.createdAt]);
  // Private jobs require subscription or trial; Government jobs are public
  const hasSearchAccess = useMemo(() => {
    if (jobKind !== 'Private') return true;
    return jobTrialActive || subs.some(s => ["JOB_SEARCH", "SERVICE_POST"].includes(s.type));
  }, [subs, jobTrialActive, jobKind]);
  const hasPostSub = useMemo(() => subs.some(s => s.type === "SERVICE_POST"), [subs]);
  
  const tokenParam = (() => {
    const t = getToken();
    return t ? `&token=${encodeURIComponent(t)}` : "";
  })();

  // Find Services state
  const [keyword, setKeyword] = useState<string>("");
  const [searchLocation, setSearchLocation] = useState({ address: "", city: "", district: "", state: "", country: "", pincode: "" });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  // Find Candidates state
  const [candidateCategoryIds, setCandidateCategoryIds] = useState<string[]>([]);
  const [candidateResults, setCandidateResults] = useState<Candidate[]>([]);
  const [candidateSearching, setCandidateSearching] = useState<boolean>(false);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  // Interested Jobs state
  const [interestedCategoryIds, setInterestedCategoryIds] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [savingInterests, setSavingInterests] = useState<boolean>(false);
  const [interestsMessage, setInterestsMessage] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  // Modal for Interests
  const { isOpen: interestsModalOpen, openModal: openInterestsModal, closeModal: closeInterestsModal } = useModal();

  // Post Service state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
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
          const [subsRes, myJobsRes] = await Promise.all([
            apiFetch<any>("/api/subscriptions/my-subscriptions"),
            apiFetch<any>("/api/jobs/my-jobs"),
          ]);
          if (mounted) {
            setSubs(subsRes?.data?.subscriptions ?? []);
            const ms = myJobsRes?.data?.jobs ?? [];
            setMyJobs(ms);
            setMyJobsCount(ms.length);
          }
        }
        const catRes = await apiFetch<any>("/api/categories/type/Job", { auth: false });
        if (mounted) {
          setCategories(catRes?.data?.categories ?? []);
        }
        // Load my interests if authenticated
        const token2 = localStorage.getItem("token");
        if (mounted && token2) {
          try {
            const iRes = await apiFetch<any>("/api/jobs/interests/my");
            const interests = iRes?.data?.interests;
            const cats: Category[] = interests?.categories || [];
            setInterestedCategoryIds((cats || []).map((c: any) => c?._id).filter(Boolean));
            setResumeUrl(String(interests?.resumeUrl || ""));
          } catch {
            // ignore load error
          }
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

  const saveInterests = async () => {
    setInterestsMessage(null);
    setSavingInterests(true);
    try {
      await apiFetch<any>("/api/jobs/interests/my", {
        method: "PUT",
        body: { categoriesIds: interestedCategoryIds, resumeUrl }
      });
      setInterestsMessage("Interests updated.");
      // Close modal on success
      closeInterestsModal();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setInterestsMessage(message || "Failed to update interests.");
    } finally {
      setSavingInterests(false);
    }
  };

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInterestsMessage(null);
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      // Use raw fetch to send multipart with auth header
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/uploads/resume`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }
      const data = await res.json();
      const url = data?.data?.url || data?.url || '';
      if (url) setResumeUrl(url);
      setInterestsMessage(url ? 'Resume uploaded.' : 'Upload succeeded.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setInterestsMessage(message || 'Failed to upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

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
      if (jobKind === 'Private') {
        // Private job search supports location params
        if (searchLocation.city) params.set("city", searchLocation.city);
        if (searchLocation.district) params.set("district", searchLocation.district);
        if (searchLocation.state) params.set("state", searchLocation.state);
        if (searchLocation.country) params.set("country", searchLocation.country);
        if (searchLocation.pincode) params.set("pincode", searchLocation.pincode);
        const res = await apiFetch<any>(`/api/jobs/search?${params.toString()}`);
        setSearchResults(res?.data?.jobs ?? []);
      } else {
        // Government job search: filter by selected government job type
        params.set('jobType', jobKind);
        const res = await apiFetch<any>(`/api/government-jobs/search?${params.toString()}`);
        setSearchResults(res?.data?.governmentJobs ?? []);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Find Candidates: search by selected categories
  const onCandidateSearch = async () => {
    setCandidateMessage(null);
    setCandidateSearching(true);
    try {
      const params = new URLSearchParams();
      if (candidateCategoryIds.length > 0) {
        params.set('categoryIds', candidateCategoryIds.join(','));
      }
      const res = await apiFetch<any>(`/api/jobs/candidates/search?${params.toString()}`);
      setCandidateResults(res?.data?.candidates ?? []);
      if ((res?.data?.candidates ?? []).length === 0) {
        setCandidateMessage('No candidates found for selected categories.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setCandidateMessage(message || 'Failed to search candidates.');
      setCandidateResults([]);
    } finally {
      setCandidateSearching(false);
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
          setLocationError(`Couldn’t reverse geocode device location: ${message}`);
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
            // IP fallback succeeded; treat this as informational, not an error
            setLocationError(null);
          } catch (ipErr) {
            const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
            setLocationError(`Location unavailable and IP lookup failed: ${ipMsg}. Please enter an address manually.`);
          }
        } finally {
          setLocating(false);
        }
      },
      async (err) => {
        // Map common geolocation errors
        const codeMsg =
          err.code === 1
            ? "Location permission denied. Enable it in browser settings and try again."
            : err.code === 2
            ? "Device couldn’t determine a precise location (position unavailable)."
            : err.code === 3
            ? "Location request timed out before getting a fix."
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
          // IP fallback succeeded; clear the error since we have an approximate location
          setLocationError(null);
        } catch (ipErr) {
          const ipMsg = ipErr instanceof Error ? ipErr.message : String(ipErr);
          setLocationError(`${codeMsg} IP lookup failed: ${ipMsg}. Please enter an address manually.`);
        } finally {
          setLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
            // IP fallback succeeded; clear the error since we have an approximate location
            setPostingLocationError(null);
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
    setCompanyLocation({ address: "",country: "", state: "", city: "", district: "", pincode: "" });
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
      address: user?.company?.location?.address?? "",
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

  // Post Job: submit (free for all, no subscription/prices)
  const onPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPostMessage(null);
    if (selectedCategoryIds.length === 0) {
      setError("Please select at least one category.");
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
      const res = await apiFetch<any>("/api/jobs", {
        method: "POST",
        body: {
          categoriesIds: selectedCategoryIds,
          location: finalLocation,
          isCompanyPost: Boolean(postAsCompany),
          companyId: postAsCompany ? (user?.company?._id ?? null) : null,
        },
      });
      const created = res?.data?.job;
      setPostMessage(created ? "Job posted successfully." : "Posted.");
      // update local myJobsCount and list immediately
      setMyJobsCount(prev => prev + 1);
      if (created) {
        setMyJobs(prev => [created, ...prev]);
      }
      // reset form
      setSelectedCategoryIds([]);
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
  const [editLocation, setEditLocation] = useState({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editLocating, setEditLocating] = useState(false);
  const [editLocationError, setEditLocationError] = useState<string | null>(null);
  const [editGeocoding, setEditGeocoding] = useState(false);
  const [editGeocodingError, setEditGeocodingError] = useState<string | null>(null);

  const startEdit = (svc: Job) => {
    setEditingId(svc._id);
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
      const res = await apiFetch<any>(`/api/jobs/${editingId}`, {
        method: "PUT",
        body: {
          location: editLocation,
        },
      });
      const updated: Job | undefined = res?.data?.job;
      if (updated) {
        setMyJobs(prev => prev.map(s => (s._id === editingId ? updated : s)));
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

  const deleteJob = async (id: string) => {
    setError(null);
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete this job?");
    if (!ok) return;
    try {
      await apiFetch(`/api/jobs/${id}`, { method: "DELETE" });
      setMyJobs(prev => prev.filter(s => s._id !== id));
      setMyJobsCount(prev => Math.max(0, prev - 1));
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
      <PageMeta title="Jobs" description="Find and post jobs" />
      <div className="flex items-center justify-between mb-4">
        <PageBreadcrumb pageTitle="Jobs" />
        <Button size="sm" variant="outline" onClick={openInterestsModal}>
          Add Your Interests
        </Button>
      </div>

      {/* Interests Modal */}
      <Modal isOpen={interestsModalOpen} onClose={closeInterestsModal} className="max-w-[700px] p-6 lg:p-10">
        <div className="flex flex-col gap-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Interested Jobs</h4>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Select Categories</label>
            <MultiSelect
              label="Categories"
              options={categories.map(c => ({ text: c.name, value: c._id }))}
              value={interestedCategoryIds}
              onChange={setInterestedCategoryIds}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Resume URL (optional)</label>
            <input
              type="url"
              placeholder="Link to your resume (Google Drive, etc.)"
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
            />
            <div className="mt-2 flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeFileChange}
                className="text-sm"
              />
              {uploadingResume && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Uploading...</span>
              )}
            </div>
          </div>
          {interestsMessage && (
            <span className="text-xs text-gray-600 dark:text-gray-300">{interestsMessage}</span>
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={closeInterestsModal}>Close</Button>
            <Button size="sm" onClick={saveInterests} disabled={savingInterests}>
              {savingInterests ? "Saving..." : "Save Interests"}
            </Button>
          </div>
        </div>
      </Modal>

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
            Find Jobs
          </button>
          <button
            className={`rounded-lg px-4 h-10 text-sm border ${tab === "post" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-700"}`}
            onClick={() => toggleTab("post")}
          >
            Post Job
          </button>
          <button
            className={`rounded-lg px-4 h-10 text-sm border ${tab === "candidates" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-700"}`}
            onClick={() => toggleTab("candidates")}
          >
            Find Candidates
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {tab === "find" && (
          <div className="space-y-6">
            {/* Job Type Selector */}
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Job Type</label>
              <select
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                value={jobKind}
                onChange={(e) => setJobKind(e.target.value as any)}
              >
                <option value="Private">Private</option>
                <option value="Govt Jobs">Govt Jobs</option>
                <option value="PSU Jobs">PSU Jobs</option>
                <option value="Semi Govt Jobs">Semi Govt Jobs</option>
                <option value="MSME Jobs">MSME Jobs</option>
              </select>
            </div>
            {!hasSearchAccess && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Search Jobs Subscription</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">100 Rs per annum, unlimited usage.</p>
                <div className="mt-4">
                  <a href={`${API_BASE}/payment?type=JOB_SEARCH${tokenParam}`} className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                    Subscribe Now
                  </a>
                </div>
              </div>
            )}

            {hasSearchAccess && (
              <div className="space-y-4">
                {/* Interests moved to modal; top-right button always available */}
                <form onSubmit={onSearch} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Search by any keyword: category, location, etc."
                    className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  {jobKind === 'Private' && (
                    <input
                      className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                      placeholder="Full Address"
                      value={searchLocation.address}
                      onChange={(e) => setSearchLocation({ ...searchLocation, address: e.target.value })}
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {jobKind === 'Private' && (
                      <>
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="City" value={searchLocation.city} onChange={(e) => setSearchLocation({ ...searchLocation, city: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="District" value={searchLocation.district} onChange={(e) => setSearchLocation({ ...searchLocation, district: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="State" value={searchLocation.state} onChange={(e) => setSearchLocation({ ...searchLocation, state: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Country" value={searchLocation.country} onChange={(e) => setSearchLocation({ ...searchLocation, country: e.target.value })} />
                        <input className="rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" placeholder="Pincode" value={searchLocation.pincode} onChange={(e) => setSearchLocation({ ...searchLocation, pincode: e.target.value })} />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {jobKind === 'Private' && (
                      <>
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
                      </>
                    )}
                    {locationError && (
                      <span className="text-xs text-red-600">{locationError}</span>
                    )}
                  </div>
                  <button className="rounded-lg border border-gray-200 px-4 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" disabled={searching}>
                    {searching ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobKind === 'Private' && searchResults.map((svc) => (
                    <div key={svc._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categories</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-2">
                        {(svc.categories || []).map((c: any) => c?.name).filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-3">
                        {[svc.location?.district, svc.location?.city, svc.location?.state, svc.location?.country].filter(Boolean).join(", ")}
                        {svc.location?.pincode ? `, ${svc.location.pincode}` : ""}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                          <UserIcon className="size-4" />
                          <span className="text-sm">{svc.user?.name || "—"}</span>
                        </div>
                        <div className="flex items-center">
                          {svc.user?.phone ? (
                            <a href={`tel:${svc.user.phone}`} aria-label={`Call ${svc.user?.name || "provider"}`}>
                              <Button size="sm" variant="primary">
                                Call
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Call
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {jobKind !== 'Private' && searchResults.map((gj) => (
                    <div key={gj._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <div className="font-medium text-gray-800 dark:text-white/90 mb-1">{gj.jobTitle}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{gj.organizationName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Type: {gj.jobType}</div>
                      {gj.lastDateToApply && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">Last Date: {new Date(gj.lastDateToApply).toLocaleDateString()}</div>
                      )}
                      {gj.applyLink && (
                        <a href={gj.applyLink} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">Apply / Details</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "candidates" && (
          <div className="space-y-6">
            {!hasSearchAccess && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Candidate Search Subscription</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">100 Rs per annum, unlimited usage.</p>
                <div className="mt-4">
                  <a href={`${API_BASE}/payment?type=JOB_SEARCH${tokenParam}`} className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                    Subscribe Now
                  </a>
                </div>
              </div>
            )}

            {hasSearchAccess && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Select Categories</label>
                  <MultiSelect
                    label="Categories"
                    options={categories.map(c => ({ text: c.name, value: c._id }))}
                    value={candidateCategoryIds}
                    onChange={setCandidateCategoryIds}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onCandidateSearch} disabled={candidateSearching}>
                    {candidateSearching ? "Searching..." : "Search Candidates"}
                  </Button>
                  {candidateMessage && (
                    <span className="text-xs text-gray-600 dark:text-gray-300">{candidateMessage}</span>
                  )}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
                  {candidateResults.map((c) => (
                    <div key={c._id} className="p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white/90">{c.name || "Unnamed User"}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {(c.interestedJobCategories || []).map(cat => cat.name).join(', ') || 'No interests'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="text-sm text-brand-700 hover:underline">Call</a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-sm text-brand-700 hover:underline">Email</a>
                          )}
                          {c.resumeUrl && (
                            <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">Resume</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {candidateResults.length === 0 && (
                    <div className="p-4 text-sm text-gray-600 dark:text-gray-300">No candidates yet. Try selecting categories and search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "post" && (
          <div className="space-y-6">
            {myJobs.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">Your Jobs</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myJobs.map((job) => (
                    <div key={job._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categories</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-2">
                        {(job.categories || []).map(c => c?.name).filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                      <p className="text-gray-800 dark:text-gray-200 mb-3">
                        {[job.location?.district, job.location?.city, job.location?.state, job.location?.country].filter(Boolean).join(", ")} 
                        {job.location?.pincode ? `, ${job.location.pincode}` : ""}
                      </p>

                      {editingId === job._id ? (
                        <div className="space-y-3">
                          {/* Jobs have no category prices; editing focuses on location only. */}
                          {job.isCompanyPost && (   
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
                          <button className="rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => startEdit(job)}>
                            Edit
                          </button>
                          <button className="rounded-lg border border-red-200 px-3 h-9 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300" onClick={() => deleteJob(job._id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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
               
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* No price inputs; job posting is free for all */}
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
                  {posting ? "Posting..." : "Post Job"}
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