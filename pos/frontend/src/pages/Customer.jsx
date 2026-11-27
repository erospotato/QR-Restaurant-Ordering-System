import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatImageUrl, money, timeStr, useLive, inp, printThermalReceipt } from "../lib";

import logo from "../assets/imgs/logo.jpg";

function useSwipeUpDismiss(onDismiss, threshold = 32) {
  const startYRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);

  const reset = () => {
    startYRef.current = null;
    setOffsetY(0);
  };

  const start = (clientY) => {
    startYRef.current = clientY;
    setOffsetY(0);
  };

  const move = (clientY) => {
    if (startYRef.current === null) return;
    const delta = clientY - startYRef.current;
    if (delta < 0) setOffsetY(delta);
  };

  const end = (clientY) => {
    if (startYRef.current === null) return;
    const delta = (clientY ?? startYRef.current) - startYRef.current;
    reset();
    if (delta <= -threshold) {
      onDismiss();
    }
  };

  return {
    offsetY,
    bind: {
      onTouchStart: (e) => {
        if (e.touches?.[0]) start(e.touches[0].clientY);
      },
      onTouchMove: (e) => {
        if (e.touches?.[0]) move(e.touches[0].clientY);
      },
      onTouchEnd: (e) => {
        end(e.changedTouches?.[0]?.clientY);
      },
      onTouchCancel: reset,
      onPointerDown: (e) => {
        if (e.pointerType === "mouse") start(e.clientY);
      },
      onPointerMove: (e) => {
        if (e.pointerType === "mouse" && startYRef.current !== null) {
          move(e.clientY);
        }
      },
      onPointerUp: (e) => {
        if (e.pointerType === "mouse") end(e.clientY);
      },
      onPointerCancel: reset,
    },
  };
}
import catthrowcard from "../assets/imgs/catthrowcard.png";

// Clean bespoke SVG Icons
const Icons = {
  Utensils: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  ),
  Search: () => (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Bag: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  ),
  Bell: () => (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  Check: () => (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Flame: () => (
    <svg
      className="h-4 w-4 text-rose-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.527.82-1.127 2.18-1.574 3.28-.458 1.127-.796 2.083-1.077 2.76A8.04 8.04 0 017 5.6a1 1 0 00-1.632-.782 8.003 8.003 0 00-3.328 6.07C2 15.362 5.582 19 10 19s8-3.638 8-8.112a8.045 8.045 0 00-1.89-5.187 1 1 0 00-1.423-.102c-.31.282-.596.586-.856.912-.663.83-1.066 1.34-1.436 1.34-.37 0-.773-.51-1.436-1.34a17.29 17.29 0 01-.564-.958z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Star: () => (
    <svg
      className="h-4 w-4 text-amber-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  Close: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
};

const STAGE_PROGRESS = {
  new: {
    label: "Received by Kitchen",
    step: 1,
    color: "text-blue-600",
    bg: "bg-blue-600",
  },
  preparing: {
    label: "Chef is Cooking",
    step: 2,
    color: "text-amber-600",
    bg: "bg-amber-600",
  },
  ready: {
    label: "Ready for Service",
    step: 3,
    color: "text-emerald-600",
    bg: "bg-emerald-600",
  },
  served: {
    label: "Served to Table",
    step: 4,
    color: "text-stone-600",
    bg: "bg-stone-600",
  },
};

function getItemPreferenceConfig(dish) {
  if (!dish) {
    return {
      type: "savory",
      label: "Spice Level Preference",
      options: [
        "Non-Spicy",
        "Mild Spice",
        "Medium Spice 🔥",
        "Extra Spicy 🔥🔥",
      ],
    };
  }

  const cat = (dish.category || "").toLowerCase();
  const name = (dish.name || "").toLowerCase();

  // 1. Drinks / Beverages (Ice & Sweetness levels)
  if (
    cat.includes("drink") ||
    cat.includes("beverage") ||
    cat.includes("coffee") ||
    cat.includes("tea") ||
    name.includes("latte") ||
    name.includes("brew") ||
    name.includes("fizz") ||
    name.includes("tea") ||
    name.includes("sparkler") ||
    name.includes("lemonade") ||
    name.includes("smoothie") ||
    name.includes("water")
  ) {
    const isHotDrink = name.includes("hot") || name.includes("espresso");
    return {
      type: "drink",
      label: "Drink Preferences",
      iceOptions: isHotDrink
        ? ["Served Hot", "Warm", "Add Ice Cubes"]
        : ["Regular Ice", "Less Ice", "No Ice", "Extra Ice"],
      sweetOptions: [
        "100% Normal",
  "50% Half Sweet",
  "30% Less Sweet",
  "0% Unsweetened",
      ],
    };
  }

  // 2. Steaks & Prime Beef Cuts (Meat Doneness)
  if (
    name.includes("steak") ||
    name.includes("ribeye") ||
    name.includes("wagyu") ||
    name.includes("sirloin") ||
    name.includes("tenderloin") ||
    name.includes("filet") ||
    name.includes("angus") ||
    name.includes("beef") ||
    name.includes("burger")
  ) {
    return {
      type: "steak",
      label: "Meat Doneness Preference",
      options: [
        "Medium Rare (Chef Pick)",
        "Rare",
        "Medium",
        "Medium Well",
        "Well Done",
      ],
    };
  }

  // 3. Desserts & Sweets (Serving style & temperature)
  if (
    cat.includes("dessert") ||
    cat.includes("sweet") ||
    name.includes("cake") ||
    name.includes("tiramisu") ||
    name.includes("brûlée") ||
    name.includes("cheesecake") ||
    name.includes("churros") ||
    name.includes("tart") ||
    name.includes("gelato") ||
    name.includes("ice cream")
  ) {
    return {
      type: "dessert",
      label: "Serving Style Preference",
      options: [
        "Standard Serving",
        "Extra Sauce / Drizzle",
        "Less Sweet",
        "Serve Warm",
        "Serve Chilled",
      ],
    };
  }

  // 4. Starters, Sides & Appetizers (Preparation & Dressing)
  if (
    cat.includes("starter") ||
    cat.includes("side") ||
    cat.includes("appetizer") ||
    name.includes("fries") ||
    name.includes("salad") ||
    name.includes("wings") ||
    name.includes("calamari") ||
    name.includes("prawns") ||
    name.includes("arancini") ||
    name.includes("soup") ||
    name.includes("bread") ||
    name.includes("asparagus") ||
    name.includes("rice") ||
    name.includes("mash")
  ) {
    return {
      type: "side",
      label: "Preparation Preference",
      options: [
        "Standard",
        "Sauce / Dressing on Side",
        "Extra Crispy",
        "Less Salt",
      ],
    };
  }

  // 5. Savory Mains, Pasta, Pizza, Rice & Bowls (Spice Level)
  return {
    type: "savory",
    label: "Spice Level Preference",
    options: ["Non-Spicy", "Mild Spice", "Medium Spice 🔥", "Extra Spicy 🔥🔥"],
  };
}

function getDishCulinaryDetails(dish) {
  if (!dish) return null;
  const cat = (dish.category || "").toLowerCase();
  const name = (dish.name || "").toLowerCase();

  const isDrink =
    cat.includes("drink") ||
    cat.includes("beverage") ||
    cat.includes("coffee") ||
    cat.includes("tea") ||
    name.includes("mocktail") ||
    name.includes("cocktail") ||
    name.includes("juice") ||
    name.includes("latte") ||
    name.includes("fizz") ||
    name.includes("sparkler") ||
    name.includes("smoothie");

  const isDessert =
    cat.includes("dessert") ||
    cat.includes("sweet") ||
    cat.includes("cake") ||
    name.includes("cake") ||
    name.includes("ice cream") ||
    name.includes("sorbet") ||
    name.includes("chocolate") ||
    name.includes("creme") ||
    name.includes("tart");

  if (isDrink) {
    return {
      type: "drink",
      badges: [
        "🍹 House Crafted",
        "🧊 Freshly Poured",
        "🌿 Natural Botanicals",
      ],
      sensoryTitle: "Flavor & Sensory Notes",
      sensoryTags: ["Crisp & Refreshing", "Citrus Botanicals", "Velvety Sip"],
      chefNote:
        "House-crafted artisan beverage blended with premium ingredients.",
    };
  }

  if (isDessert) {
    return {
      type: "dessert",
      badges: [
        "🍰 Artisan Pastry",
        "✨ Freshly Baked Daily",
        "🍓 Fine Accents",
      ],
      sensoryTitle: "Tasting Profile",
      sensoryTags: ["Rich & Velvety", "Balanced Sweetness", "Gourmet Finish"],
      chefNote:
        "Delicately prepared by our pastry team using artisanal techniques.",
    };
  }

  return {
    type: "savory",
    badges: [
      "👨‍🍳 Chef Curated",
      "🔥 Cooked Fresh to Order",
      "🍽️ Fine Selection",
    ],
    sensoryTitle: "Culinary Highlights",
    sensoryTags: ["Umami Rich", "Fresh Produce", "Signature Seasoning"],
    chefNote:
      "Prepared fresh upon order in our kitchen with premium culinary ingredients.",
  };
}

export default function Customer() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [tableInfo, setTableInfo] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invalid, setInvalid] = useState(false);
  const [sessionSettled, setSessionSettled] = useState(false);
  const [settledTable, setSettledTable] = useState(null);
  const [settledReceipt, setSettledReceipt] = useState(null);
  const [showSettledReceipt, setShowSettledReceipt] = useState(false);
  const receiptAutoOpenedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  // Welcoming splash loading experience
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(15);
  const [splashStatus, setSplashStatus] = useState("Connecting to Table...");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setSplashProgress(45);
      setSplashStatus("Setting table dining experience...");
    }, 500);
    const t2 = setTimeout(() => {
      setSplashProgress(80);
      setSplashStatus("Curating today's fresh culinary menu...");
    }, 1100);
    const t3 = setTimeout(() => {
      setSplashProgress(100);
      setSplashStatus("Ready to dine");
    }, 1800);
    const t4 = setTimeout(() => {
      setShowSplash(false);
    }, 2300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Navigation
  const [tab, setTab] = useState("menu"); // 'menu' | 'orders'

  // Filtering & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart state: { [id]: { qty: number, notes: string, spice: string } }
  const [cart, setCart] = useState({});
  const [orderLevelNote, setOrderLevelNote] = useState("");

  // Modals & Drawers
  const [activeItemModal, setActiveItemModal] = useState(null);
  const [exclusivePromptDish, setExclusivePromptDish] = useState(null);

  // Preference customization modal state
  const [customPrefIce, setCustomPrefIce] = useState("");
  const [customPrefSweet, setCustomPrefSweet] = useState("");
  const [customPrefOption, setCustomPrefOption] = useState("");
  const [customPrefNotes, setCustomPrefNotes] = useState("");
  const [customPrefQty, setCustomPrefQty] = useState(1);
  const [itemAddedToast, setItemAddedToast] = useState(null);

  // Responsive Bottom Sheet Drag / Pull Handle Bar State
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const dragStartYRef = useRef(0);
  const currentDeltaRef = useRef(0);

  const handleSheetTouchStart = (e) => {
    setIsDraggingSheet(true);
    dragStartYRef.current = e.touches[0].clientY;
    currentDeltaRef.current = 0;
  };

  const handleSheetTouchMove = (e) => {
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - dragStartYRef.current;
    currentDeltaRef.current = deltaY;
    if (deltaY < 0) {
      setSheetDragY(deltaY * 0.4);
    } else {
      setSheetDragY(deltaY);
    }
  };

  const handleSheetTouchEnd = () => {
    setIsDraggingSheet(false);
    const delta = currentDeltaRef.current;
    if (delta > 115) {
      setActiveItemModal(null);
      setSheetExpanded(false);
    } else if (delta < -30) {
      setSheetExpanded(true);
    } else if (delta > 35 && sheetExpanded) {
      setSheetExpanded(false);
    }
    setSheetDragY(0);
    currentDeltaRef.current = 0;
  };

  const handleSheetMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSheet(true);
    const startY = e.clientY;
    dragStartYRef.current = startY;
    currentDeltaRef.current = 0;

    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDeltaRef.current = deltaY;
      if (deltaY < 0) {
        setSheetDragY(deltaY * 0.4);
      } else {
        setSheetDragY(deltaY);
      }
    };

    const onMouseUp = (upEvent) => {
      setIsDraggingSheet(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      const delta = upEvent.clientY - startY;
      if (delta > 115) {
        setActiveItemModal(null);
        setSheetExpanded(false);
      } else if (delta < -30) {
        setSheetExpanded(true);
      } else if (delta > 35 && sheetExpanded) {
        setSheetExpanded(false);
      }
      setSheetDragY(0);
      currentDeltaRef.current = 0;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleHandleBarClick = () => {
    if (Math.abs(currentDeltaRef.current) < 5) {
      setSheetExpanded((prev) => !prev);
    }
  };

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [showBillConfirmModal, setShowBillConfirmModal] = useState(false);

  // Membership & Rewards State for Customer
  const [showMemberModal, setShowMemberModal] = useState(false);
  const memberModalBodyRef = useRef(null);

  useEffect(() => {
    if (!showMemberModal) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [showMemberModal]);

  const [activeMemberTab, setActiveMemberTab] = useState("profile"); // "profile" | "prive" | "rewards" | "history"
  const [customerRewardsData, setCustomerRewardsData] = useState(null);
  const [customerTxData, setCustomerTxData] = useState([]);
  const [loyaltyActionLoading, setLoyaltyActionLoading] = useState(false);
  const [memberNumberInput, setMemberNumberInput] = useState(
    () => localStorage.getItem("mols_customer_member_number") || "",
  );
  const [memberPasswordInput, setMemberPasswordInput] = useState("");
  const [memberData, setMemberData] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [showRegisterInCustomer, setShowRegisterInCustomer] = useState(false);
  const [customerRegisterForm, setCustomerRegisterForm] = useState({
    name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    password: "",
  });
  const [customerRegisterLoading, setCustomerRegisterLoading] = useState(false);

  useEffect(() => {
    if (memberModalBodyRef.current) {
      memberModalBodyRef.current.scrollTop = 0;
    }
  }, [memberData?.id]);

  const fetchCustomerLoyaltyDetails = useCallback(async (customerId) => {
    if (!customerId) return;
    try {
      const [rw, tx] = await Promise.all([
        api(`/customers/${customerId}/rewards`),
        api(`/customers/${customerId}/transactions`),
      ]);
      setCustomerRewardsData(rw);
      setCustomerTxData(tx?.transactions || []);
    } catch (err) {
      console.warn("Could not load customer loyalty details:", err);
    }
  }, []);

  useEffect(() => {
    if (memberData?.id && showMemberModal) {
      fetchCustomerLoyaltyDetails(memberData.id);
    }
  }, [memberData?.id, showMemberModal, fetchCustomerLoyaltyDetails]);

  const handleRedeemReward = async (rewardId) => {
    if (!memberData?.id) return;
    setLoyaltyActionLoading(true);
    try {
      const res = await api(`/customers/${memberData.id}/redeem`, {
        method: "POST",
        body: {
          reward_id: rewardId,
          token: token,
          table_number: tableInfo?.table,
        },
      });
      alert(res.message || "Reward redeemed successfully!");
      const updated = await api(`/customers/${memberData.id}`);
      setMemberData(updated);
      fetchCustomerLoyaltyDetails(memberData.id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to redeem reward.");
    } finally {
      setLoyaltyActionLoading(false);
    }
  };

  const handleSubscribeMaisonPrive = async () => {
    if (!memberData?.id) return;
    if (
      !window.confirm(
        "Join Maison Privé for $49.99/year to enjoy VIP table reservations, complimentary welcome drink, birthday dessert & seasonal menus?",
      )
    ) {
      return;
    }
    setLoyaltyActionLoading(true);
    try {
      const res = await api(`/memberships/subscribe`, {
        method: "POST",
        body: { customer_id: memberData.id, amount_paid: 49.99 },
      });
      alert(res.message || "Welcome to Maison Privé!");
      const updated = await api(`/customers/${memberData.id}`);
      setMemberData(updated);
      fetchCustomerLoyaltyDetails(memberData.id);
    } catch (err) {
      alert(err.message || "Failed to subscribe to Maison Privé.");
    } finally {
      setLoyaltyActionLoading(false);
    }
  };

  // Verify member credentials requiring BOTH membership number/phone AND password
  const verifyMember = useCallback(
    async (numToVerify, passToVerify) => {
      const targetNum = numToVerify || memberNumberInput;
      const targetPass =
        passToVerify !== undefined ? passToVerify : memberPasswordInput;

      if (!targetNum || !targetNum.trim()) {
        setMemberError(
          "Please enter your username, phone number, or membership #.",
        );
        return null;
      }
      if (!targetPass || !targetPass.trim()) {
        setMemberError("Please enter your membership password or PIN.");
        return null;
      }

      setMemberLoading(true);
      setMemberError("");
      try {
        const res = await api("/members/verify", {
          method: "POST",
          body: {
            number: targetNum.trim(),
            password: targetPass.trim(),
          },
        });
        const member = res.member || res;
        setMemberData(member);
        localStorage.setItem("mols_customer_member_number", targetNum.trim());
        localStorage.setItem("mols_customer_member_phone", member.phone);
        setMemberPasswordInput("");

        // Auto-sync customer membership to cashier POS for this table session
        if (token && member?.id) {
          try {
            await api(`/tables/${token}/link-member`, {
              method: "POST",
              body: { customer_id: member.id },
            });
          } catch (linkErr) {
            console.warn("Table member auto-sync warning:", linkErr);
          }
        }

        return member;
      } catch (err) {
        setMemberError(
          err.message ||
            "Invalid membership number or password. Please try again.",
        );
        setMemberData(null);
        return null;
      } finally {
        setMemberLoading(false);
      }
    },
    [memberNumberInput, memberPasswordInput],
  );

  const handleCustomerRegister = async (e) => {
    if (e) e.preventDefault();
    if (!customerRegisterForm.name || !customerRegisterForm.phone) {
      alert("Please provide both name and phone number.");
      return;
    }
    if (
      !customerRegisterForm.password ||
      customerRegisterForm.password.length < 4
    ) {
      alert("Please choose a password or PIN with at least 4 characters.");
      return;
    }
    setCustomerRegisterLoading(true);
    try {
      const res = await api("/members/register", {
        method: "POST",
        body: customerRegisterForm,
      });
      if (res?.member) {
        setMemberData(res.member);
        setMemberNumberInput(res.member.phone);
        localStorage.setItem("mols_customer_member_number", res.member.phone);
        localStorage.setItem("mols_customer_member_phone", res.member.phone);
        setShowRegisterInCustomer(false);
        setCustomerRegisterForm({
          name: "",
          phone: "",
          email: "",
          date_of_birth: "",
          password: "",
        });
        setMemberError("");

        // Auto-sync newly registered customer to cashier POS for this table session
        if (token && res.member?.id) {
          try {
            await api(`/tables/${token}/link-member`, {
              method: "POST",
              body: { customer_id: res.member.id },
            });
          } catch (linkErr) {
            console.warn("Table member auto-sync warning:", linkErr);
          }
        }
        if (exclusivePromptDish) {
          addToCartDirect(exclusivePromptDish, res.member);
          alert(
            `Welcome to MOLS MAISON, ${res.member.name}! "${exclusivePromptDish.name}" has been unlocked and added to your order.`,
          );
          setExclusivePromptDish(null);
          setShowMemberModal(false);
        } else {
          alert(
            res.message ||
              "Welcome to MOLS MAISON Rewards! 50 bonus points added.",
          );
        }
      }
    } catch (err) {
      alert(err.message || "Failed to register membership.");
    } finally {
      setCustomerRegisterLoading(false);
    }
  };

  // Alerts & Submitting states
  const [serviceAlert, setServiceAlert] = useState("");
  const serviceAlertTimerRef = useRef(null);
  const [orderSuccessToast, setOrderSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dismissServiceAlert = useCallback(() => {
    if (serviceAlertTimerRef.current) {
      clearTimeout(serviceAlertTimerRef.current);
      serviceAlertTimerRef.current = null;
    }
    setServiceAlert("");
  }, []);

  const serviceToastSwipe = useSwipeUpDismiss(dismissServiceAlert, 28);
  const orderToastSwipe = useSwipeUpDismiss(
    () => setOrderSuccessToast(false),
    28,
  );
  const callStaffSwipe = useSwipeUpDismiss(
    () => setShowCallStaffModal(false),
    55,
  );
  const billConfirmSwipe = useSwipeUpDismiss(
    () => setShowBillConfirmModal(false),
    55,
  );

  // Load table, menu, and orders
  const loadData = useCallback(async () => {
    try {
      const [t, m, o] = await Promise.all([
        api(`/tables/${token}`),
        api("/menu"),
        api(`/tables/${token}/orders`),
      ]);

      if (t?.settled) {
        setSessionSettled(true);
        if (t.table) setSettledTable(t.table);
        if (t.receipt) {
          setSettledReceipt(t.receipt);
          if (!receiptAutoOpenedRef.current) {
            receiptAutoOpenedRef.current = true;
            setShowSettledReceipt(true);
          }
        }
        setCart({});
        setActiveItemModal(null);
        setShowCartDrawer(false);
        setShowConfirmModal(false);
        setShowCallStaffModal(false);
        setShowMemberModal(false);
        setLoading(false);
        setShowSplash(false);
        // Auto-logout from membership for this settled session
        setMemberData(null);
        setMemberNumberInput("");
        setMemberPasswordInput("");
        localStorage.removeItem("mols_customer_member_number");
        localStorage.removeItem("mols_customer_member_phone");
        return;
      }

      setTableInfo(t);
      setMenu(m || []);
      setOrders(o || []);
      setSessionSettled(false);
      setSettledReceipt(null);
      setShowSettledReceipt(false);
      receiptAutoOpenedRef.current = false;
    } catch (err) {
      if (err.status === 403 || err.data?.settled) {
        setSessionSettled(true);
        if (err.data?.table) setSettledTable(err.data.table);
        if (err.data?.receipt) {
          setSettledReceipt(err.data.receipt);
          if (!receiptAutoOpenedRef.current) {
            receiptAutoOpenedRef.current = true;
            setShowSettledReceipt(true);
          }
        }
        setCart({});
        setActiveItemModal(null);
        setShowCartDrawer(false);
        setShowConfirmModal(false);
        setShowCallStaffModal(false);
        setShowMemberModal(false);
        setShowSplash(false);
        // Auto-logout from membership for this settled session
        setMemberData(null);
        setMemberNumberInput("");
        setMemberPasswordInput("");
        localStorage.removeItem("mols_customer_member_number");
        localStorage.removeItem("mols_customer_member_phone");
      } else if (err.status === 404) {
        setInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLive(false, loadData);

  const openDishCustomizer = (dish) => {
    if (!dish) return;

    const config = getItemPreferenceConfig(dish);
    const existing = cart[dish.id];

    if (existing && existing.qty > 0) {
      setCustomPrefQty(existing.qty);
      setCustomPrefNotes(existing.notes || "");
      if (config.type === "drink") {
        const { ice, sweet } = getDrinkPreferences(existing.spice, config);
        setCustomPrefIce(ice);
        setCustomPrefSweet(sweet);
      } else {
        setCustomPrefOption(existing.spice || config.options[0]);
      }
    } else {
      setCustomPrefQty(1);
      setCustomPrefNotes("");
      if (config.type === "drink") {
        setCustomPrefIce(config.iceOptions[0]);
        setCustomPrefSweet(config.sweetOptions[0]);
      } else {
        setCustomPrefOption(config.options[0]);
      }
    }

    setSheetDragY(0);
    setIsDraggingSheet(false);
    setSheetExpanded(false);
    currentDeltaRef.current = 0;
    setActiveItemModal(dish);
  };

  const handleSaveCustomization = () => {
    if (!activeItemModal) return;
    const config = getItemPreferenceConfig(activeItemModal);
    const finalPref =
      config.type === "drink"
        ? `${customPrefIce}, ${customPrefSweet}`
        : customPrefOption;

    if (customPrefQty <= 0) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[activeItemModal.id];
        return next;
      });
    } else {
      setCart((prev) => ({
        ...prev,
        [activeItemModal.id]: {
          qty: customPrefQty,
          spice: finalPref,
          notes: customPrefNotes.trim(),
        },
      }));
    }

    setItemAddedToast({
      name: activeItemModal.name,
      spice: finalPref,
      qty: customPrefQty,
    });
    setTimeout(() => {
      setItemAddedToast(null);
    }, 4000);

    setActiveItemModal(null);
  };

  const addToCartDirect = openDishCustomizer;
  const openDishDetails = openDishCustomizer;

  const adjustQty = (id, delta) => {
    const dish = menu.find((m) => m.id === id);

    setCart((prev) => {
      const current = prev[id];
      if (!current && delta > 0) {
        const config = getItemPreferenceConfig(dish);
        const defaultPref =
          config.type === "drink"
            ? `${config.iceOptions[0]}, ${config.sweetOptions[0]}`
            : config.options[0];
        return {
          ...prev,
          [id]: { qty: delta, spice: defaultPref, notes: "" },
        };
      }
      const newQty = Math.max(0, (current?.qty || 0) + delta);
      if (newQty === 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...current, qty: newQty } };
    });
  };

  const updateItemPreference = (dishId, newPref) => {
    setCart((prev) => {
      if (!prev[dishId]) return prev;
      return {
        ...prev,
        [dishId]: { ...prev[dishId], spice: newPref },
      };
    });
  };

  const updateItemNotes = (dishId, notes) => {
    setCart((prev) => {
      if (!prev[dishId]) return prev;
      return {
        ...prev,
        [dishId]: { ...prev[dishId], notes },
      };
    });
  };

  const getDrinkPreferences = (spiceStr, config) => {
    const parts = (spiceStr || "").split(",").map((s) => s.trim());
    const ice = config.iceOptions.includes(parts[0])
      ? parts[0]
      : config.iceOptions[0];
    const sweet = config.sweetOptions.includes(parts[1])
      ? parts[1]
      : config.sweetOptions[0];
    return { ice, sweet };
  };

  const updateDrinkIce = (dishId, newIce, currentSpice, config) => {
    const { sweet } = getDrinkPreferences(currentSpice, config);
    updateItemPreference(dishId, `${newIce}, ${sweet}`);
  };

  const updateDrinkSweet = (dishId, newSweet, currentSpice, config) => {
    const { ice } = getDrinkPreferences(currentSpice, config);
    updateItemPreference(dishId, `${ice}, ${newSweet}`);
  };

  const callStaff = async (type, notes = "") => {
    try {
      await api(`/tables/${token}/call-waiter`, {
        method: "POST",
        body: { type, notes },
      });
      setShowCallStaffModal(false);
      if (type === "bill") {
        setServiceAlert(
          `Table bill requested! Our staff will bring your check and wireless terminal to Table #${tableInfo?.table || ""} shortly.`,
        );
      } else {
        setServiceAlert(
          `Staff notified: ${type.toUpperCase()}. We will assist your table shortly.`,
        );
      }
      if (serviceAlertTimerRef.current) {
        clearTimeout(serviceAlertTimerRef.current);
      }
      serviceAlertTimerRef.current = setTimeout(() => {
        setServiceAlert("");
        serviceAlertTimerRef.current = null;
      }, 5500);
    } catch (e) {
      if (e.status === 403) {
        setSessionSettled(true);
        setShowCallStaffModal(false);
        setMemberData(null);
        setMemberNumberInput("");
        setMemberPasswordInput("");
        localStorage.removeItem("mols_customer_member_number");
        localStorage.removeItem("mols_customer_member_phone");
        loadData();
      }
      alert(e.message || "Failed to call staff");
    }
  };

  const submitOrder = async () => {
    if (isSubmitting || Object.keys(cart).length === 0) return;
    setIsSubmitting(true);
    try {
      const itemsPayload = Object.entries(cart)
        .filter(([, v]) => v.qty > 0)
        .map(([id, v]) => {
          const dishNotesParts = [];
          if (v.spice) dishNotesParts.push(`[${v.spice}]`);
          if (v.notes) dishNotesParts.push(v.notes);
          return {
            id: Number(id),
            qty: v.qty,
            notes: dishNotesParts.join(" ") || null,
          };
        });

      await api("/orders", {
        method: "POST",
        body: {
          token,
          notes: orderLevelNote.trim() || null,
          member_phone:
            memberData?.phone ||
            localStorage.getItem("mols_customer_member_phone") ||
            null,
          member_id: memberData?.id || null,
          items: itemsPayload,
        },
      });

      setCart({});
      setOrderLevelNote("");
      setShowConfirmModal(false);
      setShowCartDrawer(false);
      setOrderSuccessToast(true);
      setTab("orders");
      loadData();
      setTimeout(() => setOrderSuccessToast(false), 5000);
    } catch (err) {
      if (err.status === 403) {
        setSessionSettled(true);
        setCart({});
        setShowConfirmModal(false);
        setShowCartDrawer(false);
        setMemberData(null);
        setMemberNumberInput("");
        setMemberPasswordInput("");
        localStorage.removeItem("mols_customer_member_number");
        localStorage.removeItem("mols_customer_member_phone");
        loadData();
      }
      alert(err.message || "Order failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = useMemo(() => {
    return [...new Set(menu.map((m) => m.category).filter(Boolean))];
  }, [menu]);

  const filteredDishes = useMemo(() => {
    return menu.filter((item) => {
      // Exclude items that do not have an image
      if (!item.image_url && !item.image_path) return false;

      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === "top_sale") return item.is_top_sale;
      if (selectedCategory === "signature") return item.is_signature;
      if (selectedCategory === "promo") return item.is_member_exclusive;
      if (selectedCategory !== "all") return item.category === selectedCategory;

      return true;
    });
  }, [menu, search, selectedCategory]);

  const cartTotalQty = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const cartTotalPrice = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, val]) => {
      const dish = menu.find((m) => m.id === Number(id));
      if (!dish) return sum;
      return sum + dish.price * val.qty;
    }, 0);
  }, [cart, menu]);

  const totalBillAllRounds = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const totalRedeemedDiscounts = useMemo(() => {
    return (tableInfo?.redeemed_discounts || []).reduce(
      (sum, d) => sum + (d.discount_amount || 0),
      0,
    );
  }, [tableInfo?.redeemed_discounts]);

  const netSessionBalance = useMemo(() => {
    return Math.max(0, totalBillAllRounds - totalRedeemedDiscounts);
  }, [totalBillAllRounds, totalRedeemedDiscounts]);

  if (sessionSettled) {
    const tableNum = settledTable || tableInfo?.table;
    return (
      <div className="grid min-h-screen place-items-center bg-warm-100/70 p-4 sm:p-6 text-center font-sans">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-9 shadow-card border border-warm-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-xs">
            <svg
              className="h-9 w-9"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-0.5 text-xs font-semibold text-emerald-900 border border-emerald-200">
            <span>Bill Settled · Paid</span>
          </div>

          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-warm-900">
            Dining Session Closed
          </h1>

          <p className="mt-2 text-sm text-warm-600 leading-relaxed">
            Thank you for dining with us at{" "}
            <span className="font-logo text-base font-semibold tracking-wider text-warm-900">
              MOLS MAISON
            </span>
            {tableNum ? ` at Table #${tableNum}` : ""}! The bill for your table
            has been settled and your dining loyalty points have been credited
            to your account.
          </p>

          {settledReceipt && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSettledReceipt(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-300 bg-warm-50 px-4 py-2.5 text-xs font-bold text-warm-800 hover:bg-warm-100 transition shadow-2xs"
              >
                <span>🧾</span>
                <span>View Your Receipt</span>
              </button>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-amber-50/80 p-4 text-xs text-amber-900 border border-amber-200/80 text-left space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <span className="text-sm">🔒</span>
              <span>Account Signed Out For Security</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              You have been automatically signed out of your membership account
              for this table session to keep your account secure.
            </p>
          </div>

          <div className="mt-6">
            <div className="rounded-2xl border border-dashed border-warm-300 bg-warm-50/80 p-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-800 mb-2">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-xs text-warm-900">
                Rescan Required to Order Again
              </p>
              <p className="text-[11px] text-warm-500 mt-1 leading-relaxed">
                Aim your smartphone camera at the table QR code to start a fresh
                dining session and re-login.
              </p>
              {tableNum && (
                <div className="mt-3">
                  <a
                    href={`/scan/${tableNum}`}
                    className="inline-flex items-center justify-center rounded-xl bg-brand text-white font-display text-xs font-bold px-4 py-2 hover:bg-brand-dark transition shadow-xs"
                  >
                    Rescan Table #{tableNum}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settled Receipt Popup Modal for Customer */}
        {showSettledReceipt && settledReceipt && (
          <div
            onClick={() => setShowSettledReceipt(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-warm-200 flex flex-col max-h-[90dvh] overflow-y-auto text-left"
            >
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
                    CAMBODIA
                  </p>
                  <div className="my-1 text-[9px] tracking-[0.3em]">
                    ✦ · ✦ · ✦
                  </div>
                  <p className="text-[9px]">Toul Kork, Phnom Penh</p>
                  <p className="text-[9px]">Cambodia · Tel: +855 67 67 67</p>
                </div>

                {/* Receipt Information */}
                <div className="py-2 border-b border-dashed border-black space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>RECEIPT</span>
                    <span>#{settledReceipt.receipt_no || "0001"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Table Number</span>
                    <span>#{settledReceipt.table || tableNum}</span>
                  </div>
                  {settledReceipt.customer_name && (
                    <div className="flex justify-between">
                      <span>Guest</span>
                      <span className="font-semibold">
                        {settledReceipt.customer_name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span>
                      {settledReceipt.date
                        ? new Date(settledReceipt.date).toLocaleString()
                        : new Date().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="py-2 space-y-1.5 border-b border-dashed border-black">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider pb-0.5">
                    <span>Item Description</span>
                    <span>Amount</span>
                  </div>
                  {(settledReceipt.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start gap-2 text-[11px]"
                    >
                      <span className="flex-1 break-words">
                        {item.qty} × {item.name}
                      </span>
                      <span className="shrink-0 font-medium">
                        {money((item.price || 0) * (item.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Payment Summary */}
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(settledReceipt.subtotal)}</span>
                  </div>

                  {Number(settledReceipt.discount_amount) > 0 && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <span>Discount</span>
                        <span className="shrink-0">
                          -{money(settledReceipt.discount_amount)}
                        </span>
                      </div>
                      {settledReceipt.discount_note && (
                        <p className="text-[10px] leading-snug break-words">
                          ({settledReceipt.discount_note})
                        </p>
                      )}
                    </div>
                  )}

                  {settledReceipt.member && (
                    <div className="py-1 border-t border-dashed border-black my-1 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>✦ Member</span>
                        <span>{settledReceipt.member.tier} Tier</span>
                      </div>
                      {settledReceipt.member.is_prive && (
                        <div className="flex justify-between text-[10px] font-bold text-black">
                          <span>👑 Annual Plan</span>
                          <span>Maison Privé</span>
                        </div>
                      )}
                      {settledReceipt.member.tier_upgraded && (
                        <div className="text-[10px] font-bold text-center py-0.5 border border-dashed border-black rounded my-0.5">
                          ★ TIER UPGRADE: Elevated to{" "}
                          {settledReceipt.member.tier}! ★
                        </div>
                      )}
                      <div className="flex justify-between text-[10px]">
                        <span>Points Earned Today</span>
                        <span className="font-bold">
                          +{settledReceipt.member.points_earned || 0} pts
                        </span>
                      </div>
                      {settledReceipt.member.points_redeemed > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span>Points Redeemed Today</span>
                          <span className="font-bold">
                            -{settledReceipt.member.points_redeemed} pts
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px]">
                        <span>Current Total Balance</span>
                        <span className="font-bold">
                          {settledReceipt.member.points_balance} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="border-y-2 border-double border-black py-2">
                  <div className="flex justify-between items-center font-black text-xs sm:text-sm">
                    <span>TOTAL PAID</span>
                    <span>{money(settledReceipt.final_total)}</span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="py-1.5 space-y-1 text-[11px] border-b border-dashed border-black">
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span className="uppercase font-bold">
                      {settledReceipt.payment_method || "cash"}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Payment Status</span>
                    <span>✓ PAID</span>
                  </div>
                  {(settledReceipt.payment_method || "cash") === "cash" && (
                    <>
                      <div className="flex justify-between">
                        <span>Amount Tendered</span>
                        <span>{money(settledReceipt.amount_tendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Change Returned</span>
                        <span>{money(settledReceipt.change_due)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center text-[9px] pt-1 space-y-0.5">
                  <p className="font-bold">Thank You for Dining At MOLS MAISON</p>
                  <p>We look forward to welcoming you again.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5 pt-3 border-t border-warm-100 print:hidden">
                <button
                  type="button"
                  onClick={() => printThermalReceipt("printable-receipt")}
                  className="flex-1 rounded-xl border border-warm-300 bg-white py-2.5 text-xs sm:text-sm font-bold text-warm-800 hover:bg-warm-100 transition"
                >
                  Save / Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettledReceipt(false)}
                  className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-dark transition"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-100 p-4 sm:p-6 text-center font-sans">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-8 shadow-card border border-warm-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
            <Icons.Utensils />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-warm-900">
            Connect to Dining Table
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-warm-600 leading-relaxed">
            Your previous session link has expired. Tap your table number below
            to start viewing the menu and placing orders:
          </p>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <a
                key={num}
                href={`/scan/${num}`}
                className="rounded-xl border border-warm-200 bg-warm-50 py-2.5 text-xs font-bold text-warm-800 hover:bg-brand hover:text-white hover:border-brand transition shadow-xs text-center"
              >
                #{num}
              </a>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-warm-100">
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-mono text-warm-500 hover:text-warm-800 underline cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSplash || loading) {
    return (
      <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-white text-warm-900 select-none animate-in fade-in duration-300">
        {/* Ambient High-End Restaurant Background Artwork with White & Red Style */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80"
            alt="MOLS MAISON Ambience"
            className="h-full w-full object-cover opacity-[0.08] scale-105"
          />
          {/* Soft White Overlays */}
          <div className="absolute inset-0 bg-white/90" />
        </div>

        {/* Top Header Tag */}
        <div className="relative z-10 w-full px-6 pt-8 flex items-center justify-between text-xs tracking-widest font-mono uppercase">
          <span className="flex items-center gap-1.5 font-semibold text-brand">
            <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
            <span>Smart QR Dining</span>
          </span>
          {tableInfo?.table && (
            <span className="rounded-full bg-brand-50 px-3.5 py-1 text-brand font-semibold border border-brand-200 shadow-2xs">
              Table #{tableInfo.table}
            </span>
          )}
        </div>

        {/* Center Stage: Restaurant Logo & Fancy Branding (White & Red Style) */}
        <div className="relative z-10 my-auto w-full max-w-md mx-auto px-6 text-center space-y-6">
          {/* Logo Insignia Crest in Crisp White & Brand Red */}
          <div className="relative mx-auto flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-white border-2 border-brand/20 shadow-lg ring-8 ring-brand-50/80">
            <img
              src={logo}
              alt="Restaurant Logo"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-2xl"
            />
          </div>

          {/* Restaurant Title & Tagline */}
          <div className="space-y-1.5">
            <h1 className="font-logo text-4xl sm:text-5xl md:text-6xl font-normal tracking-wide text-brand">
              MOLS MAISON
            </h1>
            <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-warm-600 font-semibold">
              Five Stars Kitchen & Bistro <br />
              <span className="text-[10px] sm:text-xs normal-case tracking-wide font-normal italic">
                (Yes, There Are Five Stars. We Counted.)
              </span>
            </p>
          </div>

          {/* Table Hospitality Banner */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-brand-200/80 px-4 py-2.5 text-xs sm:text-sm text-warm-800 shadow-sm">
            <span className="text-brand font-bold">📍</span>
            <span className="font-medium">
              {tableInfo
                ? `Welcome to Table #${tableInfo.table} ${tableInfo.merged_with ? `(Merged with ${tableInfo.merged_with})` : ""}`
                : "Welcome to your table dining experience"}
            </span>
          </div>

          {/* Animated Red Progress Indicator */}
          <div className="pt-3 space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between items-center text-[11px] font-mono text-warm-600 font-medium">
              <span className="animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-ping" />
                {splashStatus}
              </span>
              <span className="font-bold text-brand">{splashProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100/70 border border-brand-200">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
                style={{ width: `${splashProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Quick Enter Button & Footer */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-8 space-y-3 text-center">
          <button
            onClick={() => setShowSplash(false)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 px-6 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-98 transition duration-150"
          >
            <span>Explore Menu &amp; Order</span>
            <span>→</span>
          </button>
          <p className="text-[11px] text-warm-500 font-mono tracking-wide">
            Tap to open menu immediately or wait to load automatically
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900 font-sans pb-36">
      {/* Toast Alert on Service Call (Swipe up or tap ✕ to dismiss) */}
      {serviceAlert && (
        <div
          {...serviceToastSwipe.bind}
          style={{
            transform: `translateY(${serviceToastSwipe.offsetY}px)`,
            opacity: Math.max(0.25, 1 + serviceToastSwipe.offsetY / 70),
          }}
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md touch-none select-none cursor-grab active:cursor-grabbing transition-transform duration-100 animate-in fade-in slide-in-from-top-4"
        >
          <div className="rounded-2xl bg-white border border-amber-200 px-4 pt-3 pb-2 text-sm font-semibold text-warm-900 shadow-floating">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                🛎️
              </span>
              <p className="flex-1 leading-snug text-warm-900">{serviceAlert}</p>
              <button
                type="button"
                onClick={dismissServiceAlert}
                className="shrink-0 rounded-full p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
                aria-label="Dismiss notification"
              >
                <Icons.Close />
              </button>
            </div>
            <div className="mt-2 flex flex-col items-center gap-0.5">
              <span className="h-1 w-9 rounded-full bg-warm-300" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification on Order Placed (Swipe up or tap ✕ to dismiss) */}
      {orderSuccessToast && (
        <div
          {...orderToastSwipe.bind}
          style={{
            transform: `translateY(${orderToastSwipe.offsetY}px)`,
            opacity: Math.max(0.25, 1 + orderToastSwipe.offsetY / 70),
          }}
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md touch-none select-none cursor-grab active:cursor-grabbing transition-transform duration-100 animate-in fade-in slide-in-from-top-4"
        >
          <div className="rounded-2xl bg-emerald-700 px-4 pt-3 pb-2 text-white shadow-floating">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icons.Check />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-bold">Order Received by Kitchen</p>
                <p className="text-emerald-100 text-xs">
                  Preparing freshly for your table. Add more dishes anytime!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderSuccessToast(false)}
                className="shrink-0 rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
                aria-label="Dismiss order toast"
              >
                <Icons.Close />
              </button>
            </div>
            <div className="mt-2 flex flex-col items-center gap-0.5">
              <span className="h-1 w-9 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      )}

      {/* Brand Header & Table Info */}
      <header className="sticky top-0 z-30 border-b border-warm-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3.5">
          {/* Brand Logo & Name (Tappable to re-view welcome screen) */}
          <button
            type="button"
            onClick={() => setShowSplash(true)}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-90 transition group cursor-pointer"
            title="View Restaurant Welcome Splash"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-warm-200/90 p-1 shadow-xs group-hover:scale-105 transition overflow-hidden">
              <img
                src={logo}
                alt="MOLS MAISON"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-logo text-xl sm:text-2xl font-normal tracking-wide text-warm-900 leading-snug truncate">
                MOLS MAISON
              </h1>
              <p className="text-xs font-medium text-warm-500 mt-1 truncate max-w-[140px] sm:max-w-xs">
                Table #{tableInfo?.table}{" "}
                {tableInfo?.merged_with
                  ? `· Merged with ${tableInfo.merged_with}`
                  : ""}
              </p>
            </div>
          </button>

          {/* Quick Actions: Call Waiter & Tab Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Membership & Rewards Button */}
            <button
              onClick={() => setShowMemberModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/90 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100 transition active:scale-95 shadow-xs"
              title="Check membership rewards and points balance"
            >
              <Icons.Star />
              <span className="hidden sm:inline">
                {memberData ? `Points: ${memberData.points}` : "Rewards"}
              </span>
              <span className="sm:hidden font-mono text-[11px]">
                {memberData ? `${memberData.points}p` : "Rewards"}
              </span>
            </button>

            <button
              onClick={() => setShowCallStaffModal(true)}
              className="flex items-center gap-2 rounded-xl border border-warm-300 bg-warm-50 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition active:scale-95 shadow-xs"
              title="Request table service"
            >
              <Icons.Bell />
              <span className="hidden sm:inline">Call Staff</span>
            </button>

            {/* Menu / Orders Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-warm-200/80 p-1 text-xs sm:text-sm font-medium">
              <button
                onClick={() => setTab("menu")}
                className={`rounded-lg sm:rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 transition ${
                  tab === "menu"
                    ? "bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold"
                    : "text-warm-700 hover:text-white hover:bg-brand active:bg-brand-dark"
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => setTab("orders")}
                className={`relative rounded-lg sm:rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 transition ${
                  tab === "orders"
                    ? "bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold"
                    : "text-warm-700 hover:text-white hover:bg-brand active:bg-brand-dark"
                }`}
              >
                Orders
                {orders.length > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold leading-normal ${
                      tab === "orders"
                        ? "bg-brand text-white ring-1 ring-white/30"
                        : "bg-brand text-white"
                    }`}
                  >
                    {orders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Category Filters (Menu tab) */}
        {tab === "menu" && (
          <div className="border-t border-warm-100 bg-white/80 backdrop-blur-xs px-4 sm:px-6 py-3 sm:py-3.5">
            <div className="mx-auto max-w-3xl space-y-3">
              {/* Search Bar with Refined Readable Font */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search dishes, drinks, ingredients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 py-2.5 pl-10 pr-9 text-sm font-normal text-warm-900 placeholder-warm-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                />
                <span className="absolute left-3.5 top-3 text-warm-400">
                  <Icons.Search />
                </span>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-2.5 text-warm-400 hover:text-warm-700"
                  >
                    <Icons.Close />
                  </button>
                )}
              </div>

              {/* Category Navigation Pills */}
              <nav className="no-scrollbar flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1 px-0.5">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs flex items-center gap-1.5 active:scale-95 ${
                    selectedCategory === "all"
                      ? "bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white font-semibold"
                      : "bg-warm-100 text-warm-700 hover:bg-brand hover:text-white active:bg-brand-dark"
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setSelectedCategory("top_sale")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                    selectedCategory === "top_sale"
                      ? "bg-rose-700 text-white hover:bg-rose-800 hover:text-white active:bg-rose-900 active:text-white font-semibold"
                      : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-brand hover:text-white hover:border-brand active:bg-brand-dark"
                  }`}
                >
                  <Icons.Flame />
                  <span>Top Sellers</span>
                </button>
                <button
                  onClick={() => setSelectedCategory("signature")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                    selectedCategory === "signature"
                      ? "bg-amber-700 text-white hover:bg-amber-800 hover:text-white active:bg-amber-900 active:text-white font-semibold"
                      : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-brand hover:text-white hover:border-brand active:bg-brand-dark"
                  }`}
                >
                  <Icons.Star />
                  <span>Chef's Choice</span>
                </button>
                <button
                  onClick={() => setSelectedCategory("promo")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                    selectedCategory === "promo"
                      ? "bg-purple-900 text-white font-semibold shadow-md"
                      : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-brand hover:text-white hover:border-brand active:bg-brand-dark"
                  }`}
                >
                  <span>✦ Member Promos</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                      selectedCategory === c
                        ? "bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white font-semibold"
                        : "bg-warm-100 text-warm-700 hover:bg-brand hover:text-white active:bg-brand-dark"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className="mx-auto max-w-3xl px-4 pt-3.5">
        {tab === "menu" ? (
          <div>
            {/* Header info */}
            <div className="mb-3 flex items-center justify-between text-xs sm:text-sm text-warm-600 font-medium">
              <span>Available dishes ({filteredDishes.length})</span>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="font-medium text-brand hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>

            {/* Empty Search Result */}
            {filteredDishes.length === 0 && (
              <div className="rounded-3xl border border-warm-200 bg-white p-10 text-center shadow-card">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-400">
                  <Icons.Search />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-warm-900">
                  No dishes match
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-warm-500">
                  Try adjusting your search terms or selecting another category.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                  className="mt-3.5 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-brand-dark transition"
                >
                  View All Menu
                </button>
              </div>
            )}

            {/* GRIDBOX MENU (Clean legible cards with zero overflow) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {filteredDishes.map((item) => {
                const inCart = cart[item.id] || {
                  qty: 0,
                  notes: "",
                  spice: "",
                };
                const imageUrl = formatImageUrl(item.image_url);

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-card transition-all duration-200 hover:shadow-soft"
                  >
                    {/* Dish Photo */}
                    <div
                      onClick={() => openDishDetails(item)}
                      className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-warm-100"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="h-full w-full items-center justify-center bg-warm-100 text-warm-400"
                        style={{ display: imageUrl ? "none" : "flex" }}
                      >
                        <Icons.Utensils />
                      </div>

                      {/* Badges Overlay */}
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        {item.is_top_sale && (
                          <span className="flex items-center gap-1 rounded-md bg-warm-900/90 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs shadow-xs">
                            <Icons.Flame />
                            <span>Top</span>
                          </span>
                        )}
                        {item.is_signature && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-600/90 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs shadow-xs">
                            <Icons.Star />
                            <span>Chef</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-medium text-warm-800 shadow-xs backdrop-blur-xs">
                        Details
                      </div>
                    </div>

                    {/* Card Content with refined text */}
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div
                        onClick={() => openDishDetails(item)}
                        className="cursor-pointer"
                      >
                        <h3 className="font-display text-sm sm:text-base font-semibold leading-snug text-warm-900 group-hover:text-brand transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-warm-500 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Price & Add Action with Zero Overflow */}
                      <div className="mt-2.5 pt-2 border-t border-warm-100 flex items-center justify-between gap-1.5 min-w-0">
                        <span className="font-mono text-sm sm:text-base font-semibold text-warm-900 truncate">
                          {money(item.price)}
                        </span>

                        {inCart.qty > 0 ? (
                          <div className="flex items-center gap-1 rounded-full bg-warm-100 p-0.5 shadow-inner shrink-0">
                            <button
                              onClick={() => adjustQty(item.id, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-warm-800 shadow-xs hover:bg-warm-100 hover:text-warm-950 active:scale-95 transition"
                            >
                              −
                            </button>
                            <span className="w-4 text-center font-mono text-xs font-semibold text-warm-900">
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => adjustQty(item.id, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-xs hover:bg-brand-dark hover:text-white active:scale-95 transition"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCartDirect(item)}
                            className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs transition active:scale-95 bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900"
                          >
                            <span>+ Order</span>
                          </button>
                        )}
                      </div>

                      {/* Custom note badge if present */}
                      {(inCart.spice || inCart.notes) && inCart.qty > 0 && (
                        <div
                          onClick={() => openDishCustomizer(item)}
                          className="mt-2 cursor-pointer rounded-lg bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-warm-700 border border-warm-200 truncate flex items-center justify-between"
                          title="Click to customize preferences"
                        >
                          <span className="truncate">
                            <span className="font-semibold text-brand">
                              Pref:
                            </span>{" "}
                            {inCart.spice} {inCart.notes}
                          </span>
                          <span className="text-[10px] text-warm-400 ml-1 shrink-0">
                            Edit →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ORDERS & BILLING TAB */
          <div className="space-y-4 w-full max-w-full">
            {/* Running Table Bill Header */}
            <div className="w-full max-w-full rounded-3xl border border-warm-200 bg-white p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-warm-500">
                  Current Session Balance
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 leading-tight">
                  {money(netSessionBalance)}
                </p>
                <div className="text-xs text-warm-500 mt-0.5">
                  Table #{tableInfo?.table} · All ordered rounds combined
                  {totalRedeemedDiscounts > 0 && (
                    <span className="block text-emerald-700 font-semibold font-mono mt-0.5">
                      Subtotal: {money(totalBillAllRounds)} · Points Vouchers: -
                      {money(totalRedeemedDiscounts)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => setTab("menu")}
                  className="flex-1 sm:flex-initial rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-95 transition text-center"
                >
                  + Add More Dishes
                </button>
                <button
                  onClick={() => setShowBillConfirmModal(true)}
                  className="flex-1 sm:flex-initial rounded-xl border border-warm-300 bg-warm-50 px-4 py-2 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition text-center"
                >
                  Request Bill
                </button>
              </div>
            </div>

            {/* Redeemed Loyalty Rewards & Discounts applied to Bill */}
            {tableInfo?.redeemed_discounts?.length > 0 && (
              <div className="w-full rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">🎁</span>
                    <div>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-emerald-950">
                        Redeemed Loyalty Rewards Applied to Bill
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Discounts will be deducted automatically from this
                        table's final payment
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-xl border border-emerald-300">
                    -{money(totalRedeemedDiscounts)}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {tableInfo.redeemed_discounts.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white/90 border border-emerald-200/90 rounded-xl px-3.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-warm-900">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-warm-500 font-mono">
                          ({d.points_redeemed || d.points} pts redeemed)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">
                        -{money(d.discount_amount || d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Ordered Tickets */}
            {orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-warm-300 bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-400">
                  <Icons.Bag />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-warm-900">
                  No active tickets
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-warm-500">
                  You haven't submitted any dishes yet. Browse the menu and
                  place your first order.
                </p>
                <button
                  onClick={() => setTab("menu")}
                  className="mt-3.5 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full max-w-full">
                {orders.map((o, idx) => {
                  const stage = STAGE_PROGRESS[o.status] || STAGE_PROGRESS.new;
                  return (
                    <div
                      key={o.id}
                      className="w-full max-w-full rounded-3xl border border-warm-200 bg-white p-5 sm:p-6 shadow-card space-y-3.5 overflow-hidden"
                    >
                      {/* Ticket Header & Progress */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-warm-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base sm:text-lg font-bold text-warm-900">
                              Round #{orders.length - idx}
                            </span>
                            {o.addon && (
                              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
                                Add-on
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-warm-500 mt-0.5">
                            {timeStr(o.ts)}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5">
                          <span
                            className={`font-display text-xs sm:text-sm font-semibold ${stage.color}`}
                          >
                            {stage.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((s) => (
                              <span
                                key={s}
                                className={`h-1.5 w-4 rounded-full ${
                                  s <= stage.step ? stage.bg : "bg-warm-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="my-3 space-y-2.5 divide-y divide-warm-50">
                        {o.items.map((it, k) => (
                          <div
                            key={k}
                            className="flex items-start justify-between gap-3 pt-2 first:pt-0 text-xs sm:text-sm"
                          >
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-baseline gap-1.5">
                                <span className="shrink-0 font-mono font-bold text-warm-600">
                                  {it.qty}×
                                </span>
                                <span className="font-semibold text-warm-900 break-words leading-snug flex items-center gap-1.5 flex-wrap">
                                  <span>{it.name}</span>
                                  {(it.name?.includes("🎁") ||
                                    it.price === 0) && (
                                    <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold leading-normal px-2 py-0.5">
                                      VIP Loyalty Reward (Free)
                                    </span>
                                  )}
                                </span>
                              </div>
                              {it.notes && (
                                <p className="mt-1 text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 break-words leading-relaxed max-w-full inline-block">
                                  {it.notes}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-right font-mono font-bold text-warm-900 whitespace-nowrap pl-1">
                              {money(it.price * it.qty)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Special instructions if any */}
                      {o.notes && (
                        <div className="mt-3 rounded-2xl bg-warm-50 p-3 text-xs text-warm-700 border border-warm-200 break-words leading-relaxed">
                          <span className="font-semibold text-warm-900">
                            Special Note:
                          </span>{" "}
                          {o.notes}
                        </div>
                      )}

                      {/* Round Subtotal */}
                      <div className="mt-3.5 flex items-center justify-between border-t border-warm-100 pt-3 text-xs sm:text-sm font-medium">
                        <span className="text-warm-500">Round Total</span>
                        <span className="font-mono text-base sm:text-lg font-bold text-warm-900">
                          {money(o.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 1. STICKY CART BAR (Refined typography & clear contrast) */}
      {cartTotalQty > 0 && tab === "menu" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-warm-200 bg-white/95 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-floating backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div
              onClick={() => setShowCartDrawer(true)}
              className="flex-1 cursor-pointer flex items-center gap-3 min-w-0"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md overflow-visible">
                <Icons.Bag />
                <span className="absolute -top-1.5 -right-1.5 flex min-w-[20px] h-5 px-1 items-center justify-center rounded-full bg-brand font-mono text-[11px] font-bold text-white shadow-sm ring-2 ring-white z-10">
                  {cartTotalQty}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-warm-500 truncate">
                  {cartTotalQty} dish{cartTotalQty > 1 ? "es" : ""} in table
                  order
                </p>
                <p className="font-mono text-lg sm:text-xl font-bold text-warm-900 truncate">
                  {money(cartTotalPrice)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCartDrawer(true)}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-95 transition"
            >
              Review Order →
            </button>
          </div>
        </div>
      )}

      {/* Real-time Added to Order Toast */}
      {itemAddedToast && (
        <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] rounded-2xl bg-white text-warm-900 px-4 py-3 shadow-floating border border-warm-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-warm-900 truncate">
                Added {itemAddedToast.qty}× {itemAddedToast.name}
              </p>
              <p className="text-[11px] text-warm-500 font-mono truncate">
                {itemAddedToast.spice}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setItemAddedToast(null);
              setShowCartDrawer(true);
            }}
            className="shrink-0 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark transition shadow-xs"
          >
            Review Order →
          </button>
        </div>
      )}

      {/* 2. DISH SHOWCASE MODAL (When tapping card for details) */}
      {activeItemModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveItemModal(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-warm-950/60 p-0 sm:p-4 backdrop-blur-xs"
        >
          <div
            style={{
              transform: `translateY(${Math.max(sheetExpanded ? -6 : 0, sheetDragY)}px)`,
              transition: isDraggingSheet
                ? "none"
                : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.28s ease, height 0.28s ease",
            }}
            className={`relative w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
              sheetExpanded
                ? "h-[92vh] sm:h-[88vh] max-h-[92vh]"
                : "max-h-[82vh] h-auto"
            }`}
          >
            {/* Responsive Drag & Pull Handle Bar overlaid on top of the food image */}
            <div
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              onMouseDown={handleSheetMouseDown}
              onClick={handleHandleBarClick}
              className="absolute inset-x-0 top-0 z-20 pt-2.5 pb-4 px-4 cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none group"
              title="Pull up to expand, push down to collapse or dismiss"
            >
              <div className="w-12 sm:w-14 h-1.5 rounded-full bg-white/50 ring-1 ring-black/10 shadow-[0_1px_4px_rgba(0,0,0,0.25)] backdrop-blur-md group-hover:bg-white/75 transition" />
            </div>

            {/* Scrollable Dish Details & Customizer Body */}
            <div className="overflow-y-auto flex-1 thin-scrollbar">
              {/* Modal Image Header (Responsive aspect ratio) */}
              <div
                className={`relative w-full bg-warm-100 overflow-hidden transition-all duration-300 ${
                  sheetExpanded
                    ? "aspect-[16/10] sm:aspect-[16/9] max-h-64 sm:max-h-72"
                    : "aspect-[16/9] max-h-52"
                }`}
              >
                {formatImageUrl(activeItemModal.image_url) ? (
                  <img
                    src={formatImageUrl(activeItemModal.image_url)}
                    alt={activeItemModal.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-warm-100 text-warm-400">
                    <Icons.Utensils />
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg sm:text-xl font-bold leading-snug text-warm-900">
                      {activeItemModal.name}
                    </h2>
                    <span className="font-mono text-base sm:text-lg font-bold text-brand shrink-0 pt-0.5">
                      {money(activeItemModal.price)}
                    </span>
                  </div>
                  {activeItemModal.description && (
                    <p className="mt-2 text-xs sm:text-sm text-warm-600 leading-relaxed">
                      {activeItemModal.description}
                    </p>
                  )}
                </div>

                {/* Responsive Culinary Details & Sensory Profile */}
                {(() => {
                  const culinary = getDishCulinaryDetails(activeItemModal);
                  if (!culinary) return null;
                  return (
                    <div className="rounded-2xl bg-warm-50/80 border border-warm-200/80 p-3 space-y-3">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {culinary.badges.map((b, idx) => (
                          <span
                            key={idx}
                            className="flex-1 min-w-fit inline-flex items-center justify-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-medium leading-normal text-warm-700 border border-warm-200 shadow-2xs text-center whitespace-nowrap"
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2.5 border-t border-warm-200/70 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-warm-500 font-semibold block">
                          {culinary.sensoryTitle}
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {culinary.sensoryTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="flex-1 min-w-fit inline-flex items-center justify-center rounded-full bg-warm-100 px-2.5 py-1 text-[11px] font-medium leading-normal text-warm-800 text-center whitespace-nowrap"
                            >
                              ✦ {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-warm-600 italic leading-relaxed pt-0.5">
                          {culinary.chefNote}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Preferences Customization */}
                {(() => {
                  const config = getItemPreferenceConfig(activeItemModal);

                  return (
                    <div className="space-y-5 pt-4 border-t border-warm-100">
                      {/* Preference Pickers */}
                      {config.type === "drink" ? (
                        <div className="space-y-5">
                          {/* Ice Level */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className="text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                Ice Level / Temperature
                              </span>
                              <span className="text-xs font-mono font-bold text-brand shrink-0">
                                {customPrefIce}
                              </span>
                            </div>
                            <div
                              className="grid grid-cols-2 gap-2.5"
                              role="radiogroup"
                              aria-label="Ice Level"
                            >
                              {config.iceOptions.map((opt) => {
                                const isChecked = customPrefIce === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setCustomPrefIce(opt)}
                                    className={`cursor-pointer w-full inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-snug text-center transition select-none active:scale-[0.98] ${
                                      isChecked
                                        ? "bg-brand text-white shadow-xs border border-brand"
                                        : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                    }`}
                                  >
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Sweetness Level */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className="text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                Sweetness Level
                              </span>
                              <span className="text-xs font-mono font-bold text-brand shrink-0">
                                {customPrefSweet}
                              </span>
                            </div>
                            <div
                              className="grid grid-cols-2 gap-2.5"
                              role="radiogroup"
                              aria-label="Sweetness Level"
                            >
                              {config.sweetOptions.map((opt) => {
                                const isChecked = customPrefSweet === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setCustomPrefSweet(opt)}
                                    className={`cursor-pointer w-full inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-snug text-center transition select-none active:scale-[0.98] ${
                                      isChecked
                                        ? "bg-brand text-white shadow-xs border border-brand"
                                        : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                    }`}
                                  >
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Single Preference Group: Doneness, Spice, Preparation, Serving */
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                              {config.label}
                            </span>
                            <span className="text-xs font-mono font-bold text-brand shrink-0">
                              {customPrefOption}
                            </span>
                          </div>
                          <div
                            className="grid grid-cols-2 gap-2.5"
                            role="radiogroup"
                            aria-label={config.label}
                          >
                            {config.options.map((opt) => {
                              const isChecked = customPrefOption === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setCustomPrefOption(opt)}
                                  className={`cursor-pointer w-full inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-snug text-center transition select-none active:scale-[0.98] ${
                                    isChecked
                                      ? "bg-brand text-white shadow-xs border border-brand"
                                      : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                  }`}
                                >
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Special Instructions */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                            Special Instructions
                          </span>
                          <span className="text-[11px] text-warm-400">
                            Optional
                          </span>
                        </div>
                        <input
                          type="text"
                          value={customPrefNotes}
                          onChange={(e) => setCustomPrefNotes(e.target.value)}
                          placeholder="e.g. sauce on side, less salty, no onions..."
                          className="w-full rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-[16px] sm:text-sm text-warm-900 placeholder:!text-[11px] sm:placeholder:!text-xs placeholder-warm-400 outline-none focus:border-brand focus:bg-white transition"
                        />
                      </div>

                      {/* Dietary Advisory Notice when expanded */}
                      {sheetExpanded && (
                        <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs leading-relaxed text-amber-900 flex items-start gap-2.5">
                          <span className="text-amber-700 font-bold shrink-0">
                            ℹ
                          </span>
                          <span>
                            Please notify
                            dining staff if you have any food allergies or
                            specific dietary requests.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* DOCKED STICKY BOTTOM ACTION BAR: Always at the bottom, NEVER leaves a blank space */}
            {(() => {
              const unitPrice = activeItemModal.price;
              const isAlreadyInCart = (cart[activeItemModal.id]?.qty || 0) > 0;
              return (
                <div className="shrink-0 border-t border-warm-200 bg-white/95 backdrop-blur-xs px-5 sm:px-6 py-3.5 sm:py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-warm-500">
                        Quantity
                      </span>
                      <div className="flex items-center gap-1 rounded-full bg-warm-100 p-1 border border-warm-200 shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            setCustomPrefQty((q) => Math.max(1, q - 1))
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-warm-800 shadow-xs hover:bg-warm-200 active:scale-90 transition"
                          title="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-mono text-sm font-bold text-warm-900">
                          {customPrefQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomPrefQty((q) => q + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-xs hover:bg-brand-dark active:scale-90 transition"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-warm-400 font-mono">
                        Item Total
                      </div>
                      <div className="font-mono text-base font-bold text-warm-900">
                        {money(unitPrice * customPrefQty)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    className="w-full rounded-2xl bg-brand py-3.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-[0.98] transition flex items-center justify-between px-5"
                  >
                    <div className="flex items-center gap-2">
                      <Icons.Bag />
                      <span>
                        {isAlreadyInCart
                          ? "Update in Order List"
                          : "Add to Order List"}
                      </span>
                    </div>
                    <span className="font-mono font-bold">
                      {money(unitPrice * customPrefQty)}
                    </span>
                  </button>

                  {isAlreadyInCart && (
                    <button
                      type="button"
                      onClick={() => {
                        adjustQty(
                          activeItemModal.id,
                          -cart[activeItemModal.id].qty,
                        );
                        setActiveItemModal(null);
                      }}
                      className="w-full text-center py-0.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline transition"
                    >
                      Remove from Order List
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. CART DRAWER (Bottom Sheet / Order List with Radio Preference Lists) */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-warm-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Handle Bar */}
            <div
              onClick={() => setShowCartDrawer(false)}
              className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer hover:bg-warm-50 transition"
              title="Push down to close"
            >
              <div className="w-12 h-1.5 rounded-full bg-warm-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3.5">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Review Table #{tableInfo?.table} Order
                </h2>
                <p className="text-xs text-warm-500 font-mono">
                  {cartTotalQty} item{cartTotalQty !== 1 ? "s" : ""} in this
                  round
                </p>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-100 text-warm-500 hover:bg-warm-200"
              >
                <Icons.Close />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {Object.keys(cart).length === 0 ? (
                <div className="py-12 text-center text-warm-400 space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-500">
                    <Icons.Bag />
                  </div>
                  <p className="text-sm font-medium text-warm-600">
                    Your order list is empty
                  </p>
                  <p className="text-xs text-warm-400">
                    Add dishes or drinks from the menu
                  </p>
                </div>
              ) : (
                Object.entries(cart).map(([id, val]) => {
                  const dish = menu.find((m) => m.id === Number(id));
                  if (!dish) return null;
                  const config = getItemPreferenceConfig(dish);
                  const drinkPrefs =
                    config.type === "drink"
                      ? getDrinkPreferences(val.spice, config)
                      : null;

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-warm-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3"
                    >
                      {/* Item Header: Thumbnail, Full Dish Name, Total Price & Smart Trash Stepper Below */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {formatImageUrl(dish.image_url) ? (
                            <img
                              src={formatImageUrl(dish.image_url)}
                              alt={dish.name}
                              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover shrink-0 border border-warm-200"
                            />
                          ) : (
                            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-warm-100 flex items-center justify-center text-warm-400 shrink-0">
                              <Icons.Utensils />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="font-display text-sm sm:text-base font-bold leading-snug text-warm-900 break-words">
                              {dish.name}
                            </h4>
                            <p className="font-mono text-xs text-warm-500">
                              {money(dish.price)} each
                            </p>
                          </div>
                        </div>

                        {/* Right column: Total Price on top, Smart Trash Stepper directly below */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-mono text-sm sm:text-base font-bold text-warm-900">
                            {money(dish.price * val.qty)}
                          </span>

                          <div className="flex items-center gap-1 rounded-full bg-warm-50 p-0.5 border border-warm-200">
                            <button
                              type="button"
                              onClick={() => adjustQty(dish.id, -1)}
                              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white shadow-xs active:scale-90 transition ${
                                val.qty <= 1
                                  ? "text-warm-500 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-xs sm:text-sm font-bold text-warm-800 hover:bg-warm-100"
                              }`}
                              title={
                                val.qty <= 1
                                  ? "Remove dish"
                                  : "Decrease quantity"
                              }
                              aria-label={
                                val.qty <= 1
                                  ? `Remove ${dish.name}`
                                  : `Decrease ${dish.name} quantity`
                              }
                            >
                              {val.qty <= 1 ? (
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              ) : (
                                "−"
                              )}
                            </button>
                            <span className="min-w-[20px] text-center font-mono text-xs sm:text-sm font-bold text-warm-900">
                              {val.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQty(dish.id, 1)}
                              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-brand text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-dark active:scale-90 transition"
                              title="Increase quantity"
                              aria-label={`Increase ${dish.name} quantity`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Menu Preferences: Hairline divider + evenly spaced pill grid */}
                      <div className="pt-3 border-t border-warm-100 space-y-3">
                        {config.type === "drink" ? (
                          <>
                            {/* Ice Level Radio List */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                  Ice Level
                                </span>
                                <span className="text-[11px] font-mono font-medium text-brand">
                                  {drinkPrefs.ice}
                                </span>
                              </div>
                              <div
                                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                                role="radiogroup"
                                aria-label="Ice Level"
                              >
                                {config.iceOptions.map((opt) => {
                                  const isChecked = drinkPrefs.ice === opt;
                                  return (
                                    <label
                                      key={opt}
                                      className={`cursor-pointer w-full inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs text-center transition select-none ${
                                        isChecked
                                          ? "bg-brand text-white font-semibold shadow-xs border border-brand"
                                          : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`ice-${dish.id}`}
                                        value={opt}
                                        checked={isChecked}
                                        onChange={() =>
                                          updateDrinkIce(
                                            dish.id,
                                            opt,
                                            val.spice,
                                            config,
                                          )
                                        }
                                        className="sr-only"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Sweetness Radio List */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                  Sweetness
                                </span>
                                <span className="text-[11px] font-mono font-medium text-brand">
                                  {drinkPrefs.sweet}
                                </span>
                              </div>
                              <div
                                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                                role="radiogroup"
                                aria-label="Sweetness"
                              >
                                {config.sweetOptions.map((opt) => {
                                  const isChecked = drinkPrefs.sweet === opt;
                                  return (
                                    <label
                                      key={opt}
                                      className={`cursor-pointer w-full inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs text-center transition select-none ${
                                        isChecked
                                          ? "bg-brand text-white font-semibold shadow-xs border border-brand"
                                          : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`sweet-${dish.id}`}
                                        value={opt}
                                        checked={isChecked}
                                        onChange={() =>
                                          updateDrinkSweet(
                                            dish.id,
                                            opt,
                                            val.spice,
                                            config,
                                          )
                                        }
                                        className="sr-only"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Food Preference (Spice / Doneness / Serving Style) */
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                {config.label || "Preference"}
                              </span>
                              <span className="text-[11px] font-mono font-medium text-brand">
                                {val.spice || config.options[0]}
                              </span>
                            </div>
                            <div
                              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                              role="radiogroup"
                              aria-label={config.label || "Preference"}
                            >
                              {config.options.map((opt) => {
                                const isChecked =
                                  (val.spice || config.options[0]) === opt;
                                return (
                                  <label
                                    key={opt}
                                    className={`cursor-pointer w-full inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs text-center transition select-none ${
                                      isChecked
                                        ? "bg-brand text-white font-semibold shadow-xs border border-brand"
                                        : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`pref-${dish.id}`}
                                      value={opt}
                                      checked={isChecked}
                                      onChange={() =>
                                        updateItemPreference(dish.id, opt)
                                      }
                                      className="sr-only"
                                    />
                                    <span>{opt.replace(" (Chef Pick)", " ★")}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Item-specific special instructions */}
                        <div className="pt-0.5">
                          <input
                            type="text"
                            placeholder="Special instructions (e.g. no onions, sauce on side)..."
                            value={val.notes || ""}
                            onChange={(e) =>
                              updateItemNotes(dish.id, e.target.value)
                            }
                            className="w-full rounded-xl border border-warm-200 bg-warm-50/50 px-3.5 py-2 text-[16px] sm:text-xs text-warm-800 placeholder:!text-[11px] sm:placeholder:!text-xs placeholder-warm-400 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand/20 transition font-normal"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="pt-1.5">
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wider mb-1">
                  General Instructions for Kitchen (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring water first, separate plates..."
                  value={orderLevelNote}
                  onChange={(e) => setOrderLevelNote(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50 p-2.5 text-xs sm:text-sm placeholder:!text-[11px] sm:placeholder:!text-xs outline-none focus:border-brand focus:bg-white font-normal"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-warm-100 bg-white p-5 space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm text-warm-500 font-medium">
                <span>Round Subtotal</span>
                <span className="font-mono font-semibold text-warm-900 text-sm sm:text-base">
                  {money(cartTotalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold border-t border-warm-100 pt-2">
                <span>TOTAL </span>
                <span className="font-mono text-brand text-lg sm:text-xl font-bold">
                  {money(cartTotalPrice)}
                </span>
              </div>

              <button
                disabled={cartTotalQty === 0}
                onClick={() => setShowConfirmModal(true)}
                className={`w-full rounded-xl py-3.5 font-display text-xs sm:text-sm font-semibold tracking-wide uppercase shadow-md transition ${
                  cartTotalQty === 0
                    ? "bg-warm-200 text-warm-400 cursor-not-allowed"
                    : "bg-brand text-white hover:bg-brand-dark active:scale-[0.98]"
                }`}
              >
                Confirm &amp; Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ORDER CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Icons.Utensils />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
              Send Order to Kitchen?
            </h3>
            <p className="text-xs sm:text-sm text-warm-600 leading-relaxed">
              Your ticket containing{" "}
              <span className="font-semibold text-warm-900">
                {cartTotalQty} dish{cartTotalQty > 1 ? "es" : ""}
              </span>{" "}
              ({money(cartTotalPrice)}) will be immediately printed and
              dispatched to the kitchen for Table #{tableInfo?.table}.
            </p>

            <div className="mt-3 flex flex-col gap-2 pt-1">
              <button
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white disabled:opacity-50 transition"
              >
                {isSubmitting
                  ? "Sending Ticket..."
                  : "Yes, Send Order to Kitchen ✓"}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CALL STAFF MODAL */}
      {showCallStaffModal && (
        <div
          onClick={() => setShowCallStaffModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            {...callStaffSwipe.bind}
            style={{
              transform: `translateY(${callStaffSwipe.offsetY}px)`,
              opacity: Math.max(0.4, 1 + callStaffSwipe.offsetY / 160),
            }}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5 touch-pan-x transition-transform duration-100"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Table Assistance
                </h3>
                <p className="text-xs text-warm-500 font-mono">
                  Table #{tableInfo?.table}
                </p>
              </div>
              <button
                onClick={() => setShowCallStaffModal(false)}
                className="text-warm-400 hover:text-warm-700 transition"
              >
                <Icons.Close />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-warm-600">
              What can our floor team assist you with?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "waiter", label: "👋 Need Waiter" },
                { type: "water", label: "💧 Refill Water" },
                { type: "cutlery", label: "🍴 Extra Cutlery" },
                { type: "bill", label: "🧾 Request Bill" },
              ].map((act) => (
                <button
                  key={act.type}
                  onClick={() => {
                    if (act.type === "bill") {
                      setShowCallStaffModal(false);
                      setShowBillConfirmModal(true);
                    } else {
                      callStaff(act.type);
                    }
                  }}
                  className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3 text-left text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-300 active:bg-warm-200 active:text-warm-950 transition"
                >
                  {act.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCallStaffModal(false)}
              className="w-full rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 6. BILL REQUEST CONFIRMATION MODAL */}
      {showBillConfirmModal && (
        <div
          onClick={() => setShowBillConfirmModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            {...billConfirmSwipe.bind}
            style={{
              transform: `translateY(${billConfirmSwipe.offsetY}px)`,
              opacity: Math.max(0.4, 1 + billConfirmSwipe.offsetY / 160),
            }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4 touch-pan-x transition-transform duration-100 animate-in fade-in zoom-in-95"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 border border-brand-200">
  <img
    src={catthrowcard}
    alt="catthrowcard"
    className="h-full w-full object-cover -translate-x-1 -translate-y-2 mix-blend-multiply"
  />
</div>

            <div className="space-y-1">
              <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                Request Table Bill?
              </h3>
              <p className="text-xs text-warm-500 font-mono">
                Table #{tableInfo?.table}{" "}
                {tableInfo?.merged_with
                  ? `· Merged with ${tableInfo.merged_with}`
                  : ""}
              </p>
            </div>

            {/* Bill summary breakdown */}
            <div className="rounded-2xl bg-warm-50 border border-warm-200 p-3.5 text-left space-y-1.5">
              <div className="flex justify-between items-center text-xs text-warm-600 font-medium">
                <span>Total Active Rounds</span>
                <span className="font-mono font-semibold text-warm-900">
                  {orders.length} order ticket{orders.length > 1 ? "s" : ""}
                </span>
              </div>
              {totalRedeemedDiscounts > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-700 font-medium">
                  <span>Loyalty Vouchers Redeemed</span>
                  <span className="font-mono font-bold">
                    -{money(totalRedeemedDiscounts)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-warm-200/80 pt-1.5">
                <span className="text-xs sm:text-sm font-semibold text-warm-800">
                  Current Session Total
                </span>
                <span className="font-mono text-base sm:text-lg font-bold text-brand">
                  {money(netSessionBalance)}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-warm-600 leading-5 tracking-normal [word-spacing:2px] text-center">
              Our staff will be notified immediately to prepare your final check
              and bring it to your table.
            </p>

            <div className="mt-3 flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  callStaff("bill", "Ready to settle bill");
                  setShowBillConfirmModal(false);
                }}
                className="w-full rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
              >
                Yes, Request Bill
              </button>
              <button
                onClick={() => setShowBillConfirmModal(false)}
                className="w-full rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Cancel / Keep Dining
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MEMBER EXCLUSIVE PROMOTION UNLOCK MODAL */}
      {exclusivePromptDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-900 text-amber-200 border border-purple-800 shadow-md">
              <span className="text-2xl font-bold">✦</span>
            </div>

            <div>
              <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-[11px] font-bold text-purple-900 border border-purple-200 mb-2">
                {exclusivePromptDish.promo_badge || "MEMBER EXCLUSIVE"}
              </span>
              <h3 className="font-display text-lg font-bold text-warm-900">
                Exclusive for Members
              </h3>
              <p className="mt-1 text-xs text-warm-600 leading-relaxed">
                <strong className="text-warm-900">
                  {exclusivePromptDish.name}
                </strong>{" "}
                is reserved exclusively for registered MOLS MAISON members.
              </p>
              {exclusivePromptDish.promo_price ? (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 font-medium">
                  Special promotional price:{" "}
                  <strong className="font-mono text-brand text-sm">
                    {money(exclusivePromptDish.promo_price)}
                  </strong>{" "}
                  (Regular {money(exclusivePromptDish.price)})
                </div>
              ) : null}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await verifyMember();
                if (res && exclusivePromptDish) {
                  addToCartDirect(exclusivePromptDish, res);
                  setExclusivePromptDish(null);
                }
              }}
              className="space-y-2.5 pt-1 text-left"
            >
              <label className="block text-xs font-semibold text-warm-800">
                Member Login (Username / Phone &amp; Password):
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Username, Phone, or Member #"
                  value={memberNumberInput}
                  onChange={(e) => {
                    setMemberNumberInput(e.target.value);
                    setMemberError("");
                  }}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50 px-3 py-2 text-[16px] sm:text-xs font-mono outline-none focus:border-brand focus:bg-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Password or PIN (default: 1234)"
                  value={memberPasswordInput}
                  onChange={(e) => {
                    setMemberPasswordInput(e.target.value);
                    setMemberError("");
                  }}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50 px-3 py-2 text-[16px] sm:text-xs font-mono outline-none focus:border-brand focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="w-full rounded-xl bg-brand px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-brand-dark transition shrink-0 disabled:opacity-50"
                >
                  {memberLoading ? "Verifying..." : "Verify & Unlock"}
                </button>
              </div>
              {memberError && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {memberError}
                </p>
              )}
            </form>

            <div className="pt-2 border-t border-warm-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegisterInCustomer(true);
                  setShowMemberModal(true);
                }}
                className="w-full rounded-xl bg-brand/10 py-2.5 text-xs font-bold text-brand hover:bg-brand/20 transition"
              >
                Not a member yet? Join Free in 30s →
              </button>
              <button
                type="button"
                onClick={() => {
                  setExclusivePromptDish(null);
                  setMemberError("");
                }}
                className="text-xs text-warm-500 hover:text-warm-800"
              >
                Cancel / Browse other dishes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Membership & Rewards Modal */}
      {showMemberModal && (
        <div
          onClick={() => setShowMemberModal(false)}
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-white sm:bg-warm-950/75 p-0 sm:p-4 sm:backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full sm:h-auto sm:max-h-[90dvh] flex flex-col rounded-none sm:rounded-3xl bg-white sm:shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-warm-100 px-5 sm:px-6 py-4 bg-warm-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-2xs font-bold">
                  ⭐
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                    MOLS MAISON Rewards &amp; Membership
                  </h3>
                  <p className="text-[11px] font-mono text-warm-500">
                    Dining perks · Points · Tier advancement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              >
                <Icons.Close />
              </button>
            </div>

            {/* Modal Body */}
            <div
              ref={memberModalBodyRef}
              style={{ WebkitOverflowScrolling: "touch" }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-5 sm:p-7"
            >
              {!memberData ? (
                /* Lookup or Register View */
                <div className="min-h-full flex flex-col justify-between gap-6">
                  {!showRegisterInCustomer ? (
                    <div className="min-h-full flex flex-col justify-between gap-6">
                      <div className="space-y-5">
                        <div className="text-center pt-1 pb-2">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
                            <Icons.Star />
                          </div>
                          <h4 className="font-display text-lg sm:text-xl font-bold text-warm-900">
                            Check Your Membership Status
                          </h4>
                          <p className="mt-1.5 text-xs sm:text-sm text-warm-500 max-w-sm mx-auto leading-relaxed">
                            Enter your membership information to view your
                            rewards balance, tier perks, and points.
                          </p>
                        </div>

                        {memberError && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-900 font-medium">
                            {memberError}
                          </div>
                        )}

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            verifyMember();
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide">
                              Username or Phone Number
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Enter username or phone number"
                              value={memberNumberInput}
                              onChange={(e) => {
                                setMemberNumberInput(e.target.value);
                                setMemberError("");
                              }}
                              className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 font-mono text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide">
                              Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="Enter password"
                              value={memberPasswordInput}
                              onChange={(e) => {
                                setMemberPasswordInput(e.target.value);
                                setMemberError("");
                              }}
                              className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 font-mono text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={memberLoading}
                            className="w-full rounded-2xl bg-brand py-3.5 font-display text-sm font-bold text-white shadow-sm hover:bg-brand-dark transition disabled:opacity-50"
                          >
                            {memberLoading
                              ? "Checking..."
                              : "Verify & Check Status"}
                          </button>
                        </form>
                      </div>

                      <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4 text-center space-y-1.5">
                        <p className="text-xs sm:text-sm text-warm-600">
                          Not a member yet?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRegisterInCustomer(true);
                            setMemberError("");
                          }}
                          className="font-semibold text-xs sm:text-sm text-brand hover:underline tracking-wide leading-relaxed [word-spacing:0.12em]"
                        >
                          Join MOLS MAISON Rewards in 10s (+50 Welcome Points) →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* In-Modal Registration Form */
                    <form
                      onSubmit={handleCustomerRegister}
                      className="min-h-full flex flex-col justify-between gap-6"
                    >
                      <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-center space-y-1.5">
                          <h4 className="font-display text-lg sm:text-xl font-bold text-warm-900">
                            Join MOLS MAISON Membership
                          </h4>
                          <p className="text-xs sm:text-sm text-amber-900 font-semibold">
                            ★ Earn 50 Welcome Points immediately on sign up!
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-medium text-amber-800">
                            <span className="rounded-full bg-white px-2.5 py-0.5 border border-amber-200">
                              Points on Every Order
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 border border-amber-200">
                              Member-Only Discounts
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 border border-amber-200">
                              Birthday Dessert
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-warm-800 mb-1.5">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Enter your full name"
                              className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                              value={customerRegisterForm.name}
                              onChange={(e) =>
                                setCustomerRegisterForm({
                                  ...customerRegisterForm,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-warm-800 mb-1.5">
                              Phone Number (Member ID) *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="e.g. 08123456789"
                              className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 font-mono text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                              value={customerRegisterForm.phone}
                              onChange={(e) =>
                                setCustomerRegisterForm({
                                  ...customerRegisterForm,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-warm-800 mb-1.5">
                              Create Password or PIN *
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="At least 4 digits or characters"
                              className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 font-mono text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                              value={customerRegisterForm.password}
                              onChange={(e) =>
                                setCustomerRegisterForm({
                                  ...customerRegisterForm,
                                  password: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-warm-800 mb-1.5">
                                Email{" "}
                                <span className="text-warm-400 font-normal">
                                  (Optional)
                                </span>
                              </label>
                              <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 text-[16px] sm:text-sm font-medium text-warm-900 placeholder:text-xs sm:placeholder:text-sm placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                                value={customerRegisterForm.email}
                                onChange={(e) =>
                                  setCustomerRegisterForm({
                                    ...customerRegisterForm,
                                    email: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-warm-800 mb-1.5">
                                Birthday{" "}
                                <span className="text-warm-400 font-normal">
                                  (For Treat)
                                </span>
                              </label>
                              <input
                                type="date"
                                className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-3 text-[16px] sm:text-sm font-medium text-warm-900 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                                value={customerRegisterForm.date_of_birth}
                                onChange={(e) =>
                                  setCustomerRegisterForm({
                                    ...customerRegisterForm,
                                    date_of_birth: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-warm-100">
                        <button
                          type="button"
                          onClick={() => setShowRegisterInCustomer(false)}
                          className="flex-1 rounded-2xl bg-warm-100 py-3.5 text-sm font-semibold text-warm-700 hover:bg-warm-200 transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={customerRegisterLoading}
                          className="flex-[1.6] rounded-2xl bg-brand py-3.5 font-display text-sm font-bold text-white shadow-sm hover:bg-brand-dark transition disabled:opacity-50"
                        >
                          {customerRegisterLoading
                            ? "Creating Account..."
                            : "Join & Get 50 pts"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Member Logged In Multi-Tab View */
                <div className="space-y-4">
                  {/* Loyalty Navigation Tabs */}
                  <div className="flex border-b border-warm-200/80 gap-1 bg-warm-100/60 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setActiveMemberTab("profile")}
                      className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeMemberTab === "profile"
                          ? "bg-white text-warm-900 shadow-2xs"
                          : "text-warm-600 hover:text-warm-900"
                      }`}
                    >
                      <span>💎</span>
                      <span>Tier Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMemberTab("prive")}
                      className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeMemberTab === "prive"
                          ? "bg-[#242024] text-[#F5EBDD] shadow-2xs"
                          : "text-stone-700 hover:text-stone-950"
                      }`}
                    >
                      <span>👑</span>
                      <span>Maison Privé</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMemberTab("rewards")}
                      className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeMemberTab === "rewards"
                          ? "bg-white text-warm-900 shadow-2xs"
                          : "text-warm-600 hover:text-warm-900"
                      }`}
                    >
                      <span>🎁</span>
                      <span>Rewards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMemberTab("history")}
                      className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeMemberTab === "history"
                          ? "bg-white text-warm-900 shadow-2xs"
                          : "text-warm-600 hover:text-warm-900"
                      }`}
                    >
                      <span>📜</span>
                      <span>History</span>
                    </button>
                  </div>

                  {/* TAB 1: TIER STATUS & PROFILE */}
                  {activeMemberTab === "profile" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Digital VIP Luxury Membership Card */}
                      {(() => {
                        const cardTier = (
                          memberData.tier_code ||
                          memberData.loyalty_tier ||
                          ""
                        ).toLowerCase();
                        const isVipCard = cardTier === "vip";
                        return (
                          <div
                            className={`relative isolate overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-xl border ${
                              isVipCard
                                ? "bg-[#141414] border-[#D4AF37]"
                                : cardTier === "gold"
                                  ? "bg-[#D49B27] border-[#F8E29D]"
                                  : cardTier === "silver"
                                    ? "bg-[#8E9BA8] border-[#E5ECF2]"
                                    : "bg-[#B56E3B] border-[#E8BE96]"
                            }`}
                          >
                            {/* Decorative borders */}
                            <div
                              className={`pointer-events-none absolute inset-[7px] rounded-xl border ${isVipCard ? "border-[#D4AF37]/45" : "border-white/35"}`}
                            />
                            <div
                              className={`pointer-events-none absolute inset-[12px] rounded-lg border ${isVipCard ? "border-[#D4AF37]/20" : "border-white/15"}`}
                            />

                            {/* Background monogram */}
                            <div className="pointer-events-none absolute -right-5 -bottom-14 select-none">
                              <span
                                className={`font-serif text-[210px] leading-none ${isVipCard ? "text-[#D4AF37]/[0.10]" : "text-white/[0.09]"}`}
                              >
                                M
                              </span>
                            </div>

                            {/* Decorative accents */}
                            <div
                              className={`pointer-events-none absolute top-4 left-4 font-serif text-lg ${isVipCard ? "text-[#F3D478]" : "text-white/75"}`}
                            >
                              ✧
                            </div>
                            <div
                              className={`pointer-events-none absolute top-4 right-4 font-serif text-lg ${isVipCard ? "text-[#F3D478]" : "text-white/75"}`}
                            >
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
                                    <h3
                                      className={`font-logo text-lg tracking-[0.16em] ${isVipCard ? "text-[#F6DF93]" : "text-white"}`}
                                    >
                                      MOLS MAISON
                                    </h3>
                                    <p
                                      className={`mt-0.5 text-[9px] uppercase tracking-[0.25em] ${isVipCard ? "text-[#E8CA7A]/85" : "text-white/85"}`}
                                    >
                                      Private Membership
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {memberData.membership?.is_prive && (
                                    <span className="rounded-sm border border-[#E5D4B4]/60 bg-[#242024]/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F5EBDD] backdrop-blur-xs">
                                      👑 Privé
                                    </span>
                                  )}
                                  <span
                                    className={`rounded-sm border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-xs ${
                                      isVipCard
                                        ? "border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F6DF93]"
                                        : "border-white/50 bg-black/20 text-white"
                                    }`}
                                  >
                                    {isVipCard
                                      ? "VIP Elite"
                                      : `${memberData.tier || memberData.loyalty_tier || "Bronze"} Member`}
                                  </span>
                                </div>
                              </div>

                              {/* Member information */}
                              <div className="grid grid-cols-2 gap-4 items-end">
                                <div className="min-w-0">
                                  <p
                                    className={`mb-1 text-[9px] uppercase tracking-[0.23em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}
                                  >
                                    Cardholder
                                  </p>

                                  <h2
                                    className={`break-words font-serif text-2xl sm:text-3xl font-medium tracking-wide ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}
                                  >
                                    {memberData.name || memberData.full_name}
                                  </h2>

                                  <p className="mt-1.5 text-[12px] font-mono tracking-wider text-white/90">
                                    {memberData.phone}
                                  </p>

                                  {memberData.email && (
                                    <p className="mt-0.5 break-all text-[11px] text-white/80">
                                      {memberData.email}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right">
                                  <p
                                    className={`mb-1 text-[9px] uppercase tracking-[0.23em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}
                                  >
                                    Available Points
                                  </p>

                                  <p
                                    className={`font-serif text-3xl sm:text-4xl font-medium tabular-nums ${isVipCard ? "text-[#F6DF93]" : "text-[#FFF6DF]"}`}
                                  >
                                    {(
                                      memberData.points ||
                                      memberData.points_balance ||
                                      0
                                    ).toLocaleString()}
                                  </p>

                                  <p
                                    className={`mt-0.5 text-[9px] uppercase tracking-[0.16em] font-mono ${isVipCard ? "text-[#E8CA7A]/85" : "text-white/85"}`}
                                  >
                                    Reward Points
                                  </p>

                                  <p
                                    className={`mt-1 text-[10px] font-mono ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}
                                  >
                                    ≈{" "}
                                    {money(
                                      (memberData.points ||
                                        memberData.points_balance ||
                                        0) / 100,
                                    )}{" "}
                                    (100 pts = $1)
                                  </p>
                                </div>
                              </div>

                              {/* Decorative divider */}
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-px flex-1 ${isVipCard ? "bg-[#D4AF37]/40" : "bg-white/35"}`}
                                />
                                <span
                                  className={`font-serif text-sm ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}
                                >
                                  ✧
                                </span>
                                <div
                                  className={`h-px flex-1 ${isVipCard ? "bg-[#D4AF37]/40" : "bg-white/35"}`}
                                />
                              </div>

                              {/* Membership privileges */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p
                                    className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}
                                  >
                                    Member Privilege
                                  </p>
                                  <p
                                    className={`mt-1 font-serif text-sm sm:text-base ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}
                                  >
                                    {memberData.discount_percent > 0
                                      ? `${memberData.discount_percent}% Dining Privilege`
                                      : cardTier === "silver"
                                        ? "3% Dining Privilege"
                                        : cardTier === "gold"
                                          ? "5% Dining Privilege"
                                          : isVipCard
                                            ? "10% Dining Privilege"
                                            : "1x Points per $1 spent"}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p
                                    className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/80" : "text-white/80"}`}
                                  >
                                    Multiplier
                                  </p>
                                  <p
                                    className={`mt-1 font-serif text-sm sm:text-base ${isVipCard ? "text-[#FFF6DF]" : "text-white"}`}
                                  >
                                    {memberData.points_multiplier || 1}x Points
                                    Multiplier
                                  </p>
                                </div>
                              </div>

                              {/* Card footer */}
                              <div
                                className={`flex items-center justify-between border-t pt-2.5 ${isVipCard ? "border-[#D4AF37]/25" : "border-white/25"}`}
                              >
                                <p
                                  className={`text-[9px] uppercase tracking-[0.2em] font-mono ${isVipCard ? "text-[#E8CA7A]/70" : "text-white/75"}`}
                                >
                                  MOLS MAISON · Members Club
                                </p>

                                <p
                                  className={`font-mono text-[10px] tracking-widest ${isVipCard ? "text-[#F3D478]" : "text-white/90"}`}
                                >
                                  MM · {String(memberData.id).padStart(5, "0")}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Birthday Month Alert */}
                      {memberData.birthday_info?.is_birthday_month && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 shadow-xs flex items-center gap-3">
                          <span className="text-2xl">🎂</span>
                          <div>
                            <p className="font-bold text-xs text-amber-950">
                              Happy Birthday Month!
                            </p>
                            <p className="text-[11px] text-amber-800">
                              {memberData.birthday_info?.available_reward
                                ?.description ||
                                "You have a complimentary birthday dining dessert gift available!"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Tier Progress Bar Card */}
                      {memberData.tier_info && (
                        <div className="rounded-3xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-display text-sm font-bold text-warm-900">
                              Lifetime Tier Progress
                            </span>
                            <span className="font-mono text-xs font-semibold text-brand">
                              {memberData.tier_info.progress_percent}% to{" "}
                              {memberData.tier_info.next_tier || "Max VIP"}
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div className="h-3 w-full bg-warm-100 rounded-full overflow-hidden p-0.5 border border-warm-200">
                            <div
                              className="h-full bg-brand rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(5, memberData.tier_info.progress_percent)}%`,
                              }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-bold text-warm-800">
                              {memberData.tier_info.current_tier}
                            </span>
                            {memberData.tier_info.next_tier ? (
                              <span className="font-bold text-warm-500">
                                Next: {memberData.tier_info.next_tier}
                              </span>
                            ) : (
                              <span className="font-bold text-amber-600">
                                ✦ Maximum Tier Unlocked!
                              </span>
                            )}
                          </div>

                          {memberData.tier_info.next_tier ? (
                            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 font-medium">
                              Spend{" "}
                              <span className="font-bold font-mono">
                                {money(memberData.tier_info.needed)}
                              </span>{" "}
                              more to unlock{" "}
                              <span className="font-bold">
                                {memberData.tier_info.next_tier}
                              </span>{" "}
                              ({memberData.tier_info.next_perk})!
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-purple-50 border border-purple-200 p-2.5 text-xs text-purple-950 font-medium">
                              Enjoy maximum VIP status with 10% discount and
                              2x points on every dollar!
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lifetime Spending Stats */}
                      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                        <div className="rounded-2xl border border-warm-200 bg-warm-50/60 p-3">
                          <span className="text-warm-500 text-[10px] uppercase font-semibold">
                            Lifetime Spend
                          </span>
                          <p className="text-base font-bold text-warm-900 mt-0.5">
                            {money(memberData.total_spent)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-warm-200 bg-warm-50/60 p-3">
                          <span className="text-warm-500 text-[10px] uppercase font-semibold">
                            Total Points Earned
                          </span>
                          <p className="text-base font-bold text-warm-900 mt-0.5">
                            {memberData.total_points_earned ||
                              memberData.points}{" "}
                            pts
                          </p>
                        </div>
                      </div>

                      {/* Tier Perks Breakdown Table */}
                      <div className="rounded-3xl border border-warm-200 bg-white p-4 shadow-card space-y-2 text-xs">
                        <h5 className="font-display font-bold text-warm-900 text-xs sm:text-sm">
                          Spending Tier Rules &amp; Multipliers
                        </h5>
                        <div className="divide-y divide-warm-100 font-mono text-[11px]">
                          <div className="py-2 flex items-center justify-between gap-2">
                            <span className="text-[#9E5A2B] font-semibold">
                              Bronze ($0–$199.99)
                            </span>
                            <span className="text-warm-900 font-semibold">
                              0% Off · 1x Multiplier
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-2">
                            <span className="text-[#64748B] font-semibold">
                              Silver ($200–$399.99)
                            </span>
                            <span className="text-warm-900 font-semibold">
                              3% Off · 1.25x Multiplier
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-2">
                            <span className="text-[#C68912] font-semibold">
                              Gold ($400–$599.99)
                            </span>
                            <span className="text-warm-900 font-semibold">
                              5% Off · 1.5x Multiplier
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#1C1917] border border-[#C9A23F]/60 px-2 py-0.5 text-[#F5D77F] font-bold">
                              <span>✦</span>
                              <span>VIP ($600+)</span>
                            </span>
                            <span className="text-warm-900 font-semibold">
                              10% Off · 2.0x Multiplier
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: MAISON PRIVÉ ANNUAL MEMBERSHIP */}
                  {activeMemberTab === "prive" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="rounded-3xl bg-[#FAF7F0] text-[#2B231D] p-5 sm:p-6 shadow-card border border-[#D4BC8D] space-y-4">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFE4CC] border border-[#D4BC8D] text-lg text-[#7A5B21]">
                              👑
                            </span>
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="font-display text-lg sm:text-xl font-bold tracking-wide text-[#2B231D]">
                                Maison Privé
                              </h4>
                              <p className="text-[11px] font-mono tracking-wide text-[#7A6340]">
                                Annual Dining Pass ·{" "}
                                <span className="text-[#2B231D] font-bold">
                                  $49.99/yr
                                </span>
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              memberData.membership?.is_prive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-white text-warm-600 border-[#D9CEB8]"
                            }`}
                          >
                            {memberData.membership?.is_prive ? (
                              <>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <span className="h-2 w-2 rounded-full bg-warm-400" />
                                <span>Not Active</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Hairline Divider */}
                        <div className="border-t border-[#E6DAC0]" />

                        {/* Description */}
                        <p className="text-xs text-[#5E4E3D] leading-relaxed">
                          An optional annual membership providing bespoke concierge dining
                          privileges. Operates independently of and{" "}
                          <span className="text-[#2B231D] font-semibold">complements</span>{" "}
                          your lifetime spending tier.
                        </p>

                        {/* Bottom State: Active Expiry Box OR Subscribe CTA */}
                        {memberData.membership?.is_prive ? (
                          <div className="rounded-2xl bg-white border border-[#E6DAC0] grid grid-cols-2 divide-x divide-[#EDE3CC] font-mono">
                            <div className="p-3.5 space-y-1">
                              <span className="text-[10px] tracking-wider text-[#7A6340] uppercase block">
                                Membership Expiry
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-[#2B231D] block">
                                {memberData.membership.end_date}
                              </span>
                            </div>
                            <div className="p-3.5 space-y-1 text-right">
                              <span className="text-[10px] tracking-wider text-[#7A6340] uppercase block">
                                Remaining
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-emerald-700 block">
                                {memberData.membership.days_remaining} days left
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={loyaltyActionLoading}
                            onClick={handleSubscribeMaisonPrive}
                            className="w-full rounded-2xl bg-[#9A6F26] text-white hover:bg-[#825C1D] font-display font-bold py-3.5 px-4 text-xs sm:text-sm tracking-wide shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition"
                          >
                            {loyaltyActionLoading
                              ? "Processing..."
                              : "Join Maison Privé · $49.99 / Year"}
                          </button>
                        )}
                      </div>

                      {/* Benefits Checklist */}
                      <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3">
                        <h5 className="font-display font-bold text-warm-900 text-sm">
                          Exclusive Maison Privé Privileges
                        </h5>
                        <div className="space-y-2 text-xs text-warm-700">
                          {[
                            "Priority table reservations on peak dining nights",
                            "Complimentary birthday dessert tasting",
                            "Complimentary welcome signature drink on arrival",
                            "Exclusive seasonal menu access before public release",
                            "Private invitations to chef tastings & wine pairings",
                            "Special member-only promotional events",
                          ].map((b, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                ✓
                              </span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: REWARDS CATALOG */}
                  {activeMemberTab === "rewards" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3 font-mono text-xs text-amber-950">
                        <span>Your Available Balance:</span>
                        <span className="font-bold text-base text-amber-900">
                          {memberData.points} points (
                          {money(memberData.points / 100)})
                        </span>
                      </div>

                      {/* Catalog Items */}
                      <div className="space-y-2.5">
                        <h5 className="font-display font-bold text-warm-900 text-xs sm:text-sm">
                          Available Rewards for Redemption
                        </h5>
                        <div className="space-y-2">
                          {(
                            customerRewardsData?.catalog || [
                              {
                                id: 1,
                                name: "$2 Dining Discount",
                                reward_value: 2,
                                points_required: 200,
                                reward_type: "discount",
                              },
                              {
                                id: 2,
                                name: "$5 Dining Discount",
                                reward_value: 5,
                                points_required: 500,
                                reward_type: "discount",
                              },
                              {
                                id: 3,
                                name: "$10 Dining Discount",
                                reward_value: 10,
                                points_required: 1000,
                                reward_type: "discount",
                              },
                              {
                                id: 4,
                                name: "$20 Dining Discount",
                                reward_value: 20,
                                points_required: 2000,
                                reward_type: "discount",
                              },
                              {
                                id: 5,
                                name: "Complimentary Dessert",
                                reward_value: 5,
                                points_required: 500,
                                reward_type: "free_item",
                              },
                              {
                                id: 6,
                                name: "Signature Drink",
                                reward_value: 7,
                                points_required: 700,
                                reward_type: "free_item",
                              },
                              {
                                id: 7,
                                name: "Complimentary Appetizer",
                                reward_value: 10,
                                points_required: 1000,
                                reward_type: "free_item",
                              },
                            ]
                          ).map((rw) => {
                            const canAfford =
                              memberData.points >= rw.points_required;
                            return (
                              <div
                                key={rw.id}
                                className="flex items-center justify-between rounded-2xl border border-warm-200 bg-white p-3 shadow-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-warm-900">
                                    <span>
                                      {rw.reward_type === "discount"
                                        ? "🏷️"
                                        : rw.reward_type === "free_item"
                                          ? "🍰"
                                          : "⭐"}
                                    </span>
                                    <span>{rw.name}</span>
                                  </div>
                                  <p className="font-mono text-[11px] text-warm-500 mt-0.5">
                                    Requires {rw.points_required} pts · Value{" "}
                                    {money(rw.reward_value)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={!canAfford || loyaltyActionLoading}
                                  onClick={() => handleRedeemReward(rw.id)}
                                  className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition active:scale-95 ${
                                    canAfford
                                      ? "bg-brand text-white shadow-xs hover:bg-brand-dark"
                                      : "bg-warm-100 text-warm-400 cursor-not-allowed"
                                  }`}
                                >
                                  {canAfford ? "Redeem" : "Locked"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: POINTS HISTORY */}
                  {activeMemberTab === "history" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <h5 className="font-display font-bold text-warm-900 text-xs sm:text-sm">
                          Points Ledger &amp; History
                        </h5>
                        <span className="font-mono text-[11px] text-warm-500">
                          Rolling 12-mo Activity
                        </span>
                      </div>

                      {customerTxData.length === 0 ? (
                        <div className="rounded-2xl border border-warm-200 bg-warm-50/60 p-6 text-center text-xs text-warm-500 font-mono">
                          No transactions recorded yet. Points earned on paid
                          dining will appear here.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customerTxData.map((tx) => (
                            <div
                              key={tx.id}
                              className="rounded-2xl border border-warm-200/90 bg-white p-3 text-xs shadow-xs flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-warm-900">
                                  {tx.description || tx.type}
                                </p>
                                <p className="font-mono text-[10px] text-warm-500">
                                  {tx.created_at
                                    ? new Date(
                                        tx.created_at,
                                      ).toLocaleDateString()
                                    : ""}{" "}
                                  · Balance after: {tx.balance_after}p
                                </p>
                              </div>
                              <span
                                className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg ${
                                  tx.points > 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {tx.points > 0 ? `+${tx.points}` : tx.points}p
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Switch Member Account Action */}
                  <div className="pt-2 text-center border-t border-warm-100">
                    <button
                      type="button"
                      onClick={async () => {
                        if (token) {
                          try {
                            await api(`/tables/${token}/unlink-member`, {
                              method: "POST",
                            });
                          } catch {}
                        }
                        setMemberData(null);
                        setMemberNumberInput("");
                        setMemberPasswordInput("");
                        localStorage.removeItem("mols_customer_member_phone");
                        localStorage.removeItem("mols_customer_member_number");
                      }}
                      className="rounded-xl border border-warm-300 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-100 hover:text-warm-900 transition"
                    >
                      Sign Out / Switch Member Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
