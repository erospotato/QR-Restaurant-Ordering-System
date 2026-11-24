import React from 'react'
import { useOutletContext } from 'react-router-dom'
import StaffRoster from '../components/StaffRoster'
import { useAuth } from '../context/AuthContext'

export default function UsersPage() {
  const { refreshAll = () => {} } = useOutletContext() || {}
  const { user } = useAuth()
  return <StaffRoster currentUserId={user?.id} reload={refreshAll} />
}
