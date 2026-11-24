import React from 'react'
import { useOutletContext } from 'react-router-dom'
import InventoryManagement from '../components/InventoryManagement'

export default function InventoryPage() {
  const {
    stockData = { ingredients: [], alerts: [], low_count: 0 },
    refreshAll = () => {},
    isManager = false,
    cashierName = '',
  } = useOutletContext() || {}
  return (
    <InventoryManagement
      data={stockData}
      reload={refreshAll}
      canManage={isManager}
      userName={cashierName}
    />
  )
}
