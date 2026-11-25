import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, money, inp, timeStr, ago, formatImageUrl } from '../lib'
import { Icons } from './Icons'
import { useDialog } from '../context/DialogContext'
import logo from '../assets/imgs/logo.jpg'

export default function CashierBilling({ orders = [], tables = [], menu = [], reload = () => {}, cashierName = '' }) {
  const { confirm: confirmDialog } = useDialog()
  const [selectedTable, setSelectedTable] = useState(null)
  const [paymentMode, setPaymentMode] = useState('cash') // 'cash' | 'card' | 'qr' | 'transfer' | 'ewallet'
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountMode, setDiscountMode] = useState('preset') // 'preset' | 'custom'
  const [customDiscountType, setCustomDiscountType] = useState('percent') // 'percent' | 'fixed'
  const [customDiscountVal, setCustomDiscountVal] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  // Membership & Loyalty Program
  const [memberQuery, setMemberQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [isSearchingMember, setIsSearchingMember] = useState(false)
  const [memberDiscountActive, setMemberDiscountActive] = useState(true)
  const [pointsToRedeem, setPointsToRedeem] = useState(0) // points to redeem
  const [showRegisterMemberModal, setShowRegisterMemberModal] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '', email: '' })
  const [isRegisteringMember, setIsRegisteringMember] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [splitCount, setSplitCount] = useState(1)
  const [cashTendered, setCashTendered] = useState('')
  const [cashError, setCashError] = useState('')

  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [lastSettlement, setLastSettlement] = useState(null)
  const [processing, setProcessing] = useState(false)

  const handlePrintReceipt = () => {
    let style = document.getElementById('thermal-print-page-style')
    if (!style) {
      style = document.createElement('style')
      style.id = 'thermal-print-page-style'
      style.textContent = `@page { size: 80mm auto; margin: 0; }`
      document.head.appendChild(style)
    }
    window.print()
    setTimeout(() => {
      const el = document.getElementById('thermal-print-page-style')
      if (el) el.remove()
    }, 2000)
  }

  // Merge modal
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSrc, setMergeSrc] = useState('')
  const [mergeTgt, setMergeTgt] = useState('')

  // Add Dishes Modal
  const [showAddDishModal, setShowAddDishModal] = useState(false)
  const [dishSearch, setDishSearch] = useState('')
  const [dishCategory, setDishCategory] = useState('all')
  const [draftOrderItems, setDraftOrderItems] = useState({}) // { [id]: { id, name, price, qty, notes } }
  const [addingDishes, setAddingDishes] = useState(false)

  // Active orders for selected table
  const activeOrders = useMemo(() => {
    if (!selectedTable) return []
    return (orders || []).filter((o) => o.table === selectedTable)
  }, [orders, selectedTable])

  // Flat list of individual order items for direct increment/decrement/deletion
  const allActiveItems = useMemo(() => {
    const list = []
    activeOrders.forEach((o) => {
      o.items.forEach((it) => {
        list.push({ ...it, order_id: o.id })
      })
    })
    return list
  }, [activeOrders])

  const subtotal = useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + o.total, 0)
  }, [activeOrders])

  // Automatic Member Promotional Dish Discount (applied when member is entered)
  const memberPromoSavings = useMemo(() => {
    if (!selectedMember) return { total: 0, items: [] }
    let total = 0
    const discountedItems = []

    allActiveItems.forEach((it) => {
      const menuItem = (menu || []).find((m) => m.id === it.menu_item_id)
      if (menuItem && menuItem.is_member_exclusive && menuItem.promo_price > 0 && menuItem.promo_price < it.price) {
        const itemSaving = Math.round((it.price - menuItem.promo_price) * it.qty * 100) / 100
        if (itemSaving > 0) {
          total += itemSaving
          discountedItems.push({
            name: it.name,
            regularPrice: it.price,
            promoPrice: menuItem.promo_price,
            qty: it.qty,
            saving: itemSaving,
          })
        }
      }
    })

    return { total: Math.round(total * 100) / 100, items: discountedItems }
  }, [selectedMember, allActiveItems, menu])

  const memberPromoDiscountAmount = memberPromoSavings.total

  const manualDiscountAmount = useMemo(() => {
    const remaining = Math.max(0, subtotal - memberPromoDiscountAmount)
    if (discountMode === 'custom') {
      const val = parseFloat(customDiscountVal) || 0
      if (customDiscountType === 'fixed') {
        return Math.min(remaining, Math.max(0, val))
      }
      return Math.min(remaining, Math.max(0, (remaining * val) / 100))
    }
    return (remaining * (discountPercent || 0)) / 100
  }, [subtotal, memberPromoDiscountAmount, discountMode, customDiscountVal, customDiscountType, discountPercent])

  // Member tier discount (e.g. Silver 5%, Gold 10%, VIP 15%)
  const memberDiscountAmount = useMemo(() => {
    if (!selectedMember || !memberDiscountActive || !selectedMember.discount_percent) return 0
    const remaining = Math.max(0, subtotal - memberPromoDiscountAmount - manualDiscountAmount)
    return Math.round(((remaining * selectedMember.discount_percent) / 100) * 100) / 100
  }, [selectedMember, memberDiscountActive, subtotal, memberPromoDiscountAmount, manualDiscountAmount])

  // Points redemption discount (100 pts = $1.00 USD, minimum 200 pts)
  const pointsDiscountAmount = useMemo(() => {
    if (!selectedMember || !pointsToRedeem) return 0
    const remaining = Math.max(0, subtotal - memberPromoDiscountAmount - manualDiscountAmount - memberDiscountAmount)
    return Math.min(remaining, Math.round((pointsToRedeem / 100) * 100) / 100)
  }, [selectedMember, pointsToRedeem, subtotal, memberPromoDiscountAmount, manualDiscountAmount, memberDiscountAmount])

  const totalDiscount = useMemo(() => {
    return Math.round((memberPromoDiscountAmount + manualDiscountAmount + memberDiscountAmount + pointsDiscountAmount) * 100) / 100
  }, [memberPromoDiscountAmount, manualDiscountAmount, memberDiscountAmount, pointsDiscountAmount])

  const discountAmount = totalDiscount

  const finalTotal = useMemo(() => {
    return Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100)
  }, [subtotal, totalDiscount])

  // Points to be earned on this order (Bronze 1x, Silver 1.25x, Gold 1.5x, VIP 2x)
  const pointsToEarn = useMemo(() => {
    if (!selectedMember) return Math.round(finalTotal)
    const mult = selectedMember.tier_code === 'vip' ? 2.0 :
      selectedMember.tier_code === 'gold' ? 1.5 :
      selectedMember.tier_code === 'silver' ? 1.25 : 1.0
    return Math.round(finalTotal * mult)
  }, [selectedMember, finalTotal])

  const splitShare = useMemo(() => {
    return splitCount > 1 ? finalTotal / splitCount : finalTotal
  }, [finalTotal, splitCount])

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0
    return tendered >= finalTotal ? Math.max(0, Math.round((tendered - finalTotal) * 100) / 100) : 0
  }, [cashTendered, finalTotal])

  // Quick cash buttons for rapid cashier entry
  const quickCashPresets = useMemo(() => {
    if (finalTotal <= 0) return []
    const set = new Set()
    set.add(finalTotal) // Exact
    const ceil = Math.ceil(finalTotal)
    if (ceil > finalTotal) set.add(ceil)
    ;[10, 20, 50, 100].forEach((step) => {
      const mult = Math.ceil(finalTotal / step) * step
      if (mult >= finalTotal) set.add(mult)
    })
    return Array.from(set).sort((a, b) => a - b).slice(0, 5)
  }, [finalTotal])

  // Available dish categories for Add Dishes modal
  const availableCategories = useMemo(() => {
    const cats = new Set()
    ;(menu || []).forEach((m) => {
      if (m.category) cats.add(m.category)
    })
    return ['all', ...Array.from(cats)]
  }, [menu])

  const filteredMenuItems = useMemo(() => {
    return (menu || []).filter((m) => {
      if (!m.is_available) return false
      const matchCat = dishCategory === 'all' || m.category === dishCategory
      const matchSearch =
        !dishSearch.trim() ||
        m.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(dishSearch.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [menu, dishCategory, dishSearch])

  const lastTableRef = useRef(null)
  const manualMemberOverrideRef = useRef(false)

  // Auto-detect & sync linked table member from customer QR login
  useEffect(() => {
    const tableChanged = lastTableRef.current !== selectedTable
    lastTableRef.current = selectedTable

    if (!selectedTable) {
      setSelectedMember(null)
      setMemberQuery('')
      setPointsToRedeem(0)
      manualMemberOverrideRef.current = false
      return
    }

    const tableObj = (tables || []).find((t) => t.number === selectedTable)
    const orderWithMember = (orders || []).find((o) => o.table === selectedTable && o.member)
    const tableMember = tableObj?.member || orderWithMember?.member

    if (tableChanged) {
      manualMemberOverrideRef.current = false
      if (tableMember) {
        setSelectedMember(tableMember)
        setMemberQuery(`${tableMember.name || tableMember.full_name} (${tableMember.phone})`)
        setMemberDiscountActive(true)
        setPointsToRedeem(0)
      } else {
        setSelectedMember(null)
        setMemberQuery('')
        setPointsToRedeem(0)
      }
    } else if (tableMember && !manualMemberOverrideRef.current && (!selectedMember || selectedMember.id !== tableMember.id)) {
      // Customer at this table just logged in via QR!
      setSelectedMember(tableMember)
      setMemberQuery(`${tableMember.name || tableMember.full_name} (${tableMember.phone})`)
      setMemberDiscountActive(true)
      setPointsToRedeem(0)
    }
  }, [selectedTable, tables, orders, selectedMember])

  const isTableMemberSynced = useMemo(() => {
    if (!selectedMember || !selectedTable) return false
    const tableObj = (tables || []).find((t) => t.number === selectedTable)
    const orderWithMember = (orders || []).find((o) => o.table === selectedTable && o.member)
    const tm = tableObj?.member || orderWithMember?.member
    return Boolean(tm && (tm.id === selectedMember.id || tm.phone === selectedMember.phone))
  }, [selectedMember, selectedTable, tables, orders])

  // Member Search & Selection
  const handleSearchMember = async (val) => {
    setMemberQuery(val)
    if (!val || val.trim().length < 2) {
      setMemberSuggestions([])
      return
    }
    setIsSearchingMember(true)
    try {
      const res = await api(`/staff/members/search?q=${encodeURIComponent(val.trim())}`)
      setMemberSuggestions(Array.isArray(res) ? res : [])
    } catch {
      setMemberSuggestions([])
    } finally {
      setIsSearchingMember(false)
    }
  }

  const handleSelectMember = (mem) => {
    manualMemberOverrideRef.current = true
    setSelectedMember(mem)
    setMemberQuery(`${mem.name || mem.full_name} (${mem.phone})`)
    setMemberSuggestions([])
    setPointsToRedeem(0)
    setMemberDiscountActive(true)
  }

  const handleClearMember = () => {
    manualMemberOverrideRef.current = true
    setSelectedMember(null)
    setMemberQuery('')
    setMemberSuggestions([])
    setPointsToRedeem(0)
  }

  const handleRegisterMember = async (e) => {
    if (e) e.preventDefault()
    if (!newMemberForm.name || !newMemberForm.phone) {
      alert('Please enter member name and phone number.')
      return
    }
    setIsRegisteringMember(true)
    try {
      const res = await api('/staff/members', {
        method: 'POST',
        body: newMemberForm,
      })
      if (res?.member) {
        handleSelectMember(res.member)
        setShowRegisterMemberModal(false)
        setNewMemberForm({ name: '', phone: '', email: '' })
        alert(res.message || `Member ${res.member.name} registered successfully!`)
      }
    } catch (err) {
      alert(err.message || 'Failed to register member')
    } finally {
      setIsRegisteringMember(false)
    }
  }

  // Settle Bill
  const handlePay = async () => {
    if (!selectedTable || processing) return
    const tendered = parseFloat(cashTendered) || 0

    if (paymentMode === 'cash') {
      if (!cashTendered || tendered < finalTotal) {
        setCashError(`Please enter cash received from customer (at least ${money(finalTotal)}).`)
        return
      }
    }
    setCashError('')
    setProcessing(true)

    try {
      const res = await api(`/tables/${selectedTable}/pay`, {
        method: 'POST',
        body: {
          payment_method: paymentMode,
          amount_tendered: paymentMode === 'cash' ? tendered : finalTotal,
          change_due: paymentMode === 'cash' ? changeDue : 0,
          tip: 0,
          tax: 0,
          discount_amount: totalDiscount,
          customer_name: selectedMember
            ? `${selectedMember.name} (${selectedMember.phone})`
            : (customerName ? `${customerName}${customerPhone ? ` (${customerPhone})` : ''}` : null),
          member_id: selectedMember?.id || null,
          member_phone: selectedMember?.phone || (customerPhone ? customerPhone.trim() : null),
          points_redeemed: pointsToRedeem,
        },
      })

      const paidInfo = {
        table: selectedTable,
        subtotal,
        discountAmount: totalDiscount,
        discountNote: [
          memberPromoDiscountAmount > 0 ? `Member Promo Dishes (-${money(memberPromoDiscountAmount)})` : null,
          discountMode === 'custom' ? (discountReason || 'Custom Discount') : (discountPercent > 0 ? `${discountPercent}%` : null),
          memberDiscountAmount > 0 ? `${selectedMember?.tier} Member (${selectedMember?.discount_percent}%)` : null,
          pointsDiscountAmount > 0 ? `Redeemed ${pointsToRedeem} pts` : null,
        ].filter(Boolean).join(' + ') || null,
        finalTotal,
        paymentMode,
        tendered: paymentMode === 'cash' ? tendered : finalTotal,
        changeDue: paymentMode === 'cash' ? (res.change_due ?? changeDue) : 0,
        customerName: selectedMember
          ? `${selectedMember.name} (${selectedMember.phone})`
          : (customerName ? `${customerName}${customerPhone ? ` (${customerPhone})` : ''}` : null),
        member: res?.member || selectedMember,
        items: [...allActiveItems],
        cashierName,
        date: new Date().toLocaleString(),
      }

      setLastSettlement(paidInfo)
      alert(`Table #${selectedTable} settled successfully!${paymentMode === 'cash' ? ` Change due: ${money(paidInfo.changeDue)}` : ''}`)
      setShowReceiptModal(true)
      setSelectedTable(null)
      setCashTendered('')
      setCashError('')
      setDiscountPercent(0)
      setDiscountMode('preset')
      setCustomDiscountVal('')
      setDiscountReason('')
      setSelectedMember(null)
      setMemberQuery('')
      setPointsToRedeem(0)
      setCustomerName('')
      setCustomerPhone('')
      reload()
    } catch (e) {
      alert(e.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  // Remove/decrement dish from table
  const handleDecrementItem = async (itemId) => {
    try {
      await api(`/staff/tables/${selectedTable}/remove-item`, {
        method: 'POST',
        body: { item_id: itemId, decrement_only: true },
      })
      reload()
    } catch (err) {
      alert(err.message || 'Failed to decrement item')
    }
  }

  // Increment existing dish
  const handleIncrementItem = async (menuItemId, notes) => {
    try {
      await api(`/staff/tables/${selectedTable}/add-items`, {
        method: 'POST',
        body: { items: [{ id: menuItemId, qty: 1, notes: notes || null }] },
      })
      reload()
    } catch (err) {
      alert(err.message || 'Failed to increment item')
    }
  }

  // Remove item completely
  const handleRemoveItem = async (itemId, itemName) => {
    const ok = await confirmDialog({
      title: 'Remove Dish from Table',
      message: `Are you sure you want to remove "${itemName}" from Table #${selectedTable}?`,
      confirmText: 'Yes, Remove Item',
      cancelText: 'Keep Item',
      type: 'danger',
    })
    if (!ok) return
    try {
      await api(`/staff/tables/${selectedTable}/remove-item`, {
        method: 'POST',
        body: { item_id: itemId },
      })
      reload()
    } catch (err) {
      alert(err.message || 'Failed to remove item')
    }
  }

  // Cancel entire table order and remove all items
  const handleCancelWholeOrder = async () => {
    if (!selectedTable || processing) return
    const ok = await confirmDialog({
      title: `Cancel Entire Order for Table #${selectedTable}?`,
      message: `Are you sure you want to cancel the entire order for Table #${selectedTable}? This will remove all ${allActiveItems.length} active dish(es) and reset Table #${selectedTable} to available.`,
      confirmText: 'Yes, Cancel Order & Remove All Items',
      cancelText: 'Keep Order',
      type: 'danger',
    })
    if (!ok) return

    setProcessing(true)
    try {
      const res = await api(`/staff/tables/${selectedTable}/cancel-order`, {
        method: 'POST',
        body: { reason: 'Cancelled by Cashier' },
      })
      alert(res.message || `Order for Table #${selectedTable} has been completely cancelled.`)
      setSelectedTable(null)
      setSelectedMember(null)
      setMemberQuery('')
      setPointsToRedeem(0)
      setDiscountPercent(0)
      setCustomDiscountVal('')
      setCashTendered('')
      setCashError('')
      reload()
    } catch (err) {
      alert(err.message || 'Failed to cancel order')
    } finally {
      setProcessing(false)
    }
  }

  // Add Dishes to Table from Modal
  const handleDraftQty = (menuItem, delta) => {
    setDraftOrderItems((prev) => {
      const cur = prev[menuItem.id]
      const currentQty = cur ? cur.qty : 0
      const nextQty = Math.max(0, currentQty + delta)
      if (nextQty === 0) {
        const copy = { ...prev }
        delete copy[menuItem.id]
        return copy
      }
      return {
        ...prev,
        [menuItem.id]: {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: nextQty,
          notes: cur ? cur.notes : '',
        },
      }
    })
  }

  const handleDraftNotes = (menuId, note) => {
    setDraftOrderItems((prev) => {
      if (!prev[menuId]) return prev
      return {
        ...prev,
        [menuId]: { ...prev[menuId], notes: note },
      }
    })
  }

  const handleConfirmAddDishes = async () => {
    const items = Object.values(draftOrderItems).filter((i) => i.qty > 0)
    if (items.length === 0) {
      alert('Please select at least 1 dish to add.')
      return
    }
    setAddingDishes(true)
    try {
      await api(`/staff/tables/${selectedTable}/add-items`, {
        method: 'POST',
        body: {
          items: items.map((i) => ({
            id: i.id,
            qty: i.qty,
            notes: i.notes ? i.notes.trim() : null,
          })),
        },
      })
      setShowAddDishModal(false)
      setDraftOrderItems({})
      setDishSearch('')
      reload()
    } catch (err) {
      alert(err.message || 'Failed to add dishes to table')
    } finally {
      setAddingDishes(false)
    }
  }

  const draftCount = useMemo(() => {
    return Object.values(draftOrderItems).reduce((acc, i) => acc + i.qty, 0)
  }, [draftOrderItems])

  const draftSubtotal = useMemo(() => {
    return Object.values(draftOrderItems).reduce((acc, i) => acc + i.price * i.qty, 0)
  }, [draftOrderItems])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Cashier Check-out Station
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Table billing · Split calculation · Add &amp; remove dishes · Receipt generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-medium text-warm-800 bg-warm-100 rounded-xl px-3 py-1.5">
            Active: {tables.filter((t) => t.status === 'occupied').length} / {tables.length} Tables
          </span>
          <button
            onClick={() => {
              setMergeSrc(selectedTable ? String(selectedTable) : '')
              setMergeTgt('')
              setShowMerge(true)
            }}
            className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-purple-900 hover:bg-purple-100 hover:text-purple-950 active:bg-purple-200 active:text-purple-950 transition"
          >
            Merge Tables
          </button>
          <button
            onClick={reload}
            className="rounded-xl bg-warm-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Table Map (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-warm-600 block">
            Floor Map (Select Table)
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map((t) => {
              const isOccupied = t.status === 'occupied' || t.order_count > 0
              const isSelected = selectedTable === t.number
              return (
                <button
                  key={t.number}
                  onClick={() => setSelectedTable(t.number)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                    isSelected
                      ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-card text-warm-950'
                      : isOccupied
                      ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 shadow-card'
                      : 'border-warm-200 bg-white hover:bg-warm-50 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-display text-base font-bold text-warm-900">
                        Table #{t.number}
                      </span>
                      <p className="text-xs font-mono text-warm-500">{t.capacity} seats</p>
                    </div>
                    <span
                      className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-brand text-white'
                          : isOccupied
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-warm-100 text-warm-600'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : isOccupied ? 'OCCUPIED' : 'FREE'}
                    </span>
                  </div>

                  {t.member && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 truncate">
                      <span>⭐</span>
                      <span className="truncate">{t.member.name || t.member.full_name} ({t.member.tier})</span>
                    </div>
                  )}

                  {t.merged_with && (
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      <span>Linked to #{t.merged_with}</span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const ok = await confirmDialog({
                            title: 'Unmerge Table',
                            message: `Unmerge Table #${t.number}? It will return to a standalone dining table.`,
                            confirmText: 'Yes, Unmerge',
                            cancelText: 'Cancel',
                            type: 'warning',
                          })
                          if (!ok) return
                          try {
                              await api('/staff/tables/unmerge', {
                                method: 'POST',
                                body: { number: t.number },
                              })
                              reload()
                            } catch (err) {
                              alert(err.message || 'Failed to unmerge')
                            }
                        }}
                        className="text-rose-600 hover:text-rose-800 underline ml-1 font-semibold"
                      >
                        Unmerge
                      </button>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-warm-200/60 flex items-center justify-between">
                    <span className="text-xs text-warm-500 font-medium">Balance</span>
                    <span className={`font-mono text-sm sm:text-base font-semibold ${isOccupied ? 'text-amber-900' : 'text-warm-400'}`}>
                      {money(t.unpaid_total)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Checkout Panel (Right 1 col with High Contrast) */}
        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card lg:sticky lg:top-20 h-fit space-y-4">
          {!selectedTable ? (
            <div className="py-12 text-center text-warm-400">
              <span className="text-4xl">🧾</span>
              <p className="mt-2 font-display text-base font-semibold text-warm-800">No Table Selected</p>
              <p className="text-xs sm:text-sm text-warm-500">Select a table from the floor map to bill or add dishes.</p>
            </div>
          ) : (
            <>
              {/* Table Header & Quick Add Dishes Action */}
              <div className="flex items-center justify-between border-b border-warm-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                    Table #{selectedTable} Bill
                  </h3>
                  <p className="text-xs font-mono text-warm-500 mt-0.5">
                    {activeOrders.length} ticket round{activeOrders.length > 1 ? 's' : ''} · {allActiveItems.length} active dish{allActiveItems.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setDraftOrderItems({})
                      setDishSearch('')
                      setShowAddDishModal(true)
                    }}
                    className="flex items-center gap-1 rounded-xl bg-brand/10 border border-brand/20 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition active:scale-95"
                    title="Add dishes to table"
                  >
                    <span>+</span>
                    <span>Add Dish</span>
                  </button>
                  {allActiveItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCancelWholeOrder}
                      disabled={processing}
                      className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Cancel entire order and remove all items"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Cancel Order</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 text-xs"
                    title="Deselect"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Linked / Merged Notice */}
              {(() => {
                const curTable = tables.find((t) => t.number === selectedTable)
                if (curTable?.merged_with) {
                  return (
                    <div className="flex items-center justify-between rounded-xl bg-purple-50 p-2.5 text-xs font-medium text-purple-900 border border-purple-200">
                      <span>Merged into Table #{curTable.merged_with}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api('/staff/tables/unmerge', {
                              method: 'POST',
                              body: { number: selectedTable },
                            })
                            alert(`Table #${selectedTable} unmerged successfully!`)
                            reload()
                          } catch (e) {
                            alert(e.message || 'Failed to unmerge')
                          }
                        }}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-white font-semibold text-xs hover:bg-rose-700 active:bg-rose-800 transition"
                      >
                        Unmerge Table
                      </button>
                    </div>
                  )
                }
                return null
              })()}

              {allActiveItems.length === 0 ? (
                <div className="py-8 text-center text-warm-400 space-y-3">
                  <p className="text-xs sm:text-sm text-warm-500">No active dishes ordered for Table #{selectedTable}.</p>
                  <button
                    onClick={() => {
                      setDraftOrderItems({})
                      setDishSearch('')
                      setShowAddDishModal(true)
                    }}
                    className="rounded-xl bg-brand px-4 py-2 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark transition"
                  >
                    + Add Dishes to Table #{selectedTable}
                  </button>
                </div>
              ) : (
                <>
                  {/* Itemized active items with Quantity Controls & Remove */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-600 mb-1.5">
                      <span>Table Dishes ({allActiveItems.length})</span>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftOrderItems({})
                            setDishSearch('')
                            setShowAddDishModal(true)
                          }}
                          className="text-brand font-semibold text-xs hover:underline flex items-center gap-0.5"
                        >
                          <span>+ Add More</span>
                        </button>
                        <span className="text-warm-300">·</span>
                        <button
                          type="button"
                          onClick={handleCancelWholeOrder}
                          disabled={processing}
                          className="text-rose-600 hover:text-rose-800 hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Cancel entire order and remove all items"
                        >
                          <span>Cancel Entire Order</span>
                        </button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-2 divide-y divide-warm-100 pr-1">
                      {allActiveItems.map((it) => (
                        <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs sm:text-sm">
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-semibold text-warm-900 truncate">{it.name}</span>
                              {(it.is_member_exclusive || (it.notes && it.notes.includes('Member Exclusive'))) && (
                                <span className="rounded bg-purple-100 text-purple-900 text-[9px] font-bold px-1.5 py-0.2 border border-purple-200">
                                  ✦ VIP Exclusive
                                </span>
                              )}
                              <span className="font-mono text-warm-500 text-[11px]">({money(it.price)})</span>
                            </div>
                            {it.notes && (
                              <p className="text-[11px] text-amber-700 italic truncate">Note: {it.notes}</p>
                            )}
                          </div>

                          {/* Stepper & Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center rounded-lg border border-warm-300 bg-warm-50 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleDecrementItem(it.id)}
                                className="h-6 w-6 flex items-center justify-center text-warm-700 hover:bg-warm-200 active:bg-warm-300 text-xs font-bold"
                                title="Decrease qty"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-xs text-warm-950">
                                {it.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrementItem(it.menu_item_id, it.notes)}
                                className="h-6 w-6 flex items-center justify-center text-warm-700 hover:bg-warm-200 active:bg-warm-300 text-xs font-bold"
                                title="Increase qty"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-mono font-semibold text-warm-900 w-14 text-right">
                              {money(it.price * it.qty)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id, it.name)}
                              className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-xs"
                              title="Delete dish from table"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discount / Promo buttons */}
                  <div className="pt-1.5 border-t border-warm-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-600">
                      <span>Discount / Promo</span>
                      {manualDiscountAmount > 0 && (
                        <span className="text-emerald-700 font-mono font-bold">-{money(manualDiscountAmount)}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-xs">
                      {[0, 5, 10, 15].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDiscountMode('preset')
                            setDiscountPercent(d)
                            setCustomDiscountVal('')
                          }}
                          className={`rounded-xl py-1.5 font-mono font-medium transition ${
                            discountMode === 'preset' && discountPercent === d
                              ? 'bg-warm-900 text-white shadow-xs font-semibold'
                              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                          }`}
                        >
                          {d === 0 ? 'None' : `${d}%`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountMode('custom')
                          setDiscountPercent(0)
                        }}
                        className={`rounded-xl py-1.5 font-mono font-medium transition ${
                          discountMode === 'custom'
                            ? 'bg-warm-900 text-white shadow-xs font-semibold'
                            : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                        }`}
                      >
                        Custom
                      </button>
                    </div>

                    {discountMode === 'custom' && (
                      <div className="rounded-2xl bg-warm-50 p-2.5 border border-warm-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex rounded-lg bg-warm-200 p-0.5 text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setCustomDiscountType('percent')}
                              className={`px-2 py-0.5 rounded ${customDiscountType === 'percent' ? 'bg-white text-warm-950 shadow-xs' : 'text-warm-700'}`}
                            >
                              % Off
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomDiscountType('fixed')}
                              className={`px-2 py-0.5 rounded ${customDiscountType === 'fixed' ? 'bg-white text-warm-950 shadow-xs' : 'text-warm-700'}`}
                            >
                              $ Fixed
                            </button>
                          </div>
                          <input
                            type="number"
                            placeholder={customDiscountType === 'percent' ? 'e.g. 20' : 'e.g. 15.00'}
                            value={customDiscountVal}
                            onChange={(e) => setCustomDiscountVal(e.target.value)}
                            className="flex-1 rounded-xl border border-warm-300 p-1 font-mono text-xs font-semibold outline-none focus:border-brand bg-white"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Reason (e.g. Manager Approval, VIP, Birthday)"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="w-full rounded-xl border border-warm-300 p-1 text-xs outline-none focus:border-brand bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Customer Loyalty & Membership Section */}
                  <div className="pt-2 border-t border-warm-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-600">
                      <span className="flex items-center gap-1.5 text-amber-800">
                        <Icons.Star />
                        Customer Membership &amp; Rewards
                      </span>
                      {!selectedMember && (
                        <div className="flex items-center gap-2">
                          <Link
                            to="/members"
                            className="text-[11px] font-semibold text-warm-600 hover:text-brand hover:underline font-mono"
                            title="Open VIP Customers Directory"
                          >
                            VIP List ↗
                          </Link>
                          <span className="text-warm-300">·</span>
                          <button
                            type="button"
                            onClick={() => setShowRegisterMemberModal(true)}
                            className="text-[11px] font-semibold text-brand hover:underline font-mono"
                          >
                            + Register
                          </button>
                        </div>
                      )}
                    </div>

                    {!selectedMember ? (
                      <div className="relative">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Enter membership # or phone number..."
                            value={memberQuery}
                            onChange={(e) => handleSearchMember(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (memberSuggestions.length > 0) {
                                  handleSelectMember(memberSuggestions[0])
                                }
                              }
                            }}
                            className="w-full rounded-xl border border-warm-300 p-2 text-xs font-medium outline-none focus:border-brand shadow-2xs"
                          />
                        </div>

                        {/* Autocomplete Suggestions Dropdown */}
                        {memberSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-warm-200 bg-white p-1.5 shadow-xl space-y-1">
                            {memberSuggestions.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectMember(m)}
                                className="w-full text-left rounded-xl p-2 hover:bg-warm-100 flex items-center justify-between transition text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-warm-900">{m.name} <span className="text-[10px] text-warm-400 font-mono">#{m.id}</span></div>
                                  <div className="font-mono text-[11px] text-warm-500">{m.phone}</div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-block px-1.5 py-0.2 rounded font-mono text-[10px] font-bold uppercase ${
                                    m.tier_code === 'vip' ? 'bg-purple-100 text-purple-900' :
                                    m.tier_code === 'gold' ? 'bg-amber-100 text-amber-900' :
                                    m.tier_code === 'silver' ? 'bg-slate-100 text-slate-800' :
                                    'bg-warm-100 text-warm-800'
                                  }`}>
                                    {m.tier}
                                  </span>
                                  <div className="font-mono text-[11px] text-amber-700 font-bold">{m.points} pts</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Selected Member Card */
                      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-3 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-bold shadow-2xs">
                              ⭐
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-display font-bold text-warm-900 text-sm">{selectedMember.name || selectedMember.full_name}</span>
                                {isTableMemberSynced && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-300">
                                    <Icons.Check className="w-3 h-3 text-emerald-600" />
                                    Auto-synced from Table QR
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-warm-600">{selectedMember.phone}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono uppercase shadow-2xs border ${
                              selectedMember.tier_code === 'vip' ? 'bg-purple-600 text-white border-purple-700' :
                              selectedMember.tier_code === 'gold' ? 'bg-amber-500 text-white border-amber-600' :
                              selectedMember.tier_code === 'silver' ? 'bg-slate-600 text-white border-slate-700' :
                              'bg-warm-700 text-white border-warm-800'
                            }`}>
                              {selectedMember.tier}
                            </span>
                            <button
                              type="button"
                              onClick={handleClearMember}
                              className="rounded-lg p-1 text-warm-500 hover:bg-warm-200 hover:text-warm-900 transition"
                              title="Deselect member"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Points & Perk Details */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60 font-mono text-[11px]">
                          <div>
                            <span className="text-warm-500">Available Points:</span>
                            <p className="font-bold text-amber-900">{selectedMember.points} pts (~{money(selectedMember.points / 100)})</p>
                          </div>
                          <div>
                            <span className="text-warm-500">Tier Perk:</span>
                            <p className="font-bold text-emerald-800">
                              {selectedMember.discount_percent > 0 ? `${selectedMember.discount_percent}% Discount (${selectedMember.tier})` : '1x pt per $1 spent'}
                            </p>
                          </div>
                        </div>

                        {/* Paid Annual Membership (Maison Privé) Badge */}
                        {selectedMember.membership?.is_prive && (
                          <div className="rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 p-2 text-white flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">👑</span>
                              <div>
                                <p className="font-bold text-[11px] tracking-wide">Maison Privé Member</p>
                                <p className="text-[9px] text-purple-200">Priority Concierge &amp; Welcome Drinks</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-purple-200 uppercase bg-purple-800/80 px-2 py-0.5 rounded-full border border-purple-600/50">
                              Active
                            </span>
                          </div>
                        )}

                        {/* Birthday Month Notice */}
                        {selectedMember.birthday_info?.is_birthday_month && (
                          <div className="rounded-xl bg-amber-50 border border-amber-300 p-2 text-[11px] text-amber-900 flex items-center gap-2">
                            <span>🎂</span>
                            <div>
                              <span className="font-bold">Birthday Month: </span>
                              <span>{selectedMember.birthday_info?.available_reward?.description || 'Complimentary Birthday Dessert available!'}</span>
                            </div>
                          </div>
                        )}

                        {/* Member Tier Discount Toggle */}
                        {selectedMember.discount_percent > 0 && (
                          <label className="flex items-center justify-between pt-1 cursor-pointer select-none">
                            <span className="text-xs font-semibold text-warm-800">
                              Apply {selectedMember.tier} ({selectedMember.discount_percent}%) Discount:
                            </span>
                            <input
                              type="checkbox"
                              checked={memberDiscountActive}
                              onChange={(e) => setMemberDiscountActive(e.target.checked)}
                              className="h-4 w-4 rounded accent-brand cursor-pointer"
                            />
                          </label>
                        )}

                        {/* Automatic Member Promo Dishes Savings */}
                        {memberPromoSavings.items.length > 0 && (
                          <div className="rounded-xl bg-purple-100/90 p-2.5 border border-purple-200 text-xs text-purple-950 space-y-1">
                            <div className="flex items-center justify-between font-bold text-[11px] text-purple-900">
                              <span>✦ Member Exclusive Dish Savings</span>
                              <span className="font-mono text-purple-900 font-bold">-{money(memberPromoDiscountAmount)}</span>
                            </div>
                            <div className="space-y-0.5 text-[10px] text-purple-800">
                              {memberPromoSavings.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span className="truncate">{it.qty}× {it.name}</span>
                                  <span className="font-mono font-semibold">({money(it.regularPrice)} → {money(it.promoPrice)})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Redeem Points Option (Min 200 pts) */}
                        {selectedMember.points >= 200 && (
                          <div className="pt-1 border-t border-amber-200/60 flex items-center justify-between text-xs">
                            <span className="font-medium text-warm-700">Redeem Points:</span>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              {[0, 200, 500, 1000, 2000].filter(pts => pts === 0 || pts <= selectedMember.points).map(pts => (
                                <button
                                  key={pts}
                                  type="button"
                                  onClick={() => setPointsToRedeem(pts)}
                                  className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold transition ${
                                    pointsToRedeem === pts
                                      ? 'bg-amber-900 text-white shadow-2xs'
                                      : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                  }`}
                                >
                                  {pts === 0 ? 'None' : `-${money(pts / 100)} (${pts}p)`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Points to earn preview */}
                        <div className="pt-1 text-[11px] font-mono text-warm-500 flex justify-between">
                          <span>Points to earn on this bill:</span>
                          <span className="font-bold text-brand">+{pointsToEarn} pts</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Split Bill Calculator */}
                  <div className="pt-1.5 border-t border-warm-100">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-600 mb-1">
                      <span>Split Check</span>
                      {splitCount > 1 && (
                        <span className="text-brand font-mono font-semibold text-xs sm:text-sm">
                          {money(splitShare)} / person
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitCount(n)}
                          className={`rounded-xl py-1.5 font-mono font-medium transition ${
                            splitCount === n
                              ? 'bg-warm-900 text-white shadow-xs font-semibold'
                              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                          }`}
                        >
                          {n === 1 ? '1 Pay' : `${n} Ways`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="border-t border-warm-200 pt-2.5 space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between text-warm-600 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono text-warm-900 font-semibold">{money(subtotal)}</span>
                    </div>

                    {memberPromoDiscountAmount > 0 && (
                      <div className="flex justify-between text-purple-800 font-medium bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                        <span>✦ Member Exclusive Dish Savings</span>
                        <span className="font-mono font-bold">-{money(memberPromoDiscountAmount)}</span>
                      </div>
                    )}

                    {manualDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Discount {discountReason ? `(${discountReason})` : ''}</span>
                        <span className="font-mono">-{money(manualDiscountAmount)}</span>
                      </div>
                    )}

                    {memberDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Member Discount ({selectedMember?.tier} {selectedMember?.discount_percent}%)</span>
                        <span className="font-mono">-{money(memberDiscountAmount)}</span>
                      </div>
                    )}

                    {pointsDiscountAmount > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Points Redeemed ({pointsToRedeem} pts)</span>
                        <span className="font-mono">-{money(pointsDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base sm:text-lg font-bold text-warm-900 pt-1.5 border-t border-warm-100">
                      <span>Total Due</span>
                      <span className="font-mono text-brand text-lg sm:text-xl font-bold">{money(finalTotal)}</span>
                    </div>

                    {selectedMember && (
                      <div className="flex justify-between text-[11px] font-mono text-warm-500 pt-0.5">
                        <span>Points to be awarded:</span>
                        <span className="font-bold text-amber-800">+{pointsToEarn} pts</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Mode Selector (5 Modes) */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-warm-600">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-5 gap-1 text-[11px] sm:text-xs">
                      {[
                        { id: 'cash', label: 'Cash' },
                        { id: 'card', label: 'Card' },
                        { id: 'qr', label: 'QR Pay' },
                        { id: 'transfer', label: 'Transfer' },
                        { id: 'ewallet', label: 'E-Wallet' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setPaymentMode(m.id)
                            setCashError('')
                          }}
                          className={`rounded-xl py-2 font-display text-center font-medium transition ${
                            paymentMode === m.id
                              ? 'bg-warm-900 text-white shadow-xs font-semibold'
                              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Payment Tender Calculator & Quick Cash Buttons */}
                  {paymentMode === 'cash' && (
                    <div className={`rounded-2xl p-3 border space-y-2.5 transition ${
                      cashError
                        ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300'
                        : 'border-warm-200 bg-warm-50'
                    }`}>
                      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-warm-800">
                        <span>Amount Given by Customer ($):</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashTendered}
                          onChange={(e) => {
                            setCashTendered(e.target.value)
                            setCashError('')
                          }}
                          className="w-28 rounded-xl border border-warm-300 p-1.5 font-mono text-right text-sm font-bold outline-none focus:border-brand bg-white"
                        />
                      </div>

                      {/* Quick Cash Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-warm-500 mr-1">Quick:</span>
                        {quickCashPresets.map((amt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCashTendered(String(amt))
                              setCashError('')
                            }}
                            className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition active:scale-95 ${
                              parseFloat(cashTendered) === amt
                                ? 'bg-warm-900 text-white shadow-xs'
                                : 'bg-white border border-warm-300 text-warm-800 hover:bg-warm-100'
                            }`}
                          >
                            {amt === finalTotal ? `Exact ($${amt.toFixed(2)})` : `$${amt.toFixed(2)}`}
                          </button>
                        ))}
                      </div>

                      {cashError && (
                        <p className="text-xs text-rose-700 font-semibold flex items-center gap-1 animate-pulse">
                          <span>⚠️</span>
                          <span>{cashError}</span>
                        </p>
                      )}

                      {/* Change Due Display */}
                      {parseFloat(cashTendered) >= finalTotal && (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-100/90 p-2.5 border border-emerald-300 font-mono text-emerald-900">
                          <span className="text-xs font-bold uppercase tracking-wider">Change to Return:</span>
                          <span className="text-lg sm:text-xl font-black">{money(changeDue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="flex items-center justify-center gap-1.5 flex-1 rounded-xl border border-warm-300 py-3 text-xs sm:text-sm font-semibold text-warm-800 hover:bg-warm-100 hover:text-warm-950 active:bg-warm-200 transition"
                    >
                      <Icons.Print />
                      <span>Receipt</span>
                    </button>

                    <button
                      onClick={handlePay}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 font-display text-xs sm:text-sm font-bold tracking-wide text-white uppercase shadow-md hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 transition disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : paymentMode === 'cash' && (!cashTendered || parseFloat(cashTendered) < finalTotal) ? 'Enter Cash Given' : 'Settle & Close'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Dishes Modal for Cashier */}
      {showAddDishModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-warm-200 flex items-center justify-between bg-warm-50">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Add Dishes to Table #{selectedTable}
                </h3>
                <p className="text-xs text-warm-500 font-mono mt-0.5">
                  Select menu dishes to dispatch directly to the kitchen ticket line
                </p>
              </div>
              <button
                onClick={() => setShowAddDishModal(false)}
                className="rounded-xl p-1.5 text-warm-500 hover:bg-warm-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-warm-100 space-y-2.5 bg-white">
              <input
                type="text"
                placeholder="Search dishes by name or category..."
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                className={inp + ' w-full text-xs sm:text-sm'}
              />
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDishCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                      dishCategory === cat
                        ? 'bg-warm-900 text-white shadow-xs'
                        : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMenuItems.map((item) => {
                const inDraft = draftOrderItems[item.id]
                const qty = inDraft ? inDraft.qty : 0
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-warm-200 bg-white p-3 shadow-soft hover:border-warm-300 transition"
                  >
                    <div className="flex items-start gap-2.5">
                      {formatImageUrl(item.image_url) && (
                        <img
                          src={formatImageUrl(item.image_url)}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover shrink-0 bg-warm-100"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-warm-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-warm-500 capitalize">{item.category}</p>
                        <p className="font-mono text-xs sm:text-sm font-bold text-brand mt-1">{money(item.price)}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-warm-100 flex items-center justify-between">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <div className="flex items-center rounded-xl bg-warm-100 border border-warm-200">
                            <button
                              type="button"
                              onClick={() => handleDraftQty(item, -1)}
                              className="h-7 w-7 flex items-center justify-center font-bold text-warm-700 hover:bg-warm-200 rounded-l-xl"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-xs text-warm-950">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDraftQty(item, 1)}
                              className="h-7 w-7 flex items-center justify-center font-bold text-warm-700 hover:bg-warm-200 rounded-r-xl"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-mono text-xs font-bold text-warm-900">
                            {money(item.price * qty)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDraftQty(item, 1)}
                          className="w-full rounded-xl bg-warm-900 py-1.5 text-xs font-semibold text-white hover:bg-warm-800 active:scale-95 transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected Items Tray Footer */}
            {draftCount > 0 && (
              <div className="border-t border-warm-200 bg-warm-50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-700">
                  <span>Selected Dishes to Dispatch ({draftCount})</span>
                  <span className="font-mono text-sm font-bold text-brand">{money(draftSubtotal)}</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-warm-200/60">
                  {Object.values(draftOrderItems).map((d) => (
                    <div key={d.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-warm-900">{d.qty}× {d.name}</span>
                        <input
                          type="text"
                          placeholder="Dish instruction (e.g. less spicy, no onion)"
                          value={d.notes || ''}
                          onChange={(e) => handleDraftNotes(d.id, e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-warm-300 p-1 text-[11px] outline-none bg-white focus:border-brand"
                        />
                      </div>
                      <span className="font-mono font-semibold text-warm-900 shrink-0">{money(d.price * d.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDraftOrderItems({})}
                    className="rounded-xl border border-warm-300 px-3 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-200"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddDishes}
                    disabled={addingDishes}
                    className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-dark active:scale-95 transition disabled:opacity-50"
                  >
                    {addingDishes ? 'Sending to Kitchen...' : `Confirm & Add ${draftCount} Dishes to Table #${selectedTable}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
{/* Printable Thermal Receipt Modal */}
{showReceiptModal && (lastSettlement || selectedTable) && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:bg-transparent print:p-0 print:static print:overflow-visible">

    <div className="w-[320px] max-w-full max-h-[90vh] my-auto flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:w-[80mm] print:rounded-none print:overflow-visible print:my-0">

      {/* Scrollable Receipt Body */}
      <div className="overflow-y-auto flex-1 p-4 sm:p-5 print:overflow-visible print:p-0">
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
              MONACO
            </p>

            <div className="my-1 text-[9px] tracking-[0.3em]">
              ✦ · ✦ · ✦
            </div>

            <p className="text-[9px]">
              12 Avenue des Spélugues
            </p>
            <p className="text-[9px]">
              Monaco · Tel: +377 67 67 67
            </p>

          </div>

          {/* Receipt Information */}
          <div className="py-2 border-b border-dashed border-black space-y-1">

            <div className="flex justify-between font-bold">
              <span>RECEIPT</span>
              <span>#{lastSettlement?.id || "0001"}</span>
            </div>

            <div className="flex justify-between">
              <span>Table Number</span>
              <span>#{lastSettlement ? lastSettlement.table : selectedTable}</span>
            </div>

            <div className="flex justify-between">
              <span>Server</span>
              <span>{cashierName}</span>
            </div>

            {lastSettlement?.customerName && (
              <div className="flex justify-between">
                <span>Guest</span>
                <span className="font-semibold">{lastSettlement.customerName}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Date</span>
              <span>{lastSettlement ? lastSettlement.date : new Date().toLocaleString()}</span>
            </div>

          </div>

          {/* Order Items */}
          <div className="py-2 space-y-1.5 border-b border-dashed border-black">

            <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider pb-0.5">
              <span>Item Description</span>
              <span>Amount</span>
            </div>

            {(lastSettlement ? lastSettlement.items : allActiveItems).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 text-[11px]">
                <span className="flex-1 break-words">
                  {item.qty} × {item.name}
                </span>
                <span className="shrink-0 font-medium">
                  {money(item.price * item.qty)}
                </span>
              </div>
            ))}

          </div>

          {/* Payment Summary */}
          <div className="space-y-1.5 pt-1 text-[11px]">

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(lastSettlement ? lastSettlement.subtotal : subtotal)}</span>
            </div>

            {(lastSettlement ? lastSettlement.discountAmount : totalDiscount) > 0 && (
              <div className="flex justify-between">
                <span>
                  Discount {lastSettlement?.discountNote ? `(${lastSettlement.discountNote})` : ""}
                </span>
                <span>-{money(lastSettlement ? lastSettlement.discountAmount : totalDiscount)}</span>
              </div>
            )}

            {lastSettlement?.member && (
              <div className="py-1 border-t border-dashed border-black my-1 space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>✦ Member</span>
                  <span>{lastSettlement.member.tier} Tier</span>
                </div>
                {(lastSettlement.member.membership?.is_prive || lastSettlement.member.is_maison_prive) && (
                  <div className="flex justify-between text-[10px] font-bold text-black">
                    <span>👑 Annual Plan</span>
                    <span>Maison Privé</span>
                  </div>
                )}
                {lastSettlement.member.tier_upgraded && (
                  <div className="text-[10px] font-bold text-center py-0.5 border border-dashed border-black rounded my-0.5">
                    ★ TIER UPGRADE: Elevated to {lastSettlement.member.tier}! ★
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span>Points Earned Today</span>
                  <span className="font-bold">+{lastSettlement.member.points_earned_this_visit || 0} pts</span>
                </div>
                {lastSettlement.member.points_redeemed_this_visit > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span>Points Redeemed Today</span>
                    <span className="font-bold">-{lastSettlement.member.points_redeemed_this_visit} pts</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span>Current Total Balance</span>
                  <span className="font-bold">{lastSettlement.member.points} pts</span>
                </div>
              </div>
            )}

          </div>

          {/* Grand Total */}
          <div className="border-y-2 border-double border-black py-2">
            <div className="flex justify-between items-center font-black text-xs sm:text-sm">
              <span>TOTAL PAID</span>
              <span>
                {money(lastSettlement ? lastSettlement.finalTotal : finalTotal)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-1.5 text-[11px]">

            <div className="flex justify-between">
              <span>Payment Method</span>
              <span className="uppercase font-bold">
                {lastSettlement ? lastSettlement.paymentMode : paymentMode}
              </span>
            </div>

            <div className="flex justify-between font-bold">
              <span>Payment Status</span>
              <span>✓ PAID</span>
            </div>

            {(lastSettlement ? lastSettlement.paymentMode : paymentMode) === "cash" && (
              <>
                <div className="flex justify-between">
                  <span>Amount Tendered</span>
                  <span>
                    {money(lastSettlement ? lastSettlement.tendered : (parseFloat(cashTendered) || finalTotal))}
                  </span>
                </div>

                <div className="flex justify-between font-bold">
                  <span>Change Returned</span>
                  <span>
                    {money(lastSettlement ? lastSettlement.changeDue : changeDue)}
                  </span>
                </div>
              </>
            )}

          </div>

          {/* Thank You Footer */}
          <div className="text-center pt-2.5 border-t border-dashed border-black space-y-0.5">

            <p className="font-logo text-base tracking-widest">
              Merci Beaucoup
            </p>

            <p className="text-[9px]">
              Thank you for dining with us.
            </p>

            <p className="text-[9px]">
              We look forward to welcoming you again.
            </p>

            <div className="pt-2 text-[8px] tracking-[0.25em] font-bold">
              MOLS MAISON · MONACO
            </div>

            <p className="text-[8px] tracking-wider pt-0.5">
              ✦ BON APPÉTIT ✦
            </p>

          </div>

        </div>
      </div>

      {/* Pinned Modal Actions */}
      <div className="flex gap-2 p-3 bg-warm-50/90 border-t border-warm-200/80 shrink-0 print:hidden">

        <button
          onClick={handlePrintReceipt}
          className="flex-1 rounded-xl bg-warm-900 py-2.5 font-display text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand hover:text-white active:bg-brand-dark transition"
        >
          Print Receipt
        </button>

        <button
          onClick={() => setShowReceiptModal(false)}
          className="rounded-xl border border-warm-300 px-4 py-2.5 text-xs sm:text-sm font-bold text-warm-700 hover:bg-warm-100 hover:text-warm-950 transition"
        >
          Close
        </button>

      </div>

    </div>
  </div>
)}

      {/* Quick Merge Modal for Cashier */}
      {showMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await api('/staff/tables/merge', {
                  method: 'POST',
                  body: { source_number: Number(mergeSrc), target_number: Number(mergeTgt) },
                })
                setShowMerge(false)
                alert(`Table #${mergeSrc} merged into Table #${mergeTgt}!`)
                reload()
              } catch (err) {
                alert(err.message || 'Failed to merge tables')
              }
            }}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5"
          >
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Merge Two Tables</h3>
            <p className="text-xs text-warm-500">Combine orders from source table into target master table.</p>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Source Table to Merge</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={mergeSrc}
                onChange={(e) => setMergeSrc(e.target.value)}
              >
                <option value="">Select source table</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number} ({t.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Target Master Table</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={mergeTgt}
                onChange={(e) => setMergeTgt(e.target.value)}
              >
                <option value="">Select target table</option>
                {tables
                  .filter((t) => String(t.number) !== String(mergeSrc))
                  .map((t) => (
                    <option key={t.number} value={t.number}>Table #{t.number} ({t.status})</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowMerge(false)}
                className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-purple-600 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-purple-700 hover:text-white active:bg-purple-800 active:text-white transition"
              >
                Merge Tables
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Register Member Modal */}
      {showRegisterMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleRegisterMember} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
              <div>
                <h3 className="font-display text-base font-bold text-warm-900">Register New Member</h3>
                <p className="text-xs text-amber-700 font-medium">★ Includes 50 Welcome Points</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterMemberModal(false)}
                className="text-warm-400 hover:text-warm-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-700 mb-1">Customer Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rostova"
                className={inp + ' w-full text-xs sm:text-sm'}
                value={newMemberForm.name}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-700 mb-1">Phone Number (Member ID)</label>
              <input
                type="tel"
                required
                placeholder="e.g. 08123456789"
                className={inp + ' w-full font-mono text-xs sm:text-sm'}
                value={newMemberForm.phone}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-700 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="elena@example.com"
                className={inp + ' w-full text-xs sm:text-sm'}
                value={newMemberForm.email}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterMemberModal(false)}
                className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs font-semibold text-warm-700 hover:bg-warm-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRegisteringMember}
                className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs font-bold text-white shadow-xs hover:bg-brand-dark transition"
              >
                {isRegisteringMember ? 'Registering...' : 'Register Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
