import React from 'react'
import { useOutletContext } from 'react-router-dom'
import KitchenDisplay from '../components/KitchenDisplay'

export default function Kitchen() {
  const { orders = [], refreshAll = () => {} } = useOutletContext() || {}
  return <KitchenDisplay orders={orders} reload={refreshAll} />
}
