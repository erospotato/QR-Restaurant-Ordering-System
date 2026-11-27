import React from 'react'
import { money, timeStr } from '../lib'

export default function SalesDashboard({ sales, reload }) {
  if (!sales) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
          <div className="space-y-2">
            <div className="h-5 w-60 rounded-lg bg-warm-200" />
            <div className="h-3 w-40 rounded-md bg-warm-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-xl bg-warm-100" />
            <div className="h-8 w-20 rounded-xl bg-warm-200" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card space-y-2.5">
              <div className="h-3 w-20 rounded bg-warm-100" />
              <div className="h-7 w-28 rounded-lg bg-warm-200" />
              <div className="h-3 w-24 rounded bg-warm-100" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card h-64" />
          <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card h-64" />
        </div>
      </div>
    )
  }

  const topDishes = sales.top_dishes || []
  const recentOrders = sales.recent_orders || []

  const exportCSV = () => {
    const rows = [
      ['Report Type', 'MOLS MAISON Performance Audit'],
      ['Export Date', new Date().toISOString()],
      ['Today Sales', sales.today || 0],
      ['Week Sales', sales.week || 0],
      ['Month Sales', sales.month || 0],
      ['All Time Sales', sales.total || 0],
      ['Total Orders', sales.all_orders || 0],
      [''],
      ['Top Selling Dish', 'Units Sold', 'Revenue'],
      ...topDishes.map((d) => [d.name, d.qty, d.revenue]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mols_maison_sales_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Executive Performance &amp; Revenue Analytics
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Daily turnover · Kitchen volume · Category share
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-xl border border-warm-300 bg-warm-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
          >
            Export CSV
          </button>
          <button
            onClick={reload}
            className="rounded-xl bg-brand px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats with Refined Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">Today Sales</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-emerald-600 mt-0.5">{money(sales.today)}</p>
          <p className="font-mono text-xs font-medium text-warm-400 mt-0.5">{sales.today_orders || 0} orders settled</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">This Week</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 mt-0.5">{money(sales.week)}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">This Month</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 mt-0.5">{money(sales.month)}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">Lifetime Gross</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-brand mt-0.5">{money(sales.total)}</p>
          <p className="font-mono text-xs font-medium text-warm-400 mt-0.5">{sales.all_orders || 0} total tickets</p>
        </div>
      </div>

      {/* Leaderboard & Recent Orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
            <h3 className="font-display text-sm sm:text-base font-bold text-warm-900">Top Selling Recipes (Leaderboard)</h3>
            <span className="font-mono text-xs text-warm-500 font-medium">By volume</span>
          </div>

          <div className="space-y-2">
            {topDishes.length === 0 ? (
              <p className="text-xs text-warm-500 font-mono py-4 text-center">No dishes sold yet.</p>
            ) : (
              topDishes.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-warm-50 p-2.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-warm-200 font-mono text-xs font-bold text-warm-800">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-warm-900">{d.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-semibold text-warm-900 mr-2.5">{d.qty} sold</span>
                    <span className="font-medium text-emerald-700">{money(d.revenue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
            <h3 className="font-display text-sm sm:text-base font-bold text-warm-900">Recent Settled Checks</h3>
            <span className="font-mono text-xs text-warm-500 font-medium">Last 20 tickets</span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-warm-500 font-mono py-4 text-center">No settled checks found.</p>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-warm-100 bg-warm-50/50 p-2.5 text-xs sm:text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-warm-900">Table #{o.table}</span>
                      <span className="rounded bg-warm-200 px-1.5 py-0.2 font-mono text-[10px] font-semibold uppercase text-warm-800">
                        {o.payment_method}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-warm-500 mt-0.5">
                      {timeStr(o.ts)} · {o.items_count} items
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm sm:text-base text-warm-900">{money(o.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
