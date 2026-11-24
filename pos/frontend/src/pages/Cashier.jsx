import React from 'react'
import { useOutletContext } from 'react-router-dom'
import CashierBilling from '../components/CashierBilling'

export default function Cashier() {
  const { orders = [], tables = [], menu = [], refreshAll = () => {}, cashierName = '' } = useOutletContext() || {}
  return (
    <CashierBilling
      orders={orders}
      tables={tables}
      menu={menu}
      reload={refreshAll}
      cashierName={cashierName}
    />
  )
}
