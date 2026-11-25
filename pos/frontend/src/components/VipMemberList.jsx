import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api, money } from "../lib";
import { Icons } from "./Icons";
import logo from "../assets/imgs/logo.jpg";

export default function VipMemberList() {
  const [activeStaffTab, setActiveStaffTab] = useState("directory"); // 'directory' | 'prive' | 'rewards' | 'analytics'
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all"); // 'all' | 'vip' | 'gold' | 'silver' | 'bronze'
  const [sortBy, setSortBy] = useState("points"); // 'points' | 'total_spent' | 'visits_count' | 'name' | 'created_at'
  const [sortDir, setSortDir] = useState("desc");

  // Rewards state
  const [rewardsList, setRewardsList] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [newRewardForm, setNewRewardForm] = useState({
    name: "",
    description: "",
    reward_type: "discount",
    points_required: 200,
    reward_value: 2.00,
  });

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Modals & Member Details
  const [activeMemberDetails, setActiveMemberDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    notes: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Points Adjustment State in Drawer
  const [adjustPointsVal, setAdjustPointsVal] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Subscribe loading
  const [subscribingId, setSubscribingId] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("q", searchTerm.trim());
      if (selectedTier !== "all") params.append("tier", selectedTier);
      params.append("sort", sortBy);
      params.append("dir", sortDir);

      const res = await api(`/staff/members?${params.toString()}`);
      if (res) {
        setMembers(res.members || res.customers || []);
        setStats(res.stats || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load VIP & Loyalty Members.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedTier, sortBy, sortDir]);

  const fetchRewards = useCallback(async () => {
    setRewardsLoading(true);
    try {
      const res = await api("/loyalty/rewards");
      if (res) setRewardsList(res);
    } catch (err) {
      console.warn("Failed to load rewards catalog:", err);
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api("/loyalty/statistics");
      if (res) setAnalyticsData(res);
    } catch (err) {
      console.warn("Failed to load loyalty statistics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (activeStaffTab === "rewards") fetchRewards();
    if (activeStaffTab === "analytics") fetchAnalytics();
  }, [activeStaffTab, fetchRewards, fetchAnalytics]);

  // Open Detailed Member Drawer
  const openMemberDetails = async (memberId) => {
    setDetailsLoading(true);
    setAdjustPointsVal("");
    setAdjustReason("");
    try {
      const data = await api(`/staff/members/${memberId}`);
      setActiveMemberDetails(data);
    } catch (err) {
      showToast(err.message || "Failed to fetch member details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError("Name and phone number are required.");
      return;
    }

    setAddLoading(true);
    setAddError("");
    try {
      const res = await api("/customers", {
        method: "POST",
        body: addForm,
      });
      showToast(res.message || `Member ${res.customer?.full_name || res.member?.name} successfully enrolled!`);
      setShowAddModal(false);
      setAddForm({ name: "", phone: "", email: "", date_of_birth: "", notes: "" });
      fetchMembers();
      if (res.customer || res.member) {
        openMemberDetails((res.customer || res.member).id);
      }
    } catch (err) {
      setAddError(err.message || "Failed to enrol new member.");
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Manual Points Adjustment
  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!activeMemberDetails?.id) return;
    const pts = parseFloat(adjustPointsVal);
    if (isNaN(pts) || pts === 0) {
      alert("Please enter a valid points adjustment amount (positive or negative).");
      return;
    }
    if (!adjustReason.trim()) {
      alert("Please provide an audit reason for manual points adjustment.");
      return;
    }

    setAdjustLoading(true);
    try {
      const res = await api("/loyalty/adjust-points", {
        method: "POST",
        body: {
          customer_id: activeMemberDetails.id,
          points: pts,
          reason: adjustReason.trim(),
        },
      });
      showToast(res.message || "Points adjusted successfully.");
      setAdjustPointsVal("");
      setAdjustReason("");
      openMemberDetails(activeMemberDetails.id);
      fetchMembers();
    } catch (err) {
      alert(err.message || "Failed to adjust points.");
    } finally {
      setAdjustLoading(false);
    }
  };

  // Handle Subscribe Member to Maison Privé
  const handleSubscribePrive = async (customerId, customerName) => {
    if (!window.confirm(`Enroll ${customerName} into Maison Privé Annual Subscription for $49.99/year?`)) {
      return;
    }
    setSubscribingId(customerId);
    try {
      const res = await api("/memberships/subscribe", {
        method: "POST",
        body: { customer_id: customerId, amount_paid: 49.99 },
      });
      showToast(res.message || "Maison Privé subscription activated!");
      fetchMembers();
      if (activeMemberDetails?.id === customerId) {
        openMemberDetails(customerId);
      }
    } catch (err) {
      alert(err.message || "Failed to activate Maison Privé subscription.");
    } finally {
      setSubscribingId(null);
    }
  };

  // Handle Create Reward
  const handleCreateReward = async (e) => {
    e.preventDefault();
    if (!newRewardForm.name.trim() || !newRewardForm.points_required) {
      alert("Reward name and points required are needed.");
      return;
    }
    try {
      await api("/loyalty/rewards", {
        method: "POST",
        body: newRewardForm,
      });
      showToast("Reward created successfully!");
      setShowAddRewardModal(false);
      setNewRewardForm({ name: "", description: "", reward_type: "discount", points_required: 200, reward_value: 2.00 });
      fetchRewards();
    } catch (err) {
      alert(err.message || "Failed to create reward.");
    }
  };

  // Tier styling helpers
  const getTierBadge = (tierCode) => {
    const baseBadge =
      "inline-flex items-center justify-center min-w-[112px] px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap";

    switch (String(tierCode).toLowerCase()) {
      case "vip":
        return {
          label: "VIP Elite",
          badge: `${baseBadge} bg-[#332442] text-[#E8D5B5] border-[#6B527F]`,
          perk: "10% Off + 2x Pts",
          color: "espresso",
        };

      case "gold":
        return {
          label: "Gold Tier",
          badge: `${baseBadge} bg-[#E8D09B] text-[#654817] border-[#C9A65D]`,
          perk: "5% Off + 1.5x Pts",
          color: "gold",
        };

      case "silver":
        return {
          label: "Silver Tier",
          badge: `${baseBadge} bg-[#C9CBCD] text-[#3F454A] border-[#A5AAAE]`,
          perk: "3% Off + 1.25x Pts",
          color: "silver",
        };

      default:
        return {
          label: "Bronze Tier",
          badge: `${baseBadge} bg-[#D9B99A] text-[#68452D] border-[#B88E68]`,
          perk: "1x Pts per $1",
          color: "bronze",
        };
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-warm-900 text-white px-4 py-3 shadow-2xl border border-warm-700 animate-in slide-in-from-top-4 duration-200">
          <Icons.Check />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-950 text-purple-200 border border-purple-800 shadow-soft">
            <span className="text-2xl">💎</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-warm-900 sm:text-3xl">
                Loyalty &amp; Membership Hub
              </h1>
              <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-900 border border-purple-200">
                Staff Operations
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-warm-600">
              Manage lifetime spending tiers (Bronze, Silver, Gold, VIP), Maison Privé annual subscriptions, points ledger &amp; rewards catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchMembers();
              if (activeStaffTab === "rewards") fetchRewards();
              if (activeStaffTab === "analytics") fetchAnalytics();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-warm-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-warm-700 shadow-xs hover:bg-warm-50 transition active:scale-95"
            title="Refresh Directory"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
            }}
            className="flex items-center gap-2 rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-brand active:scale-95 transition"
          >
            <Icons.Star />
            <span>+ Enrol New Member</span>
          </button>
        </div>
      </div>

      {/* Main Staff Portal Tabs */}
      <div className="flex border-b border-warm-200/80 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveStaffTab("directory")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeStaffTab === "directory"
              ? "bg-warm-900 text-white shadow-xs"
              : "bg-warm-100 text-warm-700 hover:bg-warm-200"
          }`}
        >
          <span>👥</span>
          <span>Guest Directory ({stats?.total_members ?? members.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStaffTab("prive")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeStaffTab === "prive"
              ? "bg-purple-900 text-white shadow-xs"
              : "bg-purple-100 text-purple-900 hover:bg-purple-200"
          }`}
        >
          <span>👑</span>
          <span>Maison Privé Subscriptions ({stats?.prive_count ?? 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStaffTab("rewards")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeStaffTab === "rewards"
              ? "bg-warm-900 text-white shadow-xs"
              : "bg-warm-100 text-warm-700 hover:bg-warm-200"
          }`}
        >
          <span>🎁</span>
          <span>Rewards Catalog</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStaffTab("analytics")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeStaffTab === "analytics"
              ? "bg-warm-900 text-white shadow-xs"
              : "bg-warm-100 text-warm-700 hover:bg-warm-200"
          }`}
        >
          <span>📊</span>
          <span>Analytics &amp; Rules</span>
        </button>
      </div>

      {/* TAB 1: GUEST DIRECTORY */}
      {activeStaffTab === "directory" && (
        <div className="space-y-6">
          {/* Metric Cards Ribbon */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-3xl border border-warm-200/90 bg-white p-4 sm:p-5 shadow-xs">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-warm-500 font-mono">
                  Total Enrolled Members
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-warm-900">
                    {stats.total_members}
                  </span>
                  <span className="text-xs text-warm-500">guests</span>
                </div>
                <p className="mt-1 text-[11px] text-warm-500">
                  {stats.gold_count + stats.silver_count + stats.bronze_count} standard spending tiers
                </p>
              </div>

              <div className="rounded-3xl border border-purple-300/80 bg-gradient-to-br from-purple-50/70 to-slate-50 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-purple-900 font-mono">
                    💎 VIP Patrons
                  </p>
                  <span className="rounded-md bg-purple-200 text-purple-900 text-[10px] font-bold px-1.5 py-0.5">
                    $600+ Spend
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-purple-950">
                    {stats.vip_count}
                  </span>
                  <span className="text-xs text-purple-800 font-medium">elite clients</span>
                </div>
                <p className="mt-1 text-[11px] text-purple-700">
                  10% discount &amp; 2x points
                </p>
              </div>

              <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-amber-900 font-mono">
                    Active Points Pool
                  </p>
                  <span className="text-amber-600">⭐</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-amber-950">
                    {stats.total_points.toLocaleString()}
                  </span>
                  <span className="text-xs text-amber-800 font-mono">pts</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-700">
                  ≈ {money(stats.total_points / 100)} liability (100 pts = $1)
                </p>
              </div>

              <div className="rounded-3xl border border-warm-200/90 bg-white p-4 sm:p-5 shadow-xs">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-warm-500 font-mono">
                  Member Lifetime Spend
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-warm-900">
                    {money(stats.total_spent)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-warm-500">
                  Cumulative eligible dining spend
                </p>
              </div>
            </div>
          )}

          {/* Toolbar: Search, Tier Filters & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-warm-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
            {/* Tier Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 thin-scrollbar">
              {[
                { id: "all", label: `All (${stats?.total_members ?? members.length})` },
                { id: "vip", label: `💎 VIP (${stats?.vip_count ?? 0})` },
                { id: "gold", label: `🥇 Gold (${stats?.gold_count ?? 0})` },
                { id: "silver", label: `🥈 Silver (${stats?.silver_count ?? 0})` },
                { id: "bronze", label: `🥉 Bronze (${stats?.bronze_count ?? 0})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    selectedTier === t.id
                      ? "bg-warm-900 text-white shadow-xs"
                      : "bg-warm-100/80 text-warm-700 hover:bg-warm-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input & Sort Selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Search name, phone, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-warm-200/90 bg-warm-50/60 pl-3 pr-8 py-2 text-xs sm:text-sm text-warm-900 outline-none focus:border-brand focus:bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-warm-200/90 bg-white px-3 py-2 text-xs sm:text-sm text-warm-700 outline-none focus:border-brand"
              >
                <option value="points">Sort: Points</option>
                <option value="total_spent">Sort: Spending</option>
                <option value="name">Sort: Name</option>
                <option value="created_at">Sort: Joined</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-hidden rounded-3xl border border-warm-200/90 bg-white shadow-xs">
            {loading ? (
              <div className="py-16 text-center text-warm-500 font-mono text-xs">
                Loading members directory...
              </div>
            ) : error ? (
              <div className="py-16 text-center text-rose-600">
                <p className="font-semibold text-sm">{error}</p>
                <button
                  onClick={() => fetchMembers()}
                  className="mt-3 rounded-xl bg-warm-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : members.length === 0 ? (
              <div className="py-16 text-center text-warm-500">
                <h3 className="font-display text-base font-bold text-warm-900">No Members Found</h3>
                <p className="mt-1 text-xs text-warm-500">Try adjusting your search criteria or tier filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-warm-200/90 bg-warm-50/70 text-[11px] font-semibold uppercase tracking-wider text-warm-600 font-mono">
                      <th className="py-3.5 pl-6 pr-4">Member Info</th>
                      <th className="px-4 py-3.5">Tier &amp; Privilege</th>
                      <th className="px-4 py-3.5">Plan</th>
                      <th className="px-4 py-3.5 text-right">Points Balance</th>
                      <th className="px-4 py-3.5 text-right">Lifetime Spend</th>
                      <th className="px-4 py-3.5">Progress</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {members.map((m) => {
                      const tierInfo = getTierBadge(m.tier_code);
                      const isPrive = m.membership?.is_prive;
                      return (
                        <tr
                          key={m.id}
                          onClick={() => openMemberDetails(m.id)}
                          className="group cursor-pointer hover:bg-warm-50/70 transition"
                        >
                          <td className="py-4 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display font-bold text-sm ${
                                  m.tier_code === "vip"
                                    ? "bg-purple-950 text-purple-200 shadow-xs"
                                    : m.tier_code === "gold"
                                      ? "bg-amber-100 text-amber-900"
                                      : m.tier_code === "silver"
                                        ? "bg-slate-200 text-slate-800"
                                        : "bg-stone-200 text-stone-800"
                                }`}
                              >
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-display font-bold text-warm-900 group-hover:text-brand transition flex items-center gap-1.5">
                                  <span>{m.name}</span>
                                  {m.tier_code === "vip" && <span className="text-xs">💎</span>}
                                </div>
                                <div className="font-mono text-[11px] text-warm-500">
                                  {m.phone}
                                  {m.date_of_birth && (
                                    <span className="ml-2 text-warm-400">🎂 {m.date_of_birth}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${tierInfo.badge}`}>
                              {tierInfo.label}
                            </span>
                            <div className="mt-1 text-[11px] font-medium text-warm-500">
                              {tierInfo.perk}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {isPrive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-900 text-purple-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                👑 Maison Privé
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-warm-100 text-warm-600 px-2.5 py-0.5 text-[10px] font-medium">
                                Standard
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200/90 rounded-xl px-2.5 py-1">
                              <Icons.Star />
                              <span className="text-sm">{(m.points ?? 0).toLocaleString()} pts</span>
                            </div>
                            <div className="mt-1 text-[10px] font-mono text-warm-400">
                              ≈ {money((m.points ?? 0) / 100)}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-warm-900 text-sm">
                              {money(m.total_spent)}
                            </div>
                            <div className="text-[10px] text-warm-400 font-mono">
                              cumulative
                            </div>
                          </td>

                          <td className="px-4 py-4 min-w-[130px]">
                            {m.tier_info ? (
                              <div>
                                <div className="flex justify-between text-[10px] font-mono text-warm-500 mb-1">
                                  <span>{m.tier_info.current_tier}</span>
                                  <span>{m.tier_info.progress_percent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-warm-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-brand rounded-full transition-all"
                                    style={{ width: `${Math.max(5, m.tier_info.progress_percent)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-warm-400 font-mono">-</span>
                            )}
                          </td>

                          <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMemberDetails(m.id);
                              }}
                              className="rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-700 shadow-2xs hover:bg-warm-50 hover:text-warm-900"
                            >
                              Manage →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MAISON PRIVÉ ANNUAL MEMBERSHIP */}
      {activeStaffTab === "prive" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-purple-900 text-white p-6 shadow-xl border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-3xl">👑</span>
                <h3 className="font-display text-2xl font-bold tracking-tight">Maison Privé Annual Plan ($49.99)</h3>
              </div>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
                Paid annual subscription providing priority reservations, welcome drinks, birthday desserts, and exclusive seasonal tastings.
                It is fully separated from and does not replace spending tiers (Bronze, Silver, Gold, VIP).
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/15 text-center min-w-[160px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-purple-300">Active Privé Patrons</span>
              <p className="text-3xl font-black text-white mt-1">{members.filter(m => m.membership?.is_prive).length}</p>
              <span className="text-[10px] text-emerald-300 font-mono">Annual subscribers</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-warm-200 bg-white shadow-xs">
            <div className="p-4 border-b border-warm-100 flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-warm-900">Patron Membership Status</h4>
              <span className="text-xs text-warm-500 font-mono">12-Month Subscriptions</span>
            </div>
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-warm-200/90 bg-warm-50/70 text-[11px] font-semibold uppercase tracking-wider text-warm-600 font-mono">
                  <th className="py-3.5 pl-6 pr-4">Patron Name</th>
                  <th className="px-4 py-3.5">Spending Tier</th>
                  <th className="px-4 py-3.5">Maison Privé Status</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Subscription Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {members.map((m) => {
                  const isPrive = m.membership?.is_prive;
                  return (
                    <tr key={m.id} className="hover:bg-warm-50/70">
                      <td className="py-4 pl-6 pr-4">
                        <div className="font-bold text-warm-900">{m.name}</div>
                        <div className="text-[11px] font-mono text-warm-500">{m.phone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold capitalize">{m.tier} Tier</span>
                      </td>
                      <td className="px-4 py-4">
                        {isPrive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                            ✓ Active Privé Member
                          </span>
                        ) : (
                          <span className="text-warm-500">Standard Dining Account</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        {isPrive && m.membership?.end_date ? (
                          <span className="text-warm-900 font-bold">{m.membership.end_date}</span>
                        ) : (
                          <span className="text-warm-400">None</span>
                        )}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <button
                          type="button"
                          disabled={subscribingId === m.id}
                          onClick={() => handleSubscribePrive(m.id, m.name)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 ${
                            isPrive
                              ? "bg-purple-100 text-purple-900 hover:bg-purple-200"
                              : "bg-purple-900 text-white hover:bg-purple-800"
                          }`}
                        >
                          {subscribingId === m.id ? "Activating..." : isPrive ? "Renew +12 Mo ($49.99)" : "Subscribe ($49.99)"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REWARDS CATALOG */}
      {activeStaffTab === "rewards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-warm-900">Rewards Catalog Management</h3>
              <p className="text-xs text-warm-500">Configure dining discount vouchers, complimentary items &amp; points requirements</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRewardModal(true)}
              className="rounded-xl bg-warm-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand active:scale-95 transition"
            >
              + Create New Reward
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-warm-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-warm-200/90 bg-warm-50/70 text-[11px] font-semibold uppercase tracking-wider text-warm-600 font-mono">
                  <th className="py-3.5 pl-6 pr-4">Reward Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-right">Points Required</th>
                  <th className="px-4 py-3.5 text-right">Dollar Value</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {rewardsList.map((rw) => (
                  <tr key={rw.id} className="hover:bg-warm-50/70">
                    <td className="py-4 pl-6 pr-4">
                      <div className="font-bold text-warm-900">{rw.name}</div>
                      <div className="text-[11px] text-warm-500">{rw.description}</div>
                    </td>
                    <td className="px-4 py-4 uppercase font-mono text-[11px] text-warm-600">
                      {rw.reward_type}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-amber-900">
                      {rw.points_required} pts
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-warm-900">
                      {money(rw.reward_value)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOYALTY ANALYTICS & RULES */}
      {activeStaffTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-mono text-warm-500 uppercase">Total Members</span>
              <p className="text-3xl font-extrabold text-warm-900 mt-2">{analyticsData?.total_members || members.length}</p>
              <span className="text-[11px] text-warm-400">Enrolled patrons</span>
            </div>
            <div className="rounded-3xl border border-purple-200 bg-purple-50/60 p-5 shadow-xs">
              <span className="text-[11px] font-mono text-purple-900 uppercase">Paid Maison Privé</span>
              <p className="text-3xl font-extrabold text-purple-950 mt-2">{analyticsData?.prive_members || members.filter(m => m.membership?.is_prive).length}</p>
              <span className="text-[11px] text-purple-700">$49.99 annual subscriptions</span>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
              <span className="text-[11px] font-mono text-amber-900 uppercase">Points Issued</span>
              <p className="text-3xl font-extrabold text-amber-950 mt-2">{(analyticsData?.points_issued || stats?.total_points || 0).toLocaleString()}</p>
              <span className="text-[11px] text-amber-700">All-time awarded points</span>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
              <span className="text-[11px] font-mono text-emerald-900 uppercase">Points Liability</span>
              <p className="text-3xl font-extrabold text-emerald-950 mt-2">{money(analyticsData?.points_liability_usd || (stats?.total_points || 0) / 100)}</p>
              <span className="text-[11px] text-emerald-700">100 points = $1.00 USD</span>
            </div>
          </div>

          {/* Tier Specification Reference Card */}
          <div className="rounded-3xl border border-warm-200 bg-white p-6 shadow-xs space-y-4">
            <h4 className="font-display text-base font-bold text-warm-900">Spending Tier Progression &amp; Multipliers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-bold text-stone-800 text-sm">🥉 Bronze</span>
                <p className="text-stone-600">$0 – $199.99 Spend</p>
                <p className="font-bold text-stone-900">0% Discount · 1x Multiplier</p>
                <p className="text-[11px] text-stone-500">Birthday: Complimentary dessert</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 text-sm">🥈 Silver</span>
                <p className="text-slate-600">$200 – $399.99 Spend</p>
                <p className="font-bold text-slate-900">3% Discount · 1.25x Multiplier</p>
                <p className="text-[11px] text-slate-500">Birthday: Dessert + 100 bonus pts</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                <span className="font-bold text-amber-800 text-sm">⭐ Gold</span>
                <p className="text-amber-600">$400 – $599.99 Spend</p>
                <p className="font-bold text-amber-900">5% Discount · 1.5x Multiplier</p>
                <p className="text-[11px] text-amber-500">Birthday: Dessert + signature drink</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1.5">
                <span className="font-bold text-purple-900 text-sm">💎 VIP</span>
                <p className="text-purple-600">$600+ Lifetime Spend</p>
                <p className="font-bold text-purple-950">10% Discount · 2.0x Multiplier</p>
                <p className="text-[11px] text-purple-500">Birthday: Premium dessert + drink</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs text-warm-700 space-y-1 leading-relaxed">
              <p><strong>Rolling 12-Month Inactivity Policy:</strong> Points expire after 12 months without an eligible points-earning dining visit. Any qualifying purchase resets the 12-month clock.</p>
              <p><strong>Separation of Concerns:</strong> Lifetime dining spending automatically elevates customer tiers. Maison Privé ($49.99/year) is a separate luxury concierge subscription that does not replace spending tiers.</p>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Drawer */}
      {activeMemberDetails && (
        <div className="fixed inset-0 z-50 flex justify-end bg-warm-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-warm-100 flex items-center justify-between bg-warm-50/60 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <h3 className="font-display text-base font-bold text-warm-900">Customer Profile &amp; Loyalty</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMemberDetails(null)}
                className="rounded-full p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Luxury Digital Membership Card */}
              <div
                className={`relative isolate overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-xl border ${
                  (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "vip"
                    ? "bg-[#332442] border-[#A18A65]"
                    : (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "gold"
                      ? "bg-[#80602F] border-[#D4B46E]"
                      : (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "silver"
                        ? "bg-[#596168] border-[#C9CBCD]"
                        : "bg-[#684B3A] border-[#B88E68]"
                }`}
              >
                {/* Decorative borders */}
                <div className="pointer-events-none absolute inset-[7px] rounded-xl border border-[#E5D4B4]/30" />
                <div className="pointer-events-none absolute inset-[12px] rounded-lg border border-[#E5D4B4]/10" />

                {/* Background monogram */}
                <div className="pointer-events-none absolute -right-5 -bottom-14 select-none">
                  <span className="font-serif text-[210px] leading-none text-[#E5D4B4]/[0.07]">
                    M
                  </span>
                </div>

                {/* Decorative accents */}
                <div className="pointer-events-none absolute top-4 left-4 font-serif text-lg text-[#E5D4B4]/70">
                  ✧
                </div>
                <div className="pointer-events-none absolute top-4 right-4 font-serif text-lg text-[#E5D4B4]/70">
                  ✧
                </div>

                <div className="relative z-10 space-y-6">
                  {/* Brand and membership tier */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={logo}
                        alt="MOLS MAISON"
                        className="h-10 w-10 rounded-full bg-white object-contain p-1 shadow-xs"
                      />

                      <div>
                        <h3 className="font-logo text-lg tracking-[0.16em] text-white">
                          MOLS MAISON
                        </h3>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.25em] text-[#E5D4B4]/75">
                          Private Membership
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {activeMemberDetails.membership?.is_prive && (
                        <span className="rounded-sm border border-purple-400/50 bg-purple-900/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-purple-200 backdrop-blur-xs">
                          👑 Privé
                        </span>
                      )}
                      <span className="rounded-sm border border-[#E5D4B4]/50 bg-black/20 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F0DDBB] backdrop-blur-xs">
                        {(activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "vip"
                          ? "VIP Elite"
                          : `${activeMemberDetails.tier || activeMemberDetails.loyalty_tier || "Bronze"} Member`}
                      </span>
                    </div>
                  </div>

                  {/* Member information */}
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] uppercase tracking-[0.23em] text-[#E5D4B4]/70 font-mono">
                        Cardholder
                      </p>

                      <h2 className="break-words font-serif text-2xl sm:text-3xl font-medium tracking-wide text-[#F5EBDD]">
                        {activeMemberDetails.name || activeMemberDetails.full_name}
                      </h2>

                      <p className="mt-1.5 text-[12px] font-mono tracking-wider text-white/70">
                        {activeMemberDetails.phone}
                      </p>

                      {activeMemberDetails.date_of_birth && (
                        <p className="mt-0.5 text-[11px] font-mono text-[#E5D4B4]/80">
                          🎂 Born: {activeMemberDetails.date_of_birth}
                        </p>
                      )}

                      {activeMemberDetails.email && (
                        <p className="mt-0.5 break-all text-[11px] text-white/60">
                          {activeMemberDetails.email}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="mb-1 text-[9px] uppercase tracking-[0.23em] text-[#E5D4B4]/70 font-mono">
                        Available Points
                      </p>

                      <p className="font-serif text-3xl sm:text-4xl font-medium tabular-nums text-[#F0D9A5]">
                        {(activeMemberDetails.points || activeMemberDetails.points_balance || 0).toLocaleString()}
                      </p>

                      <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/65 font-mono">
                        Reward Points
                      </p>

                      <p className="mt-1 text-[10px] font-mono text-[#E5D4B4]/80">
                        ≈ {money((activeMemberDetails.points || activeMemberDetails.points_balance || 0) / 100)} value
                      </p>
                    </div>
                  </div>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#E5D4B4]/30" />
                    <span className="font-serif text-sm text-[#E5D4B4]/80">
                      ✧
                    </span>
                    <div className="h-px flex-1 bg-[#E5D4B4]/30" />
                  </div>

                  {/* Membership privileges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#E5D4B4]/70 font-mono">
                        Member Privilege
                      </p>
                      <p className="mt-1 font-serif text-sm sm:text-base text-[#F5EBDD]">
                        {activeMemberDetails.discount_percent > 0
                          ? `${activeMemberDetails.discount_percent}% Dining Privilege`
                          : ((activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "silver"
                            ? "3% Dining Privilege"
                            : (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "gold"
                              ? "5% Dining Privilege"
                              : (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase() === "vip"
                                ? "10% Dining Privilege"
                                : "1x Points per $1")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#E5D4B4]/70 font-mono">
                        Lifetime Spend
                      </p>
                      <p className="mt-1 font-serif text-sm sm:text-base text-[#F5EBDD]">
                        {money(activeMemberDetails.total_spent || activeMemberDetails.lifetime_spending || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between border-t border-[#E5D4B4]/20 pt-2.5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-mono">
                      MOLS MAISON · Members Club
                    </p>

                    <p className="font-mono text-[10px] tracking-widest text-[#E5D4B4]/80">
                      MM · {String(activeMemberDetails.id).padStart(5, "0")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Maison Privé Status */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                    <span>👑</span>
                    <span>Maison Privé Annual Plan</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeMemberDetails.membership?.is_prive
                      ? "bg-purple-900 text-purple-100"
                      : "bg-purple-200/80 text-purple-900"
                  }`}>
                    {activeMemberDetails.membership?.is_prive ? "Active Privé Member" : "Standard Account"}
                  </span>
                </div>
                {activeMemberDetails.membership?.is_prive ? (
                  <p className="text-[11px] text-purple-800 font-mono">
                    Valid until {activeMemberDetails.membership.end_date} ({activeMemberDetails.membership.days_remaining} days remaining)
                  </p>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-purple-800">$49.99 / 12 Months</span>
                    <button
                      type="button"
                      disabled={subscribingId === activeMemberDetails.id}
                      onClick={() => handleSubscribePrive(activeMemberDetails.id, activeMemberDetails.name)}
                      className="rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-purple-800"
                    >
                      {subscribingId === activeMemberDetails.id ? "Subscribing..." : "Enroll Customer ($49.99)"}
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Points Adjustment Form */}
              <form onSubmit={handleAdjustPoints} className="rounded-2xl border border-warm-200 bg-warm-50/70 p-4 space-y-3">
                <h5 className="font-display text-xs font-bold text-warm-900 uppercase tracking-wide">
                  Manual Points Adjustment (Manager Audit)
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-warm-600 block mb-1">Points (+ or -)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100 or -50"
                      value={adjustPointsVal}
                      onChange={(e) => setAdjustPointsVal(e.target.value)}
                      className="w-full rounded-xl border border-warm-300 bg-white p-2 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-warm-600 block mb-1">Audit Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP goodwill credit"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full rounded-xl border border-warm-300 bg-white p-2 text-xs outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="w-full rounded-xl bg-warm-900 text-white py-2 text-xs font-bold hover:bg-brand transition"
                >
                  {adjustLoading ? "Applying..." : "Submit Points Adjustment"}
                </button>
              </form>

              {/* Recent Orders */}
              {activeMemberDetails.recent_orders && activeMemberDetails.recent_orders.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-display text-xs font-bold text-warm-900 uppercase">Recent Dining Visits</h5>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {activeMemberDetails.recent_orders.map((ord) => (
                      <div key={ord.id} className="rounded-xl border border-warm-200 bg-white p-2.5 text-xs flex justify-between">
                        <div>
                          <p className="font-bold text-warm-900">Order #{ord.id} · Table #{ord.table || "Walk-in"}</p>
                          <p className="text-[10px] text-warm-500 font-mono">{new Date(ord.paid_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-warm-900">{money(ord.total)}</p>
                          <p className="font-mono text-[10px] text-amber-800">+{ord.points_earned || 0} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-display text-base font-bold text-warm-900">Enrol New Patron</h3>
              <button onClick={() => setShowAddModal(false)} className="text-warm-400 hover:text-warm-700 font-bold">✕</button>
            </div>
            {addError && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl">{addError}</p>}
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Claire Moreau"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">Phone Number (ID) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08123456789"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs font-mono outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="claire@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={addForm.date_of_birth}
                    onChange={(e) => setAddForm({ ...addForm, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 p-2.5 text-xs outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs font-semibold text-warm-700 hover:bg-warm-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 rounded-xl bg-warm-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand"
                >
                  {addLoading ? "Enrolling..." : "Enrol Patron ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Reward Modal */}
      {showAddRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-display text-base font-bold text-warm-900">Create Catalog Reward</h3>
              <button onClick={() => setShowAddRewardModal(false)} className="text-warm-400 hover:text-warm-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateReward} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">Reward Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. $15 Dining Discount"
                  value={newRewardForm.name}
                  onChange={(e) => setNewRewardForm({ ...newRewardForm, name: e.target.value })}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Points Required *</label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={newRewardForm.points_required}
                    onChange={(e) => setNewRewardForm({ ...newRewardForm, points_required: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-warm-300 p-2.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Dollar Value ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRewardForm.reward_value}
                    onChange={(e) => setNewRewardForm({ ...newRewardForm, reward_value: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-warm-300 p-2.5 text-xs font-mono outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">Type</label>
                <select
                  value={newRewardForm.reward_type}
                  onChange={(e) => setNewRewardForm({ ...newRewardForm, reward_type: e.target.value })}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs outline-none"
                >
                  <option value="discount">Dining Discount</option>
                  <option value="free_item">Complimentary Food/Drink Item</option>
                  <option value="bonus_points">Bonus Points Voucher</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRewardModal(false)}
                  className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs font-semibold text-warm-700 hover:bg-warm-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-warm-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand"
                >
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
