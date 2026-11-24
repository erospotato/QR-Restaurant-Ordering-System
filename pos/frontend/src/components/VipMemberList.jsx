import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api, money } from "../lib";
import { Icons } from "./Icons";
import logo from "../assets/imgs/logo.jpg";

export default function VipMemberList() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all"); // 'all' | 'vip' | 'gold' | 'silver' | 'bronze'
  const [sortBy, setSortBy] = useState("points"); // 'points' | 'total_spent' | 'visits_count' | 'name' | 'created_at'
  const [sortDir, setSortDir] = useState("desc");

  // Modals
  const [activeMemberDetails, setActiveMemberDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

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
        setMembers(res.members || []);
        setStats(res.stats || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load VIP & Loyalty Members.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedTier, sortBy, sortDir]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Open Detailed Member Drawer
  const openMemberDetails = async (memberId) => {
    setDetailsLoading(true);
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
      const res = await api("/staff/members", {
        method: "POST",
        body: addForm,
      });
      showToast(
        res.message || `Member ${res.member?.name} successfully enrolled!`,
      );
      setShowAddModal(false);
      setAddForm({ name: "", phone: "", email: "", notes: "" });
      fetchMembers();
      if (res.member) {
        openMemberDetails(res.member.id);
      }
    } catch (err) {
      setAddError(err.message || "Failed to enrol new member.");
    } finally {
      setAddLoading(false);
    }
  };

  // Tier styling helpers
  const getTierBadge = (tierCode) => {
    const baseBadge =
      "inline-flex items-center justify-center min-w-[112px] px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap";

    switch (tierCode) {
      case "vip":
        return {
          label: "VIP Elite",
          badge: `${baseBadge} bg-[#332442] text-[#E8D5B5] border-[#6B527F]`,
          perk: "15% Off + 2x Pts",
          color: "espresso",
        };

      case "gold":
        return {
          label: "Gold Tier",
          badge: `${baseBadge} bg-[#E8D09B] text-[#654817] border-[#C9A65D]`,
          perk: "10% Off + 1.5x Pts",
          color: "gold",
        };

      case "silver":
        return {
          label: "Silver Tier",
          badge: `${baseBadge} bg-[#C9CBCD] text-[#3F454A] border-[#A5AAAE]`,
          perk: "5% Off + 1.2x Pts",
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
                VIP Customers &amp; Loyalty
              </h1>
              <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-900 border border-purple-200">
                Staff Directory
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-warm-600">
              Browse guest tiers, rewards points, total dining spend, and dining
              activity across MOLS MAISON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchMembers()}
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

      {/* Metric Cards Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-warm-200/90 bg-white p-4 sm:p-5 shadow-xs">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-warm-500 font-mono">
              Total Members
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-warm-900">
                {stats.total_members}
              </span>
              <span className="text-xs text-warm-500">guests</span>
            </div>
            <p className="mt-1 text-[11px] text-warm-500">
              {stats.gold_count + stats.silver_count + stats.bronze_count}{" "}
              standard tiers
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
              <span className="text-xs text-purple-800 font-medium">
                elite clients
              </span>
            </div>
            <p className="mt-1 text-[11px] text-purple-700">
              Enjoy 15% discount &amp; 2x points
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
              ≈ {money(stats.total_points * 0.05)} reward redemption value
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
              Generated by loyalty members
            </p>
          </div>
        </div>
      )}

      {/* Toolbar: Search, Tier Filters & Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-warm-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
        {/* Tier Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 thin-scrollbar">
          {[
            {
              id: "all",
              label: `All Members (${stats?.total_members ?? members.length})`,
            },
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

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-warm-300 bg-warm-50/70 pl-3 pr-8 py-1.5 text-xs sm:text-sm text-warm-900 outline-none focus:border-brand focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split("-");
              setSortBy(sb);
              setSortDir(sd);
            }}
            className="rounded-xl border border-warm-300 bg-white px-3 py-1.5 text-xs font-semibold text-warm-700 outline-none focus:border-brand"
          >
            <option value="points-desc">⭐ Highest Points</option>
            <option value="total_spent-desc">💰 Highest Spend</option>
            <option value="visits_count-desc">🍽 Most Visits</option>
            <option value="name-asc">🔤 Name (A-Z)</option>
            <option value="created_at-desc">🕒 Recently Joined</option>
          </select>
        </div>
      </div>

      {/* Members Directory Table */}
      <div className="overflow-hidden rounded-3xl border border-warm-200/90 bg-white shadow-card">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="mt-3 text-xs font-mono text-warm-500">
              Loading VIP &amp; Loyalty patrons...
            </p>
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-warm-100 text-warm-400 mb-3">
              <Icons.Star />
            </div>
            <h3 className="font-display text-base font-bold text-warm-900">
              No Members Found
            </h3>
            <p className="mt-1 text-xs text-warm-500 max-w-sm mx-auto">
              {searchTerm || selectedTier !== "all"
                ? "Try adjusting your search criteria or tier filters."
                : "Enrol your first VIP customer to start managing loyalty points and rewards."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-warm-200/90 bg-warm-50/70 text-[11px] font-semibold uppercase tracking-wider text-warm-600 font-mono">
                  <th className="py-3.5 pl-6 pr-4">Member Info</th>
                  <th className="px-4 py-3.5">Tier &amp; Privilege</th>
                  <th className="px-4 py-3.5 text-right">Points Balance</th>
                  <th className="px-4 py-3.5 text-right">Lifetime Spend</th>
                  <th className="px-4 py-3.5 text-center">Visits</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {members.map((m) => {
                  const tierInfo = getTierBadge(m.tier_code);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => openMemberDetails(m.id)}
                      className="group cursor-pointer hover:bg-warm-50/70 transition"
                    >
                      {/* Name & Contact */}
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
                              {m.tier_code === "vip" && (
                                <span className="text-xs">💎</span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-warm-500">
                              {m.phone}
                              {m.email && (
                                <span className="ml-2 opacity-70">
                                  · {m.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${tierInfo.badge}`}
                        >
                          {tierInfo.label}
                        </span>
                        <div className="mt-1 text-[11px] font-medium text-warm-500">
                          {tierInfo.perk}
                        </div>
                      </td>

                      {/* Points Balance */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200/90 rounded-xl px-2.5 py-1">
                          <Icons.Star />
                          <span className="text-sm">
                            {m.points.toLocaleString()} pts
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-warm-400">
                          ≈ {money(m.points * 0.05)} value
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-warm-900 text-sm">
                          {money(m.total_spent)}
                        </div>
                        <div className="text-[10px] text-warm-400 font-mono">
                          cumulative
                        </div>
                      </td>

                      {/* Visits Count */}
                      <td className="px-4 py-4 text-center whitespace-nowrap font-mono text-xs font-semibold text-warm-700">
                        {m.visits_count}{" "}
                        {m.visits_count === 1 ? "visit" : "visits"}
                      </td>

                      {/* Tier Progress */}
                      <td className="px-4 py-4 min-w-[140px]">
                        {m.tier_info ? (
                          <div>
                            <div className="flex justify-between text-[10px] font-mono text-warm-500 mb-1">
                              <span>{m.tier_info.current_tier}</span>
                              <span>
                                {m.tier_info.next_tier
                                  ? `${m.tier_info.progress_percent}%`
                                  : "MAX"}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-warm-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.tier_code === "vip"
                                    ? "bg-purple-600"
                                    : "bg-brand"
                                }`}
                                style={{
                                  width: `${Math.max(8, m.tier_info.progress_percent)}%`,
                                }}
                              />
                            </div>
                            {m.tier_info.next_tier && (
                              <div className="mt-1 text-[10px] font-mono text-warm-500">
                                {money(m.tier_info.needed)} to{" "}
                                {m.tier_info.next_tier}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-warm-400 font-mono">
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMemberDetails(m.id);
                          }}
                          className="rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-700 shadow-xs hover:border-brand hover:text-brand transition"
                        >
                          View History →
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

      {/* 1. MEMBER DETAILS MODAL */}
      {activeMemberDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveMemberDetails(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-warm-200 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-6 py-4 bg-warm-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                  <img
                    src={logo}
                    alt="MOLS MAISON"
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-warm-900">
                    VIP Member Profile &amp; Dining History
                  </h3>
                  <p className="text-[11px] font-mono text-warm-500">
                    Member ID #{activeMemberDetails.id} · Enrolled{" "}
                    {new Date(
                      activeMemberDetails.created_at,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMemberDetails(null)}
                className="rounded-xl p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Luxury Digital Membership Card */}
              <div
                className={`relative isolate overflow-hidden rounded-xl p-7 sm:p-8 text-white shadow-xl border ${
                  activeMemberDetails.tier_code === "vip"
                    ? "bg-[#332442] border-[#A18A65]"
                    : activeMemberDetails.tier_code === "gold"
                      ? "bg-[#80602F] border-[#D4B46E]"
                      : activeMemberDetails.tier_code === "silver"
                        ? "bg-[#596168] border-[#C9CBCD]"
                        : "bg-[#684B3A] border-[#B88E68]"
                }`}
              >
                {/* Decorative borders */}
                <div className="pointer-events-none absolute inset-[7px] rounded-lg border border-[#E5D4B4]/30" />
                <div className="pointer-events-none absolute inset-[12px] rounded-md border border-[#E5D4B4]/10" />

                {/* Background monogram */}
                <div className="pointer-events-none absolute -right-5 -bottom-14 select-none">
                  <span className="font-serif text-[230px] leading-none text-[#E5D4B4]/[0.07]">
                    M
                  </span>
                </div>

                {/* Decorative accents */}
                <div className="pointer-events-none absolute top-5 left-5 font-serif text-xl text-[#E5D4B4]/70">
                  ✧
                </div>
                <div className="pointer-events-none absolute top-5 right-5 font-serif text-xl text-[#E5D4B4]/70">
                  ✧
                </div>

                <div className="relative z-10 space-y-7">
                  {/* Brand and membership tier */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={logo}
                        alt="MOLS MAISON"
                        className="h-11 w-11 rounded-full bg-white object-contain p-1"
                      />

                      <div>
                        <h3 className="font-logo text-lg tracking-[0.16em]">
                          MOLS MAISON
                        </h3>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.25em] text-[#E5D4B4]/75">
                          Private Membership
                        </p>
                      </div>
                    </div>

                    <span className="rounded-sm border border-[#E5D4B4]/50 bg-black/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F0DDBB]">
                      {activeMemberDetails.tier_code === "vip"
                        ? "VIP Elite"
                        : `${activeMemberDetails.tier || "Bronze"} Member`}
                    </span>
                  </div>

                  {/* Member information */}
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="min-w-0">
                      <p className="mb-2 text-[9px] uppercase tracking-[0.23em] text-[#E5D4B4]/70">
                        Cardholder
                      </p>

                      <h2 className="break-words font-serif text-2xl sm:text-3xl font-medium tracking-wide text-[#F5EBDD]">
                        {activeMemberDetails.name}
                      </h2>

                      <p className="mt-2 text-[13px] font-mono tracking-wider text-white/70">
                        {activeMemberDetails.phone}
                      </p>

                      {activeMemberDetails.email && (
                        <p className="mt-1 break-all text-[13px] text-white/60">
                          {activeMemberDetails.email}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="mb-2 text-[9px] uppercase tracking-[0.23em] text-[#E5D4B4]/70">
                        Available Points
                      </p>

                      <p className="font-serif text-3xl sm:text-4xl font-medium tabular-nums text-[#F0D9A5]">
                        {(activeMemberDetails.points ?? 0).toLocaleString()}
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/65">
                        Reward Points
                      </p>

                      <p className="mt-2 text-[10px] font-mono text-[#E5D4B4]/80">
                        {money((activeMemberDetails.points ?? 0) * 0.05)} value
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
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#E5D4B4]/70">
                        Member Privilege
                      </p>
                      <p className="mt-1.5 font-serif text-base text-[#F5EBDD]">
                        {activeMemberDetails.discount_percent > 0
                          ? `${activeMemberDetails.discount_percent}% Dining Privilege`
                          : "Reward Membership"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#E5D4B4]/70">
                        Dining Visits
                      </p>
                      <p className="mt-1.5 font-serif text-base text-[#F5EBDD]">
                        {activeMemberDetails.visits_count ?? 0} Visits
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between border-t border-[#E5D4B4]/20 pt-3">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">
                      MOLS MAISON · Members Club
                    </p>

                    <p className="font-mono text-[10px] tracking-widest text-[#E5D4B4]/80">
                      MM · {String(activeMemberDetails.id).padStart(5, "0")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Orders History */}
              <div className="space-y-2.5">
                <h4 className="font-display text-sm font-bold text-warm-900 flex items-center gap-1.5">
                  <Icons.Cashier />
                  <span>Recent Dining Tickets &amp; Points Earned</span>
                </h4>

                {activeMemberDetails.recent_orders &&
                activeMemberDetails.recent_orders.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 thin-scrollbar">
                    {activeMemberDetails.recent_orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-2xl border border-warm-200 bg-white p-3.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-warm-900">
                            Order #{ord.id} · Table #{ord.table || "Walk-in"}
                          </div>
                          <div className="text-[11px] text-warm-500 font-mono mt-0.5">
                            {new Date(ord.paid_at).toLocaleString()} ·{" "}
                            {ord.payment_method?.toUpperCase() || "PAID"}
                          </div>
                          {ord.items_summary && (
                            <p className="text-[11px] text-warm-600 truncate max-w-sm mt-0.5">
                              {ord.items_summary}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-warm-900">
                            {money(ord.total)}
                          </div>
                          <div className="font-mono text-emerald-700 text-[11px] font-semibold">
                            +{ord.points_earned} pts earned
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-warm-400 text-xs">
                    No completed dining orders recorded yet for this member.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-warm-100 bg-warm-50/50 px-6 py-3.5 text-right">
              <button
                type="button"
                onClick={() => setActiveMemberDetails(null)}
                className="rounded-xl bg-warm-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ENROL NEW MEMBER MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-warm-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                  <img
                    src={logo}
                    alt="MOLS MAISON"
                    className="h-full w-full object-contain rounded-md"
                  />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-warm-900">
                    Enrol New VIP / Member
                  </h3>
                  <p className="text-[11px] font-mono text-warm-500">
                    MOLS MAISON Guest Rewards Program
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide mb-1">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Dupont"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 p-2.5 text-xs sm:text-sm text-warm-900 outline-none focus:border-brand focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide mb-1">
                  Phone Number (Member ID) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08123456789"
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm({ ...addForm, phone: e.target.value })
                  }
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 p-2.5 text-xs sm:text-sm font-mono text-warm-900 outline-none focus:border-brand focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 p-2.5 text-xs sm:text-sm text-warm-900 outline-none focus:border-brand focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide mb-1">
                  Staff Notes &amp; Preferences (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefers window seating, allergic to shellfish..."
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm({ ...addForm, notes: e.target.value })
                  }
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 p-2.5 text-xs sm:text-sm text-warm-900 outline-none focus:border-brand focus:bg-white"
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                ★ <strong>50 Bonus Welcome Points</strong> will be automatically
                credited to this member upon enrolment.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                  className="rounded-xl border border-warm-200 bg-white px-4 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-xl bg-warm-900 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand active:scale-95 transition"
                >
                  {addLoading ? "Enrolling..." : "Enrol Member ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
