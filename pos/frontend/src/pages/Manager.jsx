import React from 'react'
import { useOutletContext } from 'react-router-dom'
import SalesDashboard from '../components/SalesDashboard'

export default function Manager() {
  const { sales, orders = [], tables = [], refreshAll = () => {} } = useOutletContext() || {}
  return <SalesDashboard sales={sales} orders={orders} tables={tables} reload={refreshAll} />
}
