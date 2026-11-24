import React from 'react'
import { useOutletContext } from 'react-router-dom'
import MenuCatalog from '../components/MenuCatalog'

export default function MenuPage() {
  const { menu = [], refreshAll = () => {} } = useOutletContext() || {}
  return <MenuCatalog menu={menu} reload={refreshAll} />
}
