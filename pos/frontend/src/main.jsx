import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import Customer from './pages/Customer'
import Staff from './pages/Staff'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/t/:token" element={<Customer />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="*" element={<Navigate to="/staff" replace />} />
    </Routes>
  </BrowserRouter>
)
