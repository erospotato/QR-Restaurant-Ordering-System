import React from 'react'
import { useOutletContext } from 'react-router-dom'
import QrPrintStation from '../components/QrPrintStation'

export default function QrPage() {
  const { tables = [], refreshAll = () => {} } = useOutletContext() || {}
  return <QrPrintStation tables={tables} reload={refreshAll} />
}
