import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api, money, printThermalReceipt } from "../lib";
import { Icons } from "./Icons";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/imgs/logo.jpg";

const PRIVE_PLAN_PRICE = 49.99;

export default function VipMemberList() {
  const { user } = useAuth();
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
  const [priveEnrollTarget, setPriveEnrollTarget] = useState(null);
  const [privePaymentMode, setPrivePaymentMode] = useState("cash");
  const [priveCashTendered, setPriveCashTendered] = useState("");
  const [priveCashError, setPriveCashError] = useState("");
  const [priveReceipt, setPriveReceipt] = useState(null);

  const canManageMembers = ["admin", "owner", "manager"].includes((user?.role || "").toLowerCase());
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    loyalty_tier: "bronze",
    points_balance: "0",
    lifetime_spending: "0",
    status: "active",
    notes: "",
    password: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editConfirmAction, setEditConfirmAction] = useState(null); // null | 'close' | 'save'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
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

  useEffect(() => {
    if (!activeMemberDetails && !priveEnrollTarget && !priveReceipt && !editTarget && !editConfirmAction && !deleteTarget && !showAddModal) return;
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (editConfirmAction) {
        setEditConfirmAction(null);
      } else if (deleteTarget) {
        setDeleteTarget(null);
      } else if (editTarget) {
        setEditConfirmAction("close");
      } else if (showAddModal) {
        setShowAddModal(false);
      } else if (priveReceipt) {
        setPriveReceipt(null);
      } else if (priveEnrollTarget) {
        setPriveEnrollTarget(null);
      } else if (activeMemberDetails) {
        setActiveMemberDetails(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMemberDetails, priveEnrollTarget, priveReceipt, editTarget, editConfirmAction, deleteTarget, showAddModal]);

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

  // Open Edit Member Modal (Owner / Admin / Manager only)
  const openEditModal = (member, e) => {
    if (e) e.stopPropagation();
    if (!canManageMembers || !member) return;
    setEditTarget(member);
    setEditConfirmAction(null);
    setEditError("");
    setEditForm({
      full_name: member.name || member.full_name || "",
      phone: member.phone || "",
      email: member.email || "",
      date_of_birth: member.date_of_birth ? String(member.date_of_birth).slice(0, 10) : "",
      gender: member.gender || "",
      loyalty_tier: (member.tier_code || member.loyalty_tier || member.tier || "bronze").toLowerCase(),
      points_balance: String(member.points ?? member.points_balance ?? 0),
      lifetime_spending: String(member.total_spent ?? member.lifetime_spending ?? 0),
      status: (member.status || "active").toLowerCase(),
      notes: member.notes || "",
      password: "",
    });
  };

  const requestCloseEditModal = () => {
    if (editSaving) return;
    setEditConfirmAction("close");
  };

  // Validate Updated Member Info, then prompt confirmation popup
  const handleEditMember = (e) => {
    e.preventDefault();
    if (!canManageMembers || !editTarget || editSaving) return;
    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      setEditError("Full name and phone number are required.");
      return;
    }

    const parsedPoints = parseFloat(editForm.points_balance);
    const parsedSpending = parseFloat(editForm.lifetime_spending);
    if (isNaN(parsedPoints) || parsedPoints < 0) {
      setEditError("Points balance must be 0 or greater.");
      return;
    }
    if (isNaN(parsedSpending) || parsedSpending < 0) {
      setEditError("Lifetime spending must be $0.00 or greater.");
      return;
    }
    if (editForm.password.trim() && editForm.password.trim().length < 4) {
      setEditError("New PIN / password must be at least 4 characters.");
      return;
    }

    setEditError("");
    setEditConfirmAction("save");
  };

  // Execute Save after Double-Check Confirmation (Owner / Admin / Manager only)
  const executeSaveEditMember = async () => {
    if (!canManageMembers || !editTarget || editSaving) return;
    const parsedPoints = parseFloat(editForm.points_balance);
    const parsedSpending = parseFloat(editForm.lifetime_spending);

    setEditSaving(true);
    setEditError("");
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender.trim() || null,
        loyalty_tier: editForm.loyalty_tier,
        points_balance: parsedPoints,
        lifetime_spending: parsedSpending,
        status: editForm.status,
        notes: editForm.notes.trim() || null,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await api(`/staff/members/${editTarget.id}`, {
        method: "PATCH",
        body: payload,
      });
      const updatedId = editTarget.id;
      showToast(res.message || `Updated ${payload.full_name}'s VIP profile.`);
      setEditConfirmAction(null);
      setEditTarget(null);
      fetchMembers();
      if (activeMemberDetails?.id === updatedId) {
        openMemberDetails(updatedId);
      }
    } catch (err) {
      setEditConfirmAction(null);
      setEditError(err.message || "Failed to update VIP member info.");
    } finally {
      setEditSaving(false);
    }
  };

  // Open Delete Member Confirmation Modal (Owner / Admin / Manager only)
  const openDeleteModal = (member, e) => {
    if (e) e.stopPropagation();
    if (!canManageMembers || !member) return;
    setDeleteError("");
    setDeleteTarget(member);
  };

  // Delete VIP Member (Owner / Admin / Manager only)
  const confirmDeleteMember = async () => {
    if (!canManageMembers || !deleteTarget || deletingId) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    setDeleteError("");
    try {
      const res = await api(`/staff/members/${target.id}`, {
        method: "DELETE",
      });
      showToast(res.message || `Removed ${target.name || target.full_name} from VIP directory.`);
      setDeleteTarget(null);
      if (activeMemberDetails?.id === target.id) {
        setActiveMemberDetails(null);
      }
      if (editTarget?.id === target.id) {
        setEditTarget(null);
      }
      fetchMembers();
    } catch (err) {
      setDeleteError(err.message || "Failed to remove VIP member.");
    } finally {
      setDeletingId(null);
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

  // Open Maison Privé enrollment & payment confirmation popup
  const openPriveEnrollModal = (member) => {
    if (!member) return;
    setPriveEnrollTarget({
      id: member.id,
      name: member.name || member.full_name,
      phone: member.phone,
      tier: member.tier || member.loyalty_tier || "Bronze",
      isPrive: Boolean(member.membership?.is_prive),
      currentEndDate: member.membership?.end_date || null,
    });
    setPrivePaymentMode("cash");
    setPriveCashTendered("");
    setPriveCashError("");
  };

  // Confirm payment & activate Maison Privé subscription, then show receipt
  const confirmPriveEnrollment = async (e) => {
    e.preventDefault();
    if (!priveEnrollTarget || subscribingId) return;

    const tendered = parseFloat(priveCashTendered) || 0;
    if (privePaymentMode === "cash") {
      if (!priveCashTendered || tendered < PRIVE_PLAN_PRICE) {
        setPriveCashError(`Please enter cash received from patron (at least ${money(PRIVE_PLAN_PRICE)}).`);
        return;
      }
    }
    setPriveCashError("");

    const target = priveEnrollTarget;
    setSubscribingId(target.id);
    try {
      const res = await api("/memberships/subscribe", {
        method: "POST",
        body: {
          customer_id: target.id,
          amount_paid: PRIVE_PLAN_PRICE,
          payment_method: privePaymentMode,
          amount_tendered: privePaymentMode === "cash" ? tendered : PRIVE_PLAN_PRICE,
        },
      });
      const m = res?.membership || {};
      const changeDue = privePaymentMode === "cash" ? Math.max(0, Math.round((tendered - PRIVE_PLAN_PRICE) * 100) / 100) : 0;

      setPriveEnrollTarget(null);
      setPriveReceipt({
        receiptNo: `MP-${String(m.id || Date.now()).padStart(5, "0")}`,
        date: new Date().toLocaleString(),
        processedBy: user?.name || "Staff Counter",
        memberId: target.id,
        memberName: target.name,
        memberPhone: target.phone,
        memberTier: target.tier,
        isRenewal: target.isPrive,
        planName: m.plan_name || "Maison Privé Annual Plan",
        startDate: m.start_date || new Date().toISOString().slice(0, 10),
        endDate: m.end_date || "",
        amountPaid: Number(m.amount_paid ?? PRIVE_PLAN_PRICE),
        paymentMode: privePaymentMode,
        tendered: privePaymentMode === "cash" ? tendered : PRIVE_PLAN_PRICE,
        changeDue,
      });

      showToast(res.message || "Maison Privé subscription activated!");
      fetchMembers();
      if (activeMemberDetails?.id === target.id) {
        openMemberDetails(target.id);
      }
    } catch (err) {
      alert(err.message || "Failed to activate Maison Privé subscription.");
    } finally {
      setSubscribingId(null);
    }
  };

  const handlePrintPriveReceipt = () => {
    printThermalReceipt("printable-receipt");
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
          badge: `${baseBadge} bg-[#1C1917] text-[#F5D77F] border-[#C9A23F]`,
          perk: "10% Off + 2x Pts",
          color: "vip",
        };

      case "gold":
        return {
          label: "Gold Tier",
          badge: `${baseBadge} bg-[#F7E5AE] text-[#7D580C] border-[#D9B14C]`,
          perk: "5% Off + 1.5x Pts",
          color: "gold",
        };

      case "silver":
        return {
          label: "Silver Tier",
          badge: `${baseBadge} bg-[#E2E6EA] text-[#3F4852] border-[#B4BCC4]`,
          perk: "3% Off + 1.25x Pts",
          color: "silver",
        };

      default:
        return {
          label: "Bronze Tier",
          badge: `${baseBadge} bg-[#EBD3BE] text-[#7A441D] border-[#C6936B]`,
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
              <h1 className="font-display text-2xl font-bold tracking-normal leading-snug text-warm-900 sm:text-3xl">
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
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-brand-dark active:bg-brand-900 active:scale-95 transition"
          >
            <Icons.Star />
            <span>Enrol New Member</span>
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
              ? "bg-brand text-white shadow-xs"
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
              ? "bg-[#242024] text-[#F5EBDD] border border-[#C8B084]/40 shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
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
              ? "bg-brand text-white shadow-xs"
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
              ? "bg-brand text-white shadow-xs"
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

              <div className="rounded-3xl border border-purple-300 bg-purple-50 p-4 sm:p-5 shadow-xs">
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

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-xs">
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
                      ? "bg-brand text-white shadow-xs"
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
                  className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
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
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#242024] text-[#E8D5B5] border border-[#C8B084]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
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
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {canManageMembers && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => openEditModal(m, e)}
                                    title="Edit VIP member info"
                                    className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => openDeleteModal(m, e)}
                                    title="Remove VIP member"
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 transition"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
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
                            </div>
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
          <div className="rounded-3xl bg-[#242024] text-[#F5EBDD] p-6 shadow-xl border border-[#C8B084]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl font-bold tracking-normal leading-snug text-white">Maison Privé Annual Plan ($49.99)</h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Paid annual subscription providing priority reservations, welcome drinks, birthday desserts, and exclusive seasonal tastings.
                It is fully separated from and does not replace spending tiers (Bronze, Silver, Gold, VIP).
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-[#C8B084]/30 text-center min-w-[160px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#E8D5B5]">Active Privé Patrons</span>
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
                          onClick={() => openPriveEnrollModal(m)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 ${
                            isPrive
                              ? "bg-stone-200 text-stone-900 hover:bg-stone-300"
                              : "bg-[#242024] text-[#F5EBDD] hover:bg-stone-800"
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
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-dark active:bg-brand-900 active:scale-95 transition"
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
            <div className="rounded-3xl border border-[#D6C7B2] bg-[#FAF7F2] p-5 shadow-xs">
              <span className="text-[11px] font-mono text-stone-700 uppercase">Paid Maison Privé</span>
              <p className="text-3xl font-extrabold text-stone-900 mt-2">{analyticsData?.prive_members || members.filter(m => m.membership?.is_prive).length}</p>
              <span className="text-[11px] text-stone-600">$49.99 annual subscriptions</span>
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
              <div className="p-4 rounded-2xl bg-[#FBF4EC] border border-[#DFBE9F] space-y-1.5">
                <span className="font-bold text-[#8A4E24] text-sm">🥉 Bronze</span>
                <p className="text-[#9E643B]">$0 – $199.99 Spend</p>
                <p className="font-bold text-[#5E3416]">0% Discount · 1x Multiplier</p>
                <p className="text-[11px] text-[#9E643B]">Birthday: Complimentary dessert</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 text-sm">🥈 Silver</span>
                <p className="text-slate-600">$200 – $399.99 Spend</p>
                <p className="font-bold text-slate-900">3% Discount · 1.25x Multiplier</p>
                <p className="text-[11px] text-slate-500">Birthday: Dessert + 100 bonus pts</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FEF9E7] border border-[#ECD078] space-y-1.5">
                <span className="font-bold text-[#A16D0A] text-sm">⭐ Gold</span>
                <p className="text-[#9E7015]">$400 – $599.99 Spend</p>
                <p className="font-bold text-[#6E4904]">5% Discount · 1.5x Multiplier</p>
                <p className="text-[11px] text-[#9E7015]">Birthday: Dessert + signature drink</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#181512] border border-[#D4AF37] space-y-1.5">
                <span className="font-bold text-[#F5D77F] text-sm">✦ VIP</span>
                <p className="text-[#E6C770]/85">$600+ Lifetime Spend</p>
                <p className="font-bold text-white">10% Discount · 2.0x Multiplier</p>
                <p className="text-[11px] text-[#E6C770]/80">Birthday: Premium dessert + drink</p>
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
        <div
          onClick={() => setActiveMemberDetails(null)}
          className="fixed inset-0 z-50 flex justify-end bg-warm-950/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
          >
            <div className="px-6 py-5 border-b border-warm-100 flex items-center justify-between gap-3 bg-warm-50/60 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💎</span>
                <h3 className="font-display text-lg font-bold text-warm-900">Customer Profile &amp; Loyalty</h3>
              </div>
              <div className="flex items-center gap-2">
                {canManageMembers && activeMemberDetails && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(activeMemberDetails)}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                    >
                      Edit Info
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(activeMemberDetails)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setActiveMemberDetails(null)}
                  className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700"
                  aria-label="Close membership panel"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 flex-1">
              {/* Luxury Digital Membership Card */}
              {(() => {
                const cardTier = (activeMemberDetails.tier_code || activeMemberDetails.loyalty_tier || "").toLowerCase();
                const isVipCard = cardTier === "vip";
                return (
              <div
                className={`relative isolate overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-xl border ${
                  isVipCard
                    ? "bg-[#141414] border-[#D4AF37]"
                    : cardTier === "gold"
                      ? "bg-[#C8963E] border-[#F7DF9C]"
                      : cardTier === "silver"
                        ? "bg-[#8E9BA8] border-[#E5ECF2]"
                        : "bg-[#C47E52] border-[#F0C89E]"
                }`}
              >
                {/* Decorative borders */}
                <div className={`pointer-events-none absolute inset-[7px] rounded-xl border ${isVipCard ? "border-[#D4AF37]/45" : "border-white/35"}`} />
                <div className={`pointer-events-none absolute inset-[12px] rounded-lg border ${isVipCard ? "border-[#D4AF37]/20" : "border-white/15"}`} />

                {/* Background monogram */}
                <div className="pointer-events-none absolute -right-5 -bottom-14 select-none">
                  <span className={`font-serif text-[210px] leading-none ${isVipCard ? "text-[#D4AF37]/[0.10]" : "text-white/[0.09]"}`}>
                    M
                  </span>
                </div>

                {/* Decorative accents */}
                <div className={`pointer-events-none absolute top-4 left-4 font-serif text-lg ${isVipCard ? "text-[#F3D478]" : "text-white/75"}`}>
                  ✧
                </div>
                <div className={`pointer-events-none absolute top-4 right-4 font-serif text-lg ${isVipCard ? "text-[#F3D478]" : "text-white/75"}`}>
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
                        <h3 className={`font-logo text-lg tracking-[0.16em] ${isVipCard ? "text-[#F6DF93]" : "text-white"}`}>
                          MOLS MAISON
                        </h3>
                        <p className={`mt-0.5 text-[9px] uppercase tracking-[0.25em] ${isVipCard ? "text-[#E8CA7A]/85" : "text-white/85"}`}>
                          Private Membership
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {activeMemberDetails.membership?.is_prive && (
                        <span className="rounded-sm border border-[#E5D4B4]/60 bg-[#242024]/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F5EBDD] backdrop-blur-xs">
                          👑 Privé
                        </span>
                      )}
                      <span className={`rounded-sm border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-xs ${
                        isVipCard
                          ? "border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F6DF93]"
                          : "border-white/50 bg-black/20 text-white"
                      }`}>
                        {isVipCard
                          ? "VIP Elite"
                          : `${activeMemberDetails.tier || activeMemberDetails.loyalty_tier || "Bronze"} Member`}
                      </span>
                    </div>
                  </div>

                  {/* Member information */}
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="min-w-0">
                      <p className={`mb-1 text-[9px] uppercase tracking-[0.23em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}>
                        Cardholder
                      </p>

                      <h2 className={`break-words font-serif text-2xl sm:text-3xl font-medium tracking-wide ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}>
                        {activeMemberDetails.name || activeMemberDetails.full_name}
                      </h2>

                      <p className="mt-1.5 text-[12px] font-mono tracking-wider text-white/90">
                        {activeMemberDetails.phone}
                      </p>

                      {activeMemberDetails.date_of_birth && (
                        <p className={`mt-0.5 text-[11px] font-mono ${isVipCard ? "text-[#E8CA7A]" : "text-white/85"}`}>
                          🎂 Born: {activeMemberDetails.date_of_birth}
                        </p>
                      )}

                      {activeMemberDetails.email && (
                        <p className="mt-0.5 break-all text-[11px] text-white/80">
                          {activeMemberDetails.email}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={`mb-1 text-[9px] uppercase tracking-[0.23em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}>
                        Available Points
                      </p>

                      <p className={`font-serif text-3xl sm:text-4xl font-medium tabular-nums ${isVipCard ? "text-[#F6DF93]" : "text-[#FFF6DF]"}`}>
                        {(activeMemberDetails.points || activeMemberDetails.points_balance || 0).toLocaleString()}
                      </p>

                      <p className={`mt-0.5 text-[9px] uppercase tracking-[0.16em] font-mono ${isVipCard ? "text-[#E8CA7A]/85" : "text-white/85"}`}>
                        Reward Points
                      </p>

                      <p className={`mt-1 text-[10px] font-mono ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}>
                        ≈ {money((activeMemberDetails.points || activeMemberDetails.points_balance || 0) / 100)} value
                      </p>
                    </div>
                  </div>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-3">
                    <div className={`h-px flex-1 ${isVipCard ? "bg-[#D4AF37]/40" : "bg-white/35"}`} />
                    <span className={`font-serif text-sm ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}>
                      ✧
                    </span>
                    <div className={`h-px flex-1 ${isVipCard ? "bg-[#D4AF37]/40" : "bg-white/35"}`} />
                  </div>

                  {/* Membership privileges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}>
                        Member Privilege
                      </p>
                      <p className={`mt-1 font-serif text-sm sm:text-base ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}>
                        {activeMemberDetails.discount_percent > 0
                          ? `${activeMemberDetails.discount_percent}% Dining Privilege`
                          : (cardTier === "silver"
                            ? "3% Dining Privilege"
                            : cardTier === "gold"
                              ? "5% Dining Privilege"
                              : isVipCard
                                ? "10% Dining Privilege"
                                : "1x Points per $1")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}>
                        Lifetime Spend
                      </p>
                      <p className={`mt-1 font-serif text-sm sm:text-base ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}>
                        {money(activeMemberDetails.total_spent || activeMemberDetails.lifetime_spending || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className={`flex items-center justify-between border-t pt-2.5 ${isVipCard ? "border-[#D4AF37]/25" : "border-white/25"}`}>
                    <p className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/70" : "text-white/75"}`}>
                      MOLS MAISON · Members Club
                    </p>

                    <p className={`font-mono text-[10px] tracking-widest ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}>
                      MM · {String(activeMemberDetails.id).padStart(5, "0")}
                    </p>
                  </div>
                </div>
              </div>
                );
              })()}

              {/* Maison Privé Status */}
              <div className="rounded-2xl border border-[#D6C7B2] bg-[#FAF7F2] p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <span>👑</span>
                    <span>Maison Privé Annual Plan</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    activeMemberDetails.membership?.is_prive
                      ? "bg-[#242024] text-[#E8D5B5] border border-[#C8B084]/40"
                      : "bg-stone-200 text-stone-700"
                  }`}>
                    {activeMemberDetails.membership?.is_prive ? "Active Privé Member" : "Standard Account"}
                  </span>
                </div>
                {activeMemberDetails.membership?.is_prive ? (
                  <p className="text-[11px] text-stone-600 font-mono">
                    Valid until {activeMemberDetails.membership.end_date} ({activeMemberDetails.membership.days_remaining} days remaining)
                  </p>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-stone-600">$49.99 / 12 Months</span>
                    <button
                      type="button"
                      disabled={subscribingId === activeMemberDetails.id}
                      onClick={() => openPriveEnrollModal(activeMemberDetails)}
                      className="rounded-xl bg-[#242024] text-[#F5EBDD] px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-stone-800 transition"
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
                  className="w-full rounded-xl bg-brand text-white py-2 text-xs font-bold hover:bg-brand-dark transition"
                >
                  {adjustLoading ? "Applying..." : "Submit Points Adjustment"}
                </button>
              </form>

              {/* Recent Orders */}
              {activeMemberDetails.recent_orders && activeMemberDetails.recent_orders.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-display text-xs font-bold text-warm-900 uppercase">Recent Dining Visits</h5>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
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
                  className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-dark"
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
                  className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-dark"
                >
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit VIP Member Modal (Owner / Admin / Manager) */}
      {editTarget && canManageMembers && (
        <div
          onClick={requestCloseEditModal}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Edit VIP Member Info
                </h3>
                <p className="text-[11px] font-mono text-warm-500">
                  MM · {String(editTarget.id).padStart(5, "0")} · Managed by {user?.role}
                </p>
              </div>
              <button
                type="button"
                onClick={requestCloseEditModal}
                className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 font-bold"
                aria-label="Close edit modal"
              >
                ✕
              </button>
            </div>

            {editError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {editError}
              </p>
            )}

            <form onSubmit={handleEditMember} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Full Name *</label>
                  <input
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Phone Number *</label>
                  <input
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm font-mono outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="member@example.com"
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">VIP Tier</label>
                  <select
                    value={editForm.loyalty_tier}
                    onChange={(e) => setEditForm({ ...editForm, loyalty_tier: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-brand"
                  >
                    <option value="bronze">🥉 Bronze</option>
                    <option value="silver">🥈 Silver</option>
                    <option value="gold">🥇 Gold</option>
                    <option value="vip">💎 VIP Elite</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-brand"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Gender</label>
                  <input
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Points Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.points_balance}
                    onChange={(e) => setEditForm({ ...editForm, points_balance: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm font-mono outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-warm-700 block mb-1">Lifetime Spend ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.lifetime_spending}
                    onChange={(e) => setEditForm({ ...editForm, lifetime_spending: e.target.value })}
                    className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm font-mono outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">
                  Reset PIN / Password <span className="font-normal text-warm-400">(optional, min 4 chars)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to keep existing password/PIN"
                  className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-warm-700 block mb-1">Staff Notes / Preferences</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Dietary preferences, seating requests, VIP remarks..."
                  className="w-full rounded-xl border border-warm-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => openDeleteModal(editTarget)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  Delete Member
                </button>
                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={requestCloseEditModal}
                    className="rounded-xl bg-warm-100 px-4 py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-xl bg-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-dark disabled:opacity-50 transition"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Double-Check Popup Before Closing or Saving Edit VIP Member Modal */}
      {editConfirmAction && editTarget && canManageMembers && (
        <div
          onClick={() => !editSaving && setEditConfirmAction(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-warm-950/65 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 border ${
              editConfirmAction === "close" ? "border-amber-200" : "border-warm-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-[11px] font-mono uppercase tracking-wider font-bold ${
                    editConfirmAction === "close" ? "text-amber-700" : "text-brand"
                  }`}
                >
                  {editConfirmAction === "close" ? "Confirm Close" : "Confirm Update"}
                </p>
                <h3 className="font-display text-lg font-bold text-warm-900 mt-0.5">
                  {editConfirmAction === "close"
                    ? "Close Edit VIP Member?"
                    : `Save Changes to ${editForm.full_name || "Member"}?`}
                </h3>
              </div>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditConfirmAction(null)}
                className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 font-bold"
                aria-label="Return to editing"
              >
                ✕
              </button>
            </div>

            {editConfirmAction === "close" ? (
              <p className="text-xs sm:text-sm text-warm-600 leading-relaxed">
                Are you sure you want to close{" "}
                <strong className="text-warm-900">{editTarget.name || editTarget.full_name}</strong>
                &apos;s edit form? Any unsaved changes will not be applied.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-warm-600 leading-relaxed">
                  Please double-check the updated member details before saving:
                </p>
                <div className="rounded-2xl border border-warm-200 bg-warm-50 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-warm-500">Name:</span>
                    <span className="font-semibold text-warm-900 truncate">{editForm.full_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-warm-500">Phone:</span>
                    <span className="font-mono font-semibold text-warm-900">{editForm.phone}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-warm-500">Tier &amp; Status:</span>
                    <span className="font-semibold text-warm-900">
                      {editForm.loyalty_tier.toUpperCase()} · {editForm.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-warm-500">Points / Spend:</span>
                    <span className="font-mono font-semibold text-warm-900">
                      {Number(editForm.points_balance || 0).toLocaleString()} pts · {money(editForm.lifetime_spending)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditConfirmAction(null)}
                className="flex-1 rounded-xl border border-warm-300 bg-white py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition"
              >
                Keep Editing
              </button>
              {editConfirmAction === "close" ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditConfirmAction(null);
                    setEditTarget(null);
                  }}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-amber-700 transition"
                >
                  Yes, Close
                </button>
              ) : (
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={executeSaveEditMember}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-dark disabled:opacity-50 transition"
                >
                  {editSaving ? "Saving..." : "Yes, Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete VIP Member Confirmation Modal (Owner / Admin / Manager) */}
      {deleteTarget && canManageMembers && (
        <div
          onClick={() => !deletingId && setDeleteTarget(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-rose-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider font-bold text-rose-600">
                  Remove VIP Patron
                </p>
                <h3 className="font-display text-lg font-bold text-warm-900 mt-0.5">
                  Delete {deleteTarget.name || deleteTarget.full_name}?
                </h3>
              </div>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 font-bold"
                aria-label="Close delete confirmation"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-warm-200 bg-warm-50 p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-warm-500">Phone:</span>
                <span className="font-mono font-semibold text-warm-900">{deleteTarget.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Tier &amp; Points:</span>
                <span className="font-semibold text-warm-900">
                  {(deleteTarget.tier_code || deleteTarget.loyalty_tier || "bronze").toUpperCase()} · {(deleteTarget.points ?? 0).toLocaleString()} pts
                </span>
              </div>
            </div>

            <p className="text-xs text-warm-600 leading-relaxed">
              This will permanently remove this VIP profile, active rewards, and loyalty ledger entries. Historical paid orders remain intact.
            </p>

            {deleteError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {deleteError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-warm-300 bg-white py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={confirmDeleteMember}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {deletingId ? "Removing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maison Privé Enrollment Confirmation & Payment Options Modal */}
      {priveEnrollTarget && (
        <div
          onClick={() => setPriveEnrollTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={confirmPriveEnrollment}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-warm-200 space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-warm-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4EFE6] border border-[#D6C7B2] text-xl">
                  👑
                </span>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                    {priveEnrollTarget.isPrive ? "Confirm Maison Privé Renewal" : "Confirm Maison Privé Enrollment"}
                  </h3>
                  <p className="text-xs text-warm-500">
                    Verify patron details and select payment method to activate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriveEnrollTarget(null)}
                className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700"
                aria-label="Close enrollment popup"
              >
                ✕
              </button>
            </div>

            {/* Patron & Plan Summary */}
            <div className="rounded-2xl border border-[#D6C7B2] bg-[#FAF7F2] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Patron</p>
                  <p className="font-display text-sm sm:text-base font-bold text-warm-900">
                    {priveEnrollTarget.name}
                  </p>
                  <p className="text-xs font-mono text-warm-600">
                    {priveEnrollTarget.phone} · MM · {String(priveEnrollTarget.id).padStart(5, "0")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-[#242024] border border-[#C8B084]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E8D5B5]">
                    {priveEnrollTarget.isPrive ? "+12 Months Renewal" : "12 Months Plan"}
                  </span>
                  <p className="mt-1 font-mono text-xl font-black text-stone-900">
                    {money(PRIVE_PLAN_PRICE)}
                  </p>
                </div>
              </div>

              {priveEnrollTarget.isPrive && priveEnrollTarget.currentEndDate && (
                <p className="text-[11px] font-mono text-stone-600 border-t border-[#E6DAC8] pt-2">
                  Current expiry: {priveEnrollTarget.currentEndDate} (will extend by 12 months)
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-700 border-t border-[#E6DAC8] pt-2">
                <span>✓ Priority Reservations</span>
                <span>✓ Welcome Drink</span>
                <span>✓ Birthday Dessert</span>
                <span>✓ Seasonal Tastings</span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-warm-600 block">
                Payment Method
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-xs">
                {[
                  { id: "cash", label: "Cash" },
                  { id: "card", label: "Card" },
                  { id: "qr", label: "QR Pay" },
                  { id: "transfer", label: "Transfer" },
                  { id: "ewallet", label: "E-Wallet" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPrivePaymentMode(m.id);
                      setPriveCashError("");
                    }}
                    className={`rounded-xl py-2.5 font-display text-center font-medium transition ${
                      privePaymentMode === m.id
                        ? "bg-brand text-white shadow-xs font-semibold"
                        : "bg-warm-100 text-warm-800 hover:bg-warm-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tender Calculator */}
            {privePaymentMode === "cash" && (
              <div
                className={`rounded-2xl p-3.5 border space-y-2.5 transition ${
                  priveCashError
                    ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-300"
                    : "border-warm-200 bg-warm-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-warm-800">
                  <span>Amount Given by Patron ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="49.99"
                    value={priveCashTendered}
                    onChange={(e) => {
                      setPriveCashTendered(e.target.value);
                      setPriveCashError("");
                    }}
                    className="w-28 rounded-xl border border-warm-300 p-1.5 font-mono text-right text-sm font-bold outline-none focus:border-brand bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-warm-500 mr-1">Quick:</span>
                  {[PRIVE_PLAN_PRICE, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setPriveCashTendered(String(amt));
                        setPriveCashError("");
                      }}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition active:scale-95 ${
                        parseFloat(priveCashTendered) === amt
                          ? "bg-brand text-white shadow-xs"
                          : "bg-white border border-warm-300 text-warm-800 hover:bg-warm-100"
                      }`}
                    >
                      {amt === PRIVE_PLAN_PRICE ? `Exact ($${amt.toFixed(2)})` : `$${amt.toFixed(2)}`}
                    </button>
                  ))}
                </div>

                {priveCashError && (
                  <p className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{priveCashError}</span>
                  </p>
                )}

                {parseFloat(priveCashTendered) >= PRIVE_PLAN_PRICE && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-100/90 p-2.5 border border-emerald-300 font-mono text-emerald-900">
                    <span className="text-xs font-bold uppercase tracking-wider">Change to Return:</span>
                    <span className="text-lg font-black">
                      {money(Math.max(0, Math.round((parseFloat(priveCashTendered) - PRIVE_PLAN_PRICE) * 100) / 100))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPriveEnrollTarget(null)}
                className="flex-1 rounded-xl border border-warm-300 bg-white py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={subscribingId === priveEnrollTarget.id}
                className="flex-1 rounded-xl bg-[#242024] py-2.5 font-display text-xs sm:text-sm font-bold text-[#F5EBDD] shadow-md hover:bg-stone-800 active:scale-95 transition disabled:opacity-50"
              >
                {subscribingId === priveEnrollTarget.id
                  ? "Processing..."
                  : priveEnrollTarget.isPrive
                    ? `Confirm & Renew (${money(PRIVE_PLAN_PRICE)})`
                    : `Confirm & Enroll (${money(PRIVE_PLAN_PRICE)})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Maison Privé Subscription Receipt Modal */}
      {priveReceipt && (
        <div
          onClick={() => setPriveReceipt(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-warm-200 flex flex-col max-h-[90vh] overflow-y-auto"
          >
            {/* Printable Thermal Receipt */}
            <div
              id="printable-receipt"
              className="font-mono text-[11px] text-black space-y-2.5 w-full leading-relaxed"
            >
              {/* Restaurant Header */}
              <div className="text-center pb-2.5 border-b-2 border-double border-black">
                <img
                  src={logo}
                  alt="MOLS MAISON"
                  className="mx-auto h-12 w-12 object-contain rounded-full mb-1.5"
                />
                <p className="text-[8px] uppercase tracking-[0.3em]">
                  An Exceptional Dining Experience
                </p>
                <h3 className="font-logo text-xl tracking-[0.16em] font-bold mt-0.5">
                  MOLS MAISON
                </h3>
                <p className="text-[8px] uppercase tracking-[0.25em] mt-0.5">
                  CAMBODIA · MEMBERS CLUB
                </p>
                <div className="my-1 text-[9px] tracking-[0.3em]">
                  ✦ · ✦ · ✦
                </div>
                <p className="text-[9px]">Toul Kork, Phnom Penh</p>
                <p className="text-[9px]">Cambodia · Tel: +855 67 67 67</p>
              </div>

              {/* Receipt Info */}
              <div className="py-2 border-b border-dashed border-black space-y-1">
                <div className="flex justify-between font-bold">
                  <span>MEMBERSHIP RECEIPT</span>
                  <span>#{priveReceipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patron</span>
                  <span className="font-semibold">{priveReceipt.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone / ID</span>
                  <span>{priveReceipt.memberPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Member Card</span>
                  <span>MM · {String(priveReceipt.memberId).padStart(5, "0")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processed By</span>
                  <span>{priveReceipt.processedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{priveReceipt.date}</span>
                </div>
              </div>

              {/* Subscription Item */}
              <div className="py-2 space-y-1.5 border-b border-dashed border-black">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider pb-0.5">
                  <span>Plan Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between items-start gap-2 text-[11px]">
                  <span className="flex-1 break-words">
                    👑 {priveReceipt.planName} ({priveReceipt.isRenewal ? "12-Mo Renewal" : "12 Months"})
                  </span>
                  <span className="shrink-0 font-medium">{money(priveReceipt.amountPaid)}</span>
                </div>
                <div className="text-[10px] space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Active From</span>
                    <span>{priveReceipt.startDate}</span>
                  </div>
                  {priveReceipt.endDate && (
                    <div className="flex justify-between font-bold">
                      <span>Valid Until</span>
                      <span>{priveReceipt.endDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-y-2 border-double border-black py-2">
                <div className="flex justify-between items-center font-black text-xs sm:text-sm">
                  <span>TOTAL PAID</span>
                  <span>{money(priveReceipt.amountPaid)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-1.5 space-y-1 text-[11px] border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="uppercase font-bold">{priveReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Payment Status</span>
                  <span>✓ PAID</span>
                </div>
                {priveReceipt.paymentMode === "cash" && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Tendered</span>
                      <span>{money(priveReceipt.tendered)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Change Returned</span>
                      <span>{money(priveReceipt.changeDue)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-[9px] pt-1 space-y-0.5">
                <p className="font-bold">Welcome to Maison Privé</p>
                <p>Priority Reservations · Welcome Drink · Birthday Dessert</p>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="flex gap-2 mt-5 pt-3 border-t border-warm-100 print:hidden">
              <button
                type="button"
                onClick={handlePrintPriveReceipt}
                className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-dark transition"
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setPriveReceipt(null)}
                className="rounded-xl border border-warm-300 px-4 py-2.5 text-xs sm:text-sm font-bold text-warm-700 hover:bg-warm-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
