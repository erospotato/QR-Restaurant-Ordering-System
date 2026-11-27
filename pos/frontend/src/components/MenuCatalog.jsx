import React, { useState, useMemo } from 'react'
import { api, money, inp, formatImageUrl } from '../lib'
import { Icons } from './Icons'
import { useDialog } from '../context/DialogContext'

export default function MenuCatalog({ menu = [], reload = () => {} }) {
  const { confirm: confirmDialog } = useDialog()
  const [editingItem, setEditingItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [filterTag, setFilterTag] = useState('all') // 'all' | 'promo' | 'top_sale' | 'signature'
  const [sortBy, setSortBy] = useState('name')

  const categories = useMemo(() => {
    return [...new Set((menu || []).map((m) => m.category).filter(Boolean))]
  }, [menu])

  const promoCount = useMemo(() => (menu || []).filter((m) => m.is_member_exclusive).length, [menu])
  const topCount = useMemo(() => (menu || []).filter((m) => m.is_top_sale).length, [menu])
  const sigCount = useMemo(() => (menu || []).filter((m) => m.is_signature).length, [menu])

  const filtered = useMemo(() => {
    const list = (menu || []).filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
      const matchCat = category === 'all' || m.category === category
      const matchTag =
        filterTag === 'all'
          ? true
          : filterTag === 'promo'
          ? m.is_member_exclusive
          : filterTag === 'top_sale'
          ? m.is_top_sale
          : filterTag === 'signature'
          ? m.is_signature
          : true
      return matchSearch && matchCat && matchTag
    })

    if (sortBy === 'price_asc') return list.sort((a, b) => (a.promo_price || a.price) - (b.promo_price || b.price))
    if (sortBy === 'price_desc') return list.sort((a, b) => (b.promo_price || b.price) - (a.promo_price || a.price))
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [menu, search, category, filterTag, sortBy])

  const toggleAvailable = (item) => {
    api(`/menu/${item.id}`, { method: 'PATCH', body: { is_available: !item.is_available } }).then(reload)
  }

  const toggleMemberExclusive = async (item) => {
    try {
      await api(`/menu/${item.id}`, {
        method: 'PATCH',
        body: { is_member_exclusive: !item.is_member_exclusive },
      })
      reload()
    } catch (e) {
      alert(e.message || 'Failed to update member exclusivity')
    }
  }

  const deleteItem = async (item) => {
    const ok = await confirmDialog({
      title: 'Delete Menu Recipe',
      message: `Are you sure you want to permanently remove "${item.name}" from the restaurant menu?`,
      confirmText: 'Yes, Delete Recipe',
      cancelText: 'Cancel',
      type: 'danger',
    })
    if (!ok) return
    api(`/menu/${item.id}`, { method: 'DELETE' }).then(reload)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Restaurant Menu Catalog
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            {menu.length} total recipes · {promoCount} Member Exclusive Promos · Real-time price and availability control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem(null)
              setShowAdd(true)
            }}
            className="rounded-xl bg-brand px-3.5 py-2 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark active:scale-95 transition flex items-center gap-1.5"
          >
            <span>✦ Add Promo Item</span>
          </button>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowAdd(true)
            }}
            className="rounded-xl bg-brand px-3.5 py-2 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand active:scale-95 transition"
          >
            + Add Standard Dish
          </button>
        </div>
      </div>

      {/* Quick Tag Pills (All, Member Exclusive Promos, Top Sellers, Chef Signatures) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterTag('all')}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filterTag === 'all'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100'
          }`}
        >
          All Recipes ({menu.length})
        </button>
        <button
          onClick={() => setFilterTag('promo')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filterTag === 'promo'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
          }`}
        >
          <span>✦ Member Exclusive Promos ({promoCount})</span>
        </button>
        <button
          onClick={() => setFilterTag('top_sale')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filterTag === 'top_sale'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
          }`}
        >
          <span>🔥 Top Sellers ({topCount})</span>
        </button>
        <button
          onClick={() => setFilterTag('signature')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filterTag === 'signature'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span>⭐ Chef Signatures ({sigCount})</span>
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warm-200 bg-white p-3 shadow-soft">
        <input
          type="text"
          placeholder="Filter menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inp + ' flex-1 min-w-[180px] text-xs sm:text-sm'}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp + ' text-xs sm:text-sm'}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inp + ' text-xs sm:text-sm'}>
          <option value="name">Sort A to Z</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Grid of Menu Items with Clean Text */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-warm-200 bg-white p-8 text-center shadow-card">
          <p className="font-mono text-sm text-warm-500">No menu items match current criteria.</p>
          <button
            onClick={() => {
              setSearch('')
              setCategory('all')
              setFilterTag('all')
            }}
            className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const img = formatImageUrl(item.image_url)
          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-3.5 shadow-card transition-all ${
                item.is_member_exclusive
                  ? 'border-purple-300 bg-purple-50/50'
                  : 'border-warm-200 bg-white'
              }`}
            >
              <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-warm-100 overflow-hidden border border-warm-200">
                  {img ? (
                    <img src={img} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-warm-400">
                      <Icons.Kitchen />
                    </div>
                  )}
                  {item.is_member_exclusive && (
                    <span className="absolute top-1 left-1 rounded bg-purple-900/90 text-[9px] font-bold text-amber-300 px-1 py-0.2 shadow-xs">
                      VIP
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display text-sm sm:text-base font-semibold text-warm-900 truncate">{item.name}</span>
                    {item.is_member_exclusive && (
                      <span className="rounded bg-purple-900 text-amber-200 px-1.5 py-0.2 text-[9px] font-bold border border-purple-700">
                        {item.promo_badge || 'MEMBER EXCLUSIVE'}
                      </span>
                    )}
                    {item.is_top_sale && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-medium text-rose-700 border border-rose-200">
                        Top
                      </span>
                    )}
                    {item.is_signature && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 border border-amber-200">
                        Chef
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-medium text-warm-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{item.category}</span>
                    <span>·</span>
                    {item.is_member_exclusive && item.promo_price ? (
                      <span className="flex items-center gap-1.5">
                        <span className="line-through text-warm-400 text-xs">{money(item.price)}</span>
                        <span className="font-bold text-brand">{money(item.promo_price)}</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                          {item.min_member_tier || 'Member'}+
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-warm-900">{money(item.price)}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-warm-500 line-clamp-1 mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-warm-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      item.is_available ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-warm-100 text-warm-500 line-through'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${item.is_available ? 'bg-emerald-600' : 'bg-warm-400'}`} />
                    {item.is_available ? 'Available' : 'Sold Out'}
                  </button>

                  <button
                    onClick={() => toggleMemberExclusive(item)}
                    title="Toggle Member Exclusive Promotion"
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                      item.is_member_exclusive
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-warm-100 text-warm-600 hover:bg-purple-50 hover:text-purple-800'
                    }`}
                  >
                    {item.is_member_exclusive ? '✦ Members Only' : 'Public'}
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-xs font-medium text-warm-700 hover:text-brand"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}

      {(showAdd || editingItem) && (
        <DishFormModal
          item={editingItem}
          existingCategories={categories}
          onClose={() => {
            setShowAdd(false)
            setEditingItem(null)
          }}
          onSaved={() => {
            setShowAdd(false)
            setEditingItem(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function DishFormModal({ item, onClose, onSaved, existingCategories = [] }) {
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price || '')
  const [description, setDescription] = useState(item?.description || '')
  const [isTopSale, setIsTopSale] = useState(item?.is_top_sale || false)
  const [isSignature, setIsSignature] = useState(item?.is_signature || false)
  const [isMemberExclusive, setIsMemberExclusive] = useState(item?.is_member_exclusive || false)
  const [promoPrice, setPromoPrice] = useState(item?.promo_price ?? '')
  const [minMemberTier, setMinMemberTier] = useState(item?.min_member_tier || 'Bronze')
  const [promoBadge, setPromoBadge] = useState(item?.promo_badge || '✦ MEMBER EXCLUSIVE')
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  // Merge unique categories with fallback standards
  const allCategories = useMemo(() => {
    const defaults = ['Mains', 'Starters', 'Desserts', 'Drinks', 'Sides']
    const combined = [...new Set([...(existingCategories || []), ...defaults])]
    return combined.filter(Boolean)
  }, [existingCategories])

  const initialCat = item?.category || allCategories[0] || 'Mains'
  const isInitialPreset = allCategories.includes(initialCat)

  const [categoryMode, setCategoryMode] = useState(item && !isInitialPreset ? 'new' : 'select')
  const [selectedCategory, setSelectedCategory] = useState(isInitialPreset ? initialCat : allCategories[0] || 'Mains')
  const [newCategory, setNewCategory] = useState(item && !isInitialPreset ? item.category : '')

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file)
    if (imageUrl) return formatImageUrl(imageUrl)
    return null
  }, [file, imageUrl])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalCategory = categoryMode === 'new' ? newCategory.trim() : selectedCategory
    if (!finalCategory) {
      alert('Please select or specify a category for this dish.')
      return
    }

    setBusy(true)
    const fd = new FormData()
    fd.append('name', name)
    fd.append('price', price)
    fd.append('category', finalCategory)
    fd.append('description', description)
    fd.append('is_top_sale', isTopSale ? '1' : '0')
    fd.append('is_signature', isSignature ? '1' : '0')
    fd.append('is_member_exclusive', isMemberExclusive ? '1' : '0')

    if (isMemberExclusive) {
      if (promoPrice) fd.append('promo_price', promoPrice)
      fd.append('min_member_tier', minMemberTier || 'Bronze')
      fd.append('promo_badge', promoBadge || '✦ MEMBER EXCLUSIVE')
    } else {
      fd.append('promo_price', '')
    }

    if (file) fd.append('image', file)
    else if (imageUrl) fd.append('image_url', imageUrl)

    try {
      if (item) {
        await api(`/menu/${item.id}`, { method: 'PATCH', form: fd })
      } else {
        await api('/menu', { method: 'POST', form: fd })
      }
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to save dish')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
            {item ? `Edit Dish: ${item.name}` : 'Add New Menu Dish'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Dish Name & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Dish Name *
            </label>
            <input
              required
              placeholder="e.g. Truffle Wagyu Burger"
              className={inp + ' w-full text-xs sm:text-sm'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="18.50"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Category Selector: Pick Existing or Add New */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-semibold text-warm-800">
              Category *
            </label>
            <div className="flex items-center gap-1 rounded-xl bg-warm-200/70 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCategoryMode('select')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  categoryMode === 'select'
                    ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-100 active:bg-warm-200 active:text-warm-950'
                }`}
              >
                Existing Categories
              </button>
              <button
                type="button"
                onClick={() => setCategoryMode('new')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  categoryMode === 'new'
                    ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-100 active:bg-warm-200 active:text-warm-950'
                }`}
              >
                + Add New
              </button>
            </div>
          </div>

          {categoryMode === 'select' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setCategoryMode('new')
                    } else {
                      setSelectedCategory(e.target.value)
                    }
                  }}
                  className={inp + ' flex-1 text-xs sm:text-sm py-2'}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add new category...</option>
                </select>
              </div>

              {/* Touch-friendly category quick chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {allCategories.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      selectedCategory === c
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoryMode('new')}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium border border-dashed border-warm-400 text-warm-700 hover:bg-warm-100"
                >
                  + New Category
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Type new category (e.g. Pasta, Tapas, Chef's Specials, Breakfast)..."
                required={categoryMode === 'new'}
                className={inp + ' w-full text-xs sm:text-sm'}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                autoFocus
              />
              <div className="flex items-center justify-between text-[11px] text-warm-500">
                <span>Will instantly create this category and appear on customer & staff menus.</span>
                <button
                  type="button"
                  onClick={() => setCategoryMode('select')}
                  className="text-brand font-medium hover:underline shrink-0 ml-2"
                >
                  Choose existing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Ingredients, culinary preparation, allergen highlights..."
            className={inp + ' w-full text-xs sm:text-sm font-normal'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Member Exclusive Promotional Item Section */}
        <div className={`rounded-2xl border transition-all p-3.5 space-y-3 ${
          isMemberExclusive
            ? 'border-purple-300 bg-purple-50 shadow-xs'
            : 'border-warm-200 bg-warm-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMemberExclusive}
                onChange={(e) => setIsMemberExclusive(e.target.checked)}
                className="h-4 w-4 rounded text-purple-700 focus:ring-purple-600"
              />
              <span className="text-xs sm:text-sm font-bold text-warm-900 flex items-center gap-1.5">
                <span>✦ Exclusive for Members Only</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">VIP Promotion</span>
              </span>
            </label>
            <span className="text-[11px] font-mono text-warm-500">
              {isMemberExclusive ? 'Active Exclusive' : 'Public Menu'}
            </span>
          </div>

          {isMemberExclusive && (
            <div className="space-y-3 pt-2 border-t border-purple-200/70 animate-in fade-in duration-200">
              <p className="text-xs text-purple-900 leading-relaxed">
                This item is reserved <strong>strictly for registered MOLS MAISON members</strong>. Customers on the QR ordering page will be prompted to verify or join membership before adding it to their order.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    Special Member Price ($) <span className="text-warm-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${price ? (Number(price) * 0.75).toFixed(2) : '15.00'} (Base: $${price || '0'})`}
                    className={inp + ' w-full text-xs font-mono bg-white border-purple-200 focus:border-purple-600'}
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                  />
                  <span className="text-[10px] text-warm-500 mt-0.5 block">Leave empty to use the standard price.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    Minimum Member Tier Required
                  </label>
                  <select
                    value={minMemberTier}
                    onChange={(e) => setMinMemberTier(e.target.value)}
                    className={inp + ' w-full text-xs bg-white border-purple-200 focus:border-purple-600'}
                  >
                    <option value="Bronze">🥉 Any Member (Bronze Tier · $0+)</option>
                    <option value="Silver">🥈 Silver Tier ($100+ spent)</option>
                    <option value="Gold">⭐ Gold Tier ($300+ spent)</option>
                    <option value="VIP">💎 VIP Elite ($600+ spent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  Promotional Badge Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. ✦ MEMBER EXCLUSIVE 30% OFF"
                  className={inp + ' w-full text-xs bg-white border-purple-200 focus:border-purple-600'}
                  value={promoBadge}
                  onChange={(e) => setPromoBadge(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Photo Upload & Preview */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3.5 space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-warm-800">
            Dish Photo (Upload File or Enter URL)
          </label>
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-warm-300 bg-warm-100 shadow-xs">
                <img
                  src={previewUrl}
                  alt="Dish preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-warm-300 bg-warm-100/50 text-warm-400 text-xs text-center p-1 font-medium">
                No Photo
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs text-warm-700 file:mr-2 file:rounded-lg file:border-0 file:bg-warm-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-warm-800 hover:file:bg-warm-300 cursor-pointer"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <input
                type="url"
                placeholder="Or paste image URL (https://...)"
                className={inp + ' w-full text-xs font-mono py-1'}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Badges / Highlights */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer select-none hover:bg-rose-100 transition">
            <input
              type="checkbox"
              checked={isTopSale}
              onChange={(e) => setIsTopSale(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            🔥 Top Seller
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer select-none hover:bg-amber-100 transition">
            <input
              type="checkbox"
              checked={isSignature}
              onChange={(e) => setIsSignature(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            ⭐ Chef's Signature
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition disabled:opacity-50"
          >
            {busy ? 'Saving Recipe...' : item ? 'Update Recipe' : 'Add Dish to Menu'}
          </button>
        </div>
      </form>
    </div>
  )
}
