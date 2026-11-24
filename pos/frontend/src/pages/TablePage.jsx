import React from 'react'
import { useOutletContext } from 'react-router-dom'
import TableManagement from '../components/TableManagement'

export default function TablePage() {
  const { tables = [], refreshAll = () => {}, isManager = false } = useOutletContext() || {}
  return <TableManagement tables={tables} reload={refreshAll} isManager={isManager} />
}
