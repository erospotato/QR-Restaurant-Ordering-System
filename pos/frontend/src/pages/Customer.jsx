import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  api,
  formatImageUrl,
  money,
  playChime,
  timeStr,
  useLive,
} from "../lib";

import logo from "../assets/imgs/logo.jpg";

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
        "70% Less Sweet",
        "30% Mild Sweet",
        "Unsweetened (0%)",
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

export default function Customer() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [tableInfo, setTableInfo] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invalid, setInvalid] = useState(false);
  const [sessionSettled, setSessionSettled] = useState(false);
  const [settledTable, setSettledTable] = useState(null);
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

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [showBillConfirmModal, setShowBillConfirmModal] = useState(false);

  // Membership & Rewards State for Customer
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberPhoneInput, setMemberPhoneInput] = useState(() => localStorage.getItem("mols_customer_member_phone") || "");
  const [memberData, setMemberData] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [showRegisterInCustomer, setShowRegisterInCustomer] = useState(false);
  const [customerRegisterForm, setCustomerRegisterForm] = useState({ name: "", phone: "", email: "" });
  const [customerRegisterLoading, setCustomerRegisterLoading] = useState(false);

  // Auto-fetch member info if phone is saved in localStorage
  const lookupMember = useCallback(async (phoneToLookup) => {
    const targetPhone = phoneToLookup || memberPhoneInput;
    if (!targetPhone || !targetPhone.trim()) {
      setMemberError("Please enter your registered phone number.");
      return;
    }
    setMemberLoading(true);
    setMemberError("");
    try {
      const res = await api(`/members/lookup?phone=${encodeURIComponent(targetPhone.trim())}`);
      setMemberData(res);
      localStorage.setItem("mols_customer_member_phone", targetPhone.trim());
      return res;
    } catch (err) {
      setMemberError(err.message || "No membership found for this phone number. You can join below in 10 seconds!");
      setMemberData(null);
      return null;
    } finally {
      setMemberLoading(false);
    }
  }, [memberPhoneInput]);

  useEffect(() => {
    const saved = localStorage.getItem("mols_customer_member_phone");
    if (saved) {
      lookupMember(saved);
    }
  }, [lookupMember]);

  const handleCustomerRegister = async (e) => {
    if (e) e.preventDefault();
    if (!customerRegisterForm.name || !customerRegisterForm.phone) {
      alert("Please provide both name and phone number.");
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
        setMemberPhoneInput(res.member.phone);
        localStorage.setItem("mols_customer_member_phone", res.member.phone);
        setShowRegisterInCustomer(false);
        setMemberError("");
        if (exclusivePromptDish) {
          addToCartDirect(exclusivePromptDish, res.member);
          alert(`Welcome to MOLS MAISON, ${res.member.name}! "${exclusivePromptDish.name}" has been unlocked and added to your order.`);
          setExclusivePromptDish(null);
          setShowMemberModal(false);
        } else {
          alert(res.message || "Welcome to MOLS MAISON Rewards! 50 bonus points added.");
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
  const [orderSuccessToast, setOrderSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load table, menu, and orders
  const loadData = useCallback(async () => {
    try {
      const [t, m, o] = await Promise.all([
        api(`/tables/${token}`),
        api("/menu"),
        api(`/tables/${token}/orders`),
      ]);

      if (t?.redirect_token && t.redirect_token !== token) {
        navigate(`/t/${t.redirect_token}`, { replace: true });
        return;
      }

      if (t?.settled) {
        setSessionSettled(true);
        if (t.table) setSettledTable(t.table);
        setLoading(false);
        setShowSplash(false);
        return;
      }

      setTableInfo(t);
      setMenu(m || []);
      setOrders(o || []);
      setSessionSettled(false);
    } catch (err) {
      if (err.status === 403) {
        setSessionSettled(true);
        setShowSplash(false);
      } else if (err.status === 404) {
        setInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLive(false, loadData);

  const addToCartDirect = (dish, verifiedMember = null) => {
    // If dish is member exclusive, customer must have verified their member phone
    const hasMember = verifiedMember || memberData || localStorage.getItem("mols_customer_member_phone");
    if (dish.is_member_exclusive && !hasMember) {
      setExclusivePromptDish(dish);
      return;
    }

    setCart((prev) => {
      const existing = prev[dish.id];
      if (existing && existing.qty > 0) {
        return {
          ...prev,
          [dish.id]: { ...existing, qty: existing.qty + 1 },
        };
      }
      const config = getItemPreferenceConfig(dish);
      const defaultPref =
        config.type === "drink"
          ? `${config.iceOptions[0]}, ${config.sweetOptions[0]}`
          : config.options[0];
      return {
        ...prev,
        [dish.id]: {
          qty: 1,
          spice: defaultPref,
          notes: "",
        },
      };
    });
    playChime("ticket");
  };

  const openDishDetails = (item) => {
    setActiveItemModal(item);
  };

  const adjustQty = (id, delta) => {
    const dish = menu.find((m) => m.id === id);
    if (delta > 0 && dish?.is_member_exclusive) {
      const hasMember = memberData || localStorage.getItem("mols_customer_member_phone");
      if (!hasMember) {
        setExclusivePromptDish(dish);
        return;
      }
    }

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
      setTimeout(() => setServiceAlert(""), 5500);
    } catch (e) {
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
          member_phone: memberData?.phone || localStorage.getItem("mols_customer_member_phone") || null,
          member_id: memberData?.id || null,
          items: itemsPayload,
        },
      });

      playChime("ticket");
      setCart({});
      setOrderLevelNote("");
      setShowConfirmModal(false);
      setShowCartDrawer(false);
      setOrderSuccessToast(true);
      setTab("orders");
      loadData();
      setTimeout(() => setOrderSuccessToast(false), 5000);
    } catch (err) {
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
      const unitPrice = (dish.is_member_exclusive && dish.promo_price > 0) ? dish.promo_price : dish.price;
      return sum + unitPrice * val.qty;
    }, 0);
  }, [cart, menu]);

  const totalBillAllRounds = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

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
            <span className="font-logo text-base font-semibold text-warm-900">
              MOLS MAISON
            </span>
            {tableNum ? ` at Table #${tableNum}` : ""}! The bill for your table
            has been settled and this session is now closed.
          </p>

          <div className="mt-5 rounded-2xl bg-warm-50 p-4 text-xs text-warm-700 border border-warm-200 text-left space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-warm-900">
              <Icons.Utensils />
              <span>Ordering Locked</span>
            </div>
            <p className="text-warm-600 leading-relaxed">
              Customers are not allowed to place further orders on this settled
              bill. If you wish to order more dishes or drinks, please rescan
              your table's QR code.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {tableNum ? (
              <a
                href={`/scan/${tableNum}`}
                className="w-full rounded-xl bg-warm-900 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-warm-800 transition active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>Rescan Table #{tableNum} QR Code</span>
                <span>→</span>
              </a>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-warm-900 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-warm-800 transition active:scale-95 text-center"
              >
                Refresh Session
              </button>
            )}
            <p className="text-[11px] text-warm-400 font-mono">
              Or point your smartphone camera at the table placard
            </p>
          </div>
        </div>
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
            Your previous session link has expired. Tap your table number below to start viewing the menu and placing orders:
          </p>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <a
                key={num}
                href={`/scan/${num}`}
                className="rounded-xl border border-warm-200 bg-warm-50 py-2.5 text-xs font-bold text-warm-800 hover:bg-warm-900 hover:text-white hover:border-warm-900 transition shadow-xs text-center"
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
      <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-gradient-to-b from-white via-rose-50/40 to-white text-warm-900 select-none animate-in fade-in duration-300">
        {/* Ambient High-End Restaurant Background Artwork with White & Red Style */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80"
            alt="MOLS MAISON Ambience"
            className="h-full w-full object-cover opacity-[0.08] mix-blend-multiply filter blur-[0.5px] scale-105"
          />
          {/* Soft White & Crimson Glow Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.06)_0%,transparent_70%)]" />

          {/* Crimson & Rose Luxury Ambient Orbs */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-4 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -left-20 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
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
              Five Stars Kitchen &amp; Bistro
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
                className="h-full bg-gradient-to-r from-rose-500 via-brand to-brand-dark transition-all duration-500 ease-out shadow-[0_0_12px_rgba(185,28,28,0.5)]"
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
      {/* Toast Alert on Service Call */}
      {serviceAlert && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl bg-warm-900 px-4 py-3 text-sm font-semibold text-white shadow-floating">
            <span className="text-amber-400">🛎️</span>
            <p className="flex-1">{serviceAlert}</p>
          </div>
        </div>
      )}

      {/* Toast Notification on Order Placed */}
      {orderSuccessToast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-700 px-4 py-3.5 text-white shadow-floating">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Icons.Check />
            </span>
            <div className="flex-1 text-sm">
              <p className="font-bold">Order Received by Kitchen</p>
              <p className="text-emerald-100 text-xs">
                Preparing freshly for your table. Add more dishes anytime!
              </p>
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
              <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-xl" />
            </div>
            <div className="min-w-0">
              <h1 className="font-logo text-xl sm:text-2xl font-normal tracking-wide text-warm-900 leading-none truncate">
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
                    ? "bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold"
                    : "text-warm-700 hover:text-warm-950 hover:bg-warm-100/90 active:bg-warm-200 active:text-warm-950"
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => setTab("orders")}
                className={`relative rounded-lg sm:rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 transition ${
                  tab === "orders"
                    ? "bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold"
                    : "text-warm-700 hover:text-warm-950 hover:bg-warm-100/90 active:bg-warm-200 active:text-warm-950"
                }`}
              >
                Orders
                {orders.length > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.2 font-mono text-[11px] font-bold ${
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
                      ? "bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white font-semibold"
                      : "bg-warm-100 text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950"
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setSelectedCategory("top_sale")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                    selectedCategory === "top_sale"
                      ? "bg-rose-700 text-white hover:bg-rose-800 hover:text-white active:bg-rose-900 active:text-white font-semibold"
                      : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 hover:text-rose-950 hover:border-rose-300 active:bg-rose-200 active:text-rose-950"
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
                      : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-300 active:bg-amber-200 active:text-amber-950"
                  }`}
                >
                  <Icons.Star />
                  <span>Chef's Choice</span>
                </button>
                <button
                  onClick={() => setSelectedCategory("promo")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition shadow-xs active:scale-95 ${
                    selectedCategory === "promo"
                      ? "bg-gradient-to-r from-purple-800 to-amber-700 text-white font-semibold shadow-md"
                      : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
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
                        : "bg-warm-100 text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950"
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
                  className="mt-3.5 rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-warm-800 transition"
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
                        className="h-full w-full items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200 text-warm-400"
                        style={{ display: imageUrl ? "none" : "flex" }}
                      >
                        <Icons.Utensils />
                      </div>

                      {/* Badges Overlay */}
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        {item.is_member_exclusive && (
                          <span className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-950/95 to-amber-950/95 text-amber-200 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs shadow-xs">
                            <span>{item.promo_badge || "✦ MEMBER EXCLUSIVE"}</span>
                          </span>
                        )}
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
                        {item.is_member_exclusive && item.promo_price ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs text-warm-400 line-through">
                              {money(item.price)}
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-brand">
                              {money(item.promo_price)}
                            </span>
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded">
                              VIP
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-sm sm:text-base font-semibold text-warm-900 truncate">
                            {money(item.price)}
                          </span>
                        )}

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
                            className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs transition active:scale-95 ${
                              item.is_member_exclusive && !memberData && !localStorage.getItem("mols_customer_member_phone")
                                ? "bg-gradient-to-r from-purple-800 to-amber-700 text-white hover:from-purple-900 hover:to-amber-800 font-semibold"
                                : "bg-warm-900 text-white hover:bg-brand hover:text-white active:bg-brand-dark"
                            }`}
                          >
                            <span>
                              {item.is_member_exclusive && !memberData && !localStorage.getItem("mols_customer_member_phone")
                                ? "✦ Member Unlock"
                                : "+ Order"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Custom note badge if present */}
                      {(inCart.spice || inCart.notes) && inCart.qty > 0 && (
                        <div
                          onClick={() => setShowCartDrawer(true)}
                          className="mt-2 cursor-pointer rounded-lg bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-warm-700 border border-warm-200 truncate flex items-center justify-between"
                          title="Click to view & customize in Order List"
                        >
                          <span className="truncate">
                            <span className="font-semibold text-brand">Pref:</span>{" "}
                            {inCart.spice} {inCart.notes}
                          </span>
                          <span className="text-[10px] text-warm-400 ml-1 shrink-0">Edit →</span>
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
                  {money(totalBillAllRounds)}
                </p>
                <p className="text-xs text-warm-500 mt-0.5">
                  Table #{tableInfo?.table} · All ordered rounds combined
                </p>
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
                  className="mt-3.5 rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
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
                                <span className="font-semibold text-warm-900 break-words leading-snug">
                                  {it.name}
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
                <span className="absolute -top-1.5 -right-1.5 flex min-w-[20px] h-5 px-1 items-center justify-center rounded-full bg-warm-900 font-mono text-[11px] font-bold text-white shadow-sm ring-2 ring-white z-10">
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

      {/* 2. DISH SHOWCASE MODAL (When tapping card for details) */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-warm-950/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in duration-200">
            {/* Modal Image Header */}
            <div className="relative aspect-[16/9] max-h-56 w-full bg-warm-100 overflow-hidden">
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
              <button
                onClick={() => setActiveItemModal(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900">
                    {activeItemModal.name}
                  </h2>
                  <span className="font-mono text-base sm:text-lg font-semibold text-brand shrink-0">
                    {money(activeItemModal.price)}
                  </span>
                </div>
                {activeItemModal.description && (
                  <p className="mt-1.5 text-xs sm:text-sm text-warm-600 leading-relaxed">
                    {activeItemModal.description}
                  </p>
                )}
              </div>

              {/* Member Exclusivity Banner */}
              {activeItemModal.is_member_exclusive && (
                <div className="rounded-2xl bg-gradient-to-r from-purple-900 to-amber-900 text-white p-3.5 border border-amber-400/50 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      ✦ {activeItemModal.promo_badge || "MEMBER EXCLUSIVE PROMOTION"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                      {activeItemModal.min_member_tier || "Bronze"}+ Tier
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    Reserved exclusively for registered MOLS MAISON members.
                    {activeItemModal.promo_price ? (
                      <span> Special Member Price: <strong className="text-amber-200 font-mono">{money(activeItemModal.promo_price)}</strong> (Regular: {money(activeItemModal.price)})</span>
                    ) : null}
                  </p>
                </div>
              )}

              {/* Tags & Information */}
              <div className="flex flex-wrap gap-2 text-xs">
                {activeItemModal.category && (
                  <span className="rounded-md bg-warm-100 px-2.5 py-1 text-warm-700 font-medium capitalize">
                    {activeItemModal.category}
                  </span>
                )}
                {activeItemModal.is_signature && (
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800 font-medium border border-amber-200">
                    ⭐ Chef Signature
                  </span>
                )}
                {activeItemModal.is_top_sale && (
                  <span className="rounded-md bg-rose-50 px-2.5 py-1 text-rose-800 font-medium border border-rose-200">
                    🔥 Top Selling
                  </span>
                )}
                {activeItemModal.is_vegetarian && (
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium border border-emerald-200">
                    🌱 Vegetarian
                  </span>
                )}
                {activeItemModal.is_gluten_free && (
                  <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-800 font-medium border border-sky-200">
                    🌾 Gluten-Free
                  </span>
                )}
              </div>

              {/* Notice that preferences are customized in order list */}
              <div className="rounded-2xl bg-warm-50 p-3 border border-warm-200/80 text-xs text-warm-600 space-y-1">
                <p className="font-medium text-warm-800">
                  💡 Customize Preferences in Order List:
                </p>
                <p className="text-[11px] leading-relaxed text-warm-500">
                  Preferences (ice, sweetness, spice, meat doneness) can be easily adjusted using the radio list options in your order list at any time before submitting.
                </p>
              </div>

              {/* Action Button */}
              {cart[activeItemModal.id]?.qty > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between rounded-xl bg-warm-100 p-2">
                    <span className="text-xs font-semibold text-warm-700">In Order List:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustQty(activeItemModal.id, -1)}
                        className="h-7 w-7 rounded-lg bg-white flex items-center justify-center font-bold text-warm-800 shadow-xs hover:bg-warm-200"
                      >
                        −
                      </button>
                      <span className="font-mono text-sm font-bold text-warm-900 w-6 text-center">
                        {cart[activeItemModal.id].qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustQty(activeItemModal.id, 1)}
                        className="h-7 w-7 rounded-lg bg-brand text-white flex items-center justify-center font-bold shadow-xs hover:bg-brand-dark"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveItemModal(null);
                      setShowCartDrawer(true);
                    }}
                    className="w-full rounded-2xl bg-warm-900 py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand transition flex items-center justify-center gap-2"
                  >
                    <span>View &amp; Customize in Order List →</span>
                  </button>
                </div>
              ) : (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      addToCartDirect(activeItemModal);
                      setActiveItemModal(null);
                    }}
                    className="w-full rounded-2xl bg-brand py-3.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    <Icons.Bag />
                    <span>Add to Order List · {money(activeItemModal.price)}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CART DRAWER (Bottom Sheet / Order List with Radio Preference Lists) */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-warm-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3.5">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Review Table #{tableInfo?.table} Order
                </h2>
                <p className="text-xs text-warm-500 font-mono">
                  {cartTotalQty} item{cartTotalQty !== 1 ? "s" : ""} in this round
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
                  <p className="text-sm font-medium text-warm-600">Your order list is empty</p>
                  <p className="text-xs text-warm-400">Add dishes or drinks from the menu</p>
                </div>
              ) : (
                Object.entries(cart).map(([id, val]) => {
                  const dish = menu.find((m) => m.id === Number(id));
                  if (!dish) return null;
                  const config = getItemPreferenceConfig(dish);
                  const drinkPrefs = config.type === "drink" ? getDrinkPreferences(val.spice, config) : null;

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-warm-200 bg-white p-3 sm:p-3.5 shadow-xs space-y-3"
                    >
                      {/* Top Row: Thumbnail, Name, Price, Stepper, Total, Remove */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-display text-xs sm:text-sm font-bold text-warm-900 truncate">
                                {dish.name}
                              </h4>
                              {dish.is_member_exclusive && (
                                <span className="rounded bg-gradient-to-r from-purple-900 to-amber-900 text-amber-200 px-1.5 py-0.2 text-[9px] font-bold border border-amber-400/40">
                                  {dish.promo_badge || "MEMBER ONLY"}
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] sm:text-xs text-warm-500">
                              {dish.is_member_exclusive && dish.promo_price ? (
                                <span>
                                  <span className="line-through text-warm-400 mr-1">{money(dish.price)}</span>
                                  <span className="font-bold text-brand">{money(dish.promo_price)}</span>
                                </span>
                              ) : (
                                money(dish.price)
                              )}{" "}
                              each
                            </p>
                          </div>
                        </div>

                        {/* Stepper & Line Total */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 rounded-full bg-warm-100 p-0.5 border border-warm-200 shadow-inner">
                            <button
                              type="button"
                              onClick={() => adjustQty(dish.id, -1)}
                              className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-warm-800 shadow-xs hover:bg-warm-100 active:scale-90 transition"
                              title="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-4 sm:w-5 text-center font-mono text-xs font-bold text-warm-900">
                              {val.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQty(dish.id, 1)}
                              className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-xs hover:bg-brand-dark active:scale-90 transition"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <span className="w-14 text-right font-mono text-xs sm:text-sm font-bold text-warm-900">
                            {money(((dish.is_member_exclusive && dish.promo_price > 0) ? dish.promo_price : dish.price) * val.qty)}
                          </span>

                          <button
                            type="button"
                            onClick={() => adjustQty(dish.id, -val.qty)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-warm-400 hover:text-rose-600 hover:bg-rose-50 transition ml-0.5"
                            title="Remove dish"
                          >
                            <Icons.Close />
                          </button>
                        </div>
                      </div>

                      {/* Menu Preferences: Formatted Just Like Radio Lists (matching pill design) */}
                      <div className="rounded-xl bg-warm-50/80 p-2.5 border border-warm-200/80 space-y-2.5">
                        {config.type === "drink" ? (
                          <>
                            {/* Ice Level Radio List */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                  Ice Level
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-brand">
                                  {drinkPrefs.ice}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ice Level">
                                {config.iceOptions.map((opt) => {
                                  const isChecked = drinkPrefs.ice === opt;
                                  return (
                                    <label
                                      key={opt}
                                      className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1 text-xs transition select-none ${
                                        isChecked
                                          ? "bg-warm-950 text-white font-medium shadow-xs"
                                          : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`ice-${dish.id}`}
                                        value={opt}
                                        checked={isChecked}
                                        onChange={() => updateDrinkIce(dish.id, opt, val.spice, config)}
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
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                  Sweetness
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-brand">
                                  {drinkPrefs.sweet}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sweetness">
                                {config.sweetOptions.map((opt) => {
                                  const isChecked = drinkPrefs.sweet === opt;
                                  return (
                                    <label
                                      key={opt}
                                      className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1 text-xs transition select-none ${
                                        isChecked
                                          ? "bg-warm-950 text-white font-medium shadow-xs"
                                          : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`sweet-${dish.id}`}
                                        value={opt}
                                        checked={isChecked}
                                        onChange={() => updateDrinkSweet(dish.id, opt, val.spice, config)}
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
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-warm-500 uppercase">
                                {config.label || "Preference"}
                              </span>
                              <span className="text-[10px] sm:text-[11px] font-mono font-medium text-brand">
                                {val.spice || config.options[0]}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={config.label || "Preference"}>
                              {config.options.map((opt) => {
                                const isChecked = (val.spice || config.options[0]) === opt;
                                return (
                                  <label
                                    key={opt}
                                    className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1 text-xs transition select-none ${
                                      isChecked
                                        ? "bg-warm-950 text-white font-medium shadow-xs"
                                        : "bg-white text-warm-700 hover:bg-warm-100 border border-warm-200"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`pref-${dish.id}`}
                                      value={opt}
                                      checked={isChecked}
                                      onChange={() => updateItemPreference(dish.id, opt)}
                                      className="sr-only"
                                    />
                                    <span>{opt}</span>
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
                            onChange={(e) => updateItemNotes(dish.id, e.target.value)}
                            className="w-full rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs text-warm-800 placeholder-warm-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition font-normal"
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
                  className="w-full rounded-xl border border-warm-300 bg-warm-50 p-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:bg-white font-normal"
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
                <span>Total to Pay Later</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand">
              <span className="text-2xl">🧾</span>
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
              <div className="flex justify-between items-center border-t border-warm-200/80 pt-1.5">
                <span className="text-xs sm:text-sm font-semibold text-warm-800">
                  Current Session Total
                </span>
                <span className="font-mono text-base sm:text-lg font-bold text-brand">
                  {money(totalBillAllRounds)}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-warm-600 leading-relaxed text-left">
              Our floor team and cashier will be notified immediately to prepare
              your final check and bring the wireless payment terminal or paper
              receipt to your table.
            </p>

            <div className="mt-3 flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  callStaff("bill", "Ready to settle bill");
                  setShowBillConfirmModal(false);
                }}
                className="w-full rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
              >
                Yes, Request Bill 🧾
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-700 to-amber-600 text-amber-100 shadow-md">
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
                <strong className="text-warm-900">{exclusivePromptDish.name}</strong> is reserved exclusively for registered MOLS MAISON members.
              </p>
              {exclusivePromptDish.promo_price ? (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 font-medium">
                  Special promotional price: <strong className="font-mono text-brand text-sm">{money(exclusivePromptDish.promo_price)}</strong> (Regular {money(exclusivePromptDish.price)})
                </div>
              ) : null}
            </div>

            <div className="space-y-2 pt-1 text-left">
              <label className="block text-xs font-semibold text-warm-800">
                Enter your Member Phone Number:
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 08123456789"
                  value={memberPhoneInput}
                  onChange={(e) => {
                    setMemberPhoneInput(e.target.value);
                    setMemberError("");
                  }}
                  className="flex-1 rounded-xl border border-warm-300 bg-warm-50 px-3 py-2 text-xs font-mono outline-none focus:border-brand focus:bg-white"
                />
                <button
                  type="button"
                  disabled={memberLoading}
                  onClick={async () => {
                    if (!memberPhoneInput.trim()) {
                      setMemberError("Please enter your registered phone number.");
                      return;
                    }
                    try {
                      setMemberLoading(true);
                      const res = await api(`/members/lookup?phone=${encodeURIComponent(memberPhoneInput.trim())}`);
                      setMemberData(res);
                      localStorage.setItem("mols_customer_member_phone", memberPhoneInput.trim());
                      // Automatically add the dish!
                      addToCartDirect(exclusivePromptDish, res);
                      setExclusivePromptDish(null);
                      alert(`Welcome, ${res.name}! "${exclusivePromptDish.name}" has been unlocked and added to your order.`);
                    } catch (e) {
                      setMemberError("Phone not found. You can register for free below in 10 seconds!");
                    } finally {
                      setMemberLoading(false);
                    }
                  }}
                  className="rounded-xl bg-warm-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand transition shrink-0 disabled:opacity-50"
                >
                  {memberLoading ? "Verifying..." : "Unlock"}
                </button>
              </div>
              {memberError && (
                <p className="text-[11px] text-rose-600 font-medium">{memberError}</p>
              )}
            </div>

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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-warm-950/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4 bg-gradient-to-r from-warm-50 to-amber-50/50">
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
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!memberData ? (
                /* Lookup or Register View */
                <div className="space-y-4">
                  {!showRegisterInCustomer ? (
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
                          <Icons.Star />
                        </div>
                        <h4 className="font-display text-base font-bold text-warm-900">
                          Check Your Membership Status
                        </h4>
                        <p className="mt-1 text-xs text-warm-500 max-w-xs mx-auto">
                          Enter your registered phone number to view your rewards balance, dining perks, and tier progress.
                        </p>
                      </div>

                      {memberError && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                          {memberError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wide">
                          Phone Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="e.g. 08123456789"
                            value={memberPhoneInput}
                            onChange={(e) => setMemberPhoneInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") lookupMember();
                            }}
                            className={inp + " flex-1 font-mono text-sm"}
                          />
                          <button
                            type="button"
                            onClick={() => lookupMember()}
                            disabled={memberLoading}
                            className="rounded-xl bg-warm-900 px-4 py-2 font-display text-xs font-semibold text-white shadow-xs hover:bg-brand transition"
                          >
                            {memberLoading ? "Checking..." : "Look Up"}
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-warm-100 text-center">
                        <p className="text-xs text-warm-500">Not a member yet?</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRegisterInCustomer(true);
                            setMemberError("");
                          }}
                          className="mt-1 font-semibold text-xs text-brand hover:underline"
                        >
                          Join MOLS MAISON Rewards in 10s (+50 Welcome Points) →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* In-Modal Registration Form */
                    <form onSubmit={handleCustomerRegister} className="space-y-3.5">
                      <div className="text-center pb-1">
                        <h4 className="font-display text-base font-bold text-warm-900">
                          Join MOLS MAISON Membership
                        </h4>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          ★ Earn 50 Welcome Points immediately on sign up!
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-warm-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          className={inp + " w-full text-sm"}
                          value={customerRegisterForm.name}
                          onChange={(e) =>
                            setCustomerRegisterForm({ ...customerRegisterForm, name: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-warm-700 mb-1">
                          Phone Number (Member ID)
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 08123456789"
                          className={inp + " w-full font-mono text-sm"}
                          value={customerRegisterForm.phone}
                          onChange={(e) =>
                            setCustomerRegisterForm({ ...customerRegisterForm, phone: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-warm-700 mb-1">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="your.email@example.com"
                          className={inp + " w-full text-sm"}
                          value={customerRegisterForm.email}
                          onChange={(e) =>
                            setCustomerRegisterForm({ ...customerRegisterForm, email: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRegisterInCustomer(false)}
                          className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs font-semibold text-warm-700 hover:bg-warm-200 transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={customerRegisterLoading}
                          className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs font-bold text-white shadow-xs hover:bg-brand-dark transition"
                        >
                          {customerRegisterLoading ? "Creating..." : "Join & Get 50 pts"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Member Logged In View */
                <div className="space-y-4">
                  {/* Digital VIP Membership Card */}
                  <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-xl ${
                    memberData.tier_code === "vip" ? "bg-gradient-to-br from-purple-950 via-slate-900 to-stone-900 border border-purple-400/40" :
                    memberData.tier_code === "gold" ? "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 border border-amber-300/50" :
                    memberData.tier_code === "silver" ? "bg-gradient-to-br from-slate-700 via-stone-700 to-slate-900 border border-slate-300/40" :
                    "bg-gradient-to-br from-stone-800 via-stone-800 to-stone-950 border border-warm-600/40"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-white/15">
                      <div className="flex items-center gap-2">
                        <img src={logo} alt="MOLS MAISON" className="h-7 w-7 object-contain rounded-full bg-white p-0.5" />
                        <span className="font-logo text-lg tracking-wider">MOLS MAISON</span>
                      </div>
                      <span className="rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-xs">
                        {memberData.tier} Tier
                      </span>
                    </div>

                    <div className="my-4 flex items-center justify-between">
                      <div>
                        <div className="text-xl font-display font-bold tracking-wide">{memberData.name}</div>
                        <div className="font-mono text-xs opacity-80 mt-0.5">{memberData.phone}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider opacity-75 font-mono">Available Points</span>
                        <div className="font-mono text-2xl font-black text-amber-300">{memberData.points} pts</div>
                        <div className="text-[10px] opacity-75 font-mono">≈ {money(memberData.points * 0.05)} reward value</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] opacity-90">
                      <span>Perk: {memberData.discount_percent > 0 ? `${memberData.discount_percent}% Off All Dining` : "1 pt per $1 spent"}</span>
                      <span className="font-mono">{memberData.visits_count} visits</span>
                    </div>
                  </div>

                  {/* Tier Progress Bar Card */}
                  {memberData.tier_info && (
                    <div className="rounded-3xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-warm-900">
                          Tier Status &amp; Progress
                        </span>
                        <span className="font-mono text-xs font-semibold text-brand">
                          {memberData.tier_info.progress_percent}% to {memberData.tier_info.next_tier || "Max"}
                        </span>
                      </div>

                      {/* Progress Track */}
                      <div className="h-3 w-full bg-warm-100 rounded-full overflow-hidden p-0.5 border border-warm-200">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-brand rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, memberData.tier_info.progress_percent)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-warm-800">{memberData.tier_info.current_tier}</span>
                        {memberData.tier_info.next_tier ? (
                          <span className="font-bold text-warm-500">Next: {memberData.tier_info.next_tier}</span>
                        ) : (
                          <span className="font-bold text-amber-600">✦ Highest Tier Unlocked!</span>
                        )}
                      </div>

                      {memberData.tier_info.next_tier ? (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 font-medium">
                          Spend <span className="font-bold font-mono">{money(memberData.tier_info.needed)}</span> more to unlock{" "}
                          <span className="font-bold">{memberData.tier_info.next_tier}</span> ({memberData.tier_info.next_perk})!
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-2.5 text-xs text-purple-950 font-medium">
                          You enjoy maximum VIP status with 15% discount and 2x points on every dollar!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lifetime Stats */}
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="rounded-2xl border border-warm-200 bg-warm-50/60 p-3">
                      <span className="text-warm-500 text-[10px] uppercase font-semibold">Total Spent</span>
                      <p className="text-base font-bold text-warm-900 mt-0.5">{money(memberData.total_spent)}</p>
                    </div>
                    <div className="rounded-2xl border border-warm-200 bg-warm-50/60 p-3">
                      <span className="text-warm-500 text-[10px] uppercase font-semibold">Dining Visits</span>
                      <p className="text-base font-bold text-warm-900 mt-0.5">{memberData.visits_count} times</p>
                    </div>
                  </div>

                  {/* Tier Perks Breakdown */}
                  <div className="rounded-3xl border border-warm-200 bg-white p-4 shadow-card space-y-2 text-xs">
                    <h5 className="font-display font-bold text-warm-900 text-xs sm:text-sm">Membership Perks Overview</h5>
                    <div className="divide-y divide-warm-100 font-mono text-[11px]">
                      <div className="py-1.5 flex justify-between">
                        <span className="text-warm-600">🥉 Bronze ($0+)</span>
                        <span className="text-warm-900">1x Points per $1</span>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span className="text-slate-700 font-semibold">🥈 Silver ($100+)</span>
                        <span className="text-warm-900">5% Discount + 1.2x Points</span>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span className="text-amber-800 font-semibold">⭐ Gold ($300+)</span>
                        <span className="text-warm-900">10% Discount + 1.5x Points</span>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span className="text-purple-800 font-bold">💎 VIP ($600+)</span>
                        <span className="text-warm-900">15% Discount + 2x Points</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch Member Account Action */}
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMemberData(null);
                        setMemberPhoneInput("");
                        localStorage.removeItem("mols_customer_member_phone");
                      }}
                      className="text-xs text-warm-500 hover:text-warm-800 underline font-mono"
                    >
                      Check a different phone number
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
