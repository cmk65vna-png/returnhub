import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShopProvider } from './context/ShopContext.jsx'
import { getShops } from './services/api.js'
import Dashboard from './pages/Dashboard.jsx'
import Returns from './pages/Returns.jsx'
import Warehouse from './pages/Warehouse.jsx'
import Reconcile from './pages/Reconcile.jsx'
import Orders from './pages/Orders.jsx'
import Revenue from './pages/Revenue.jsx'
import Inventory from './pages/Inventory.jsx'
import Tools from './pages/Tools.jsx'
import ShopSettings from './pages/ShopSettings.jsx'
import Settings from './pages/Settings.jsx'

const NAV_GROUPS = [
  { label:'Tổng quan', items:[{ to:'/', label:'Dashboard', icon:'▦' }] },
  { label:'TikTok Shop', items:[
    { to:'/orders',    label:'Đơn hàng',  icon:'🛒' },
    { to:'/revenue',   label:'Doanh thu', icon:'📈' },
    { to:'/inventory', label:'Tồn kho',   icon:'📦' },
  ]},
  { label:'Hàng hoàn', items:[
    { to:'/returns',   label:'Đơn hoàn',  icon:'↩' },
    { to:'/warehouse', label:'Nhập kho',  icon:'🏪' },
    { to:'/reconcile', label:'Đối soát',  icon:'⇄' },
  ]},
  { label:'Công cụ & Cài đặt', items:[
    { to:'/tools',    label:'Công cụ',        icon:'🔧' },
    { to:'/shops',    label:'Quản lý Shop',   icon:'🏬' },
    { to:'/settings', label:'Kết nối Shopee', icon:'⚙' },
  ]},
]

function Sidebar() {
  const { data: shops } = useQuery({ queryKey:['shops'], queryFn: getShops })
  return (
    <div style={{width:220,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
      <div style={{padding:'18px 18px 14px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:16,fontWeight:600,color:'var(--text)',letterSpacing:'-0.3px'}}>ReturnHub</div>
        <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>Quản lý đa shop</div>
      </div>
      {NAV_GROUPS.map(group => (
        <div key={group.label}>
          <div style={{fontSize:10,color:'var(--text3)',padding:'12px 18px 4px',textTransform:'uppercase',letterSpacing:'0.08em'}}>{group.label}</div>
          {group.items.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'} style={({isActive}) => ({
              display:'flex',alignItems:'center',gap:10,padding:'8px 18px',fontSize:13,
              textDecoration:'none',transition:'background 0.12s',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--text2)',
              fontWeight: isActive ? 500 : 400,
              borderLeft: isActive ? '3px solid var(--accent-text)' : '3px solid transparent',
            })}>
              <span style={{fontSize:14}}>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </div>
      ))}
      <div style={{padding:'12px 18px',marginTop:'auto',borderTop:'1px solid var(--border)'}}>
        <div style={{fontSize:10,color:'var(--text3)',marginBottom:6}}>Shops ({(shops||[]).length})</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {(shops||[]).slice(0,8).map(s=>(
            <div key={s.id} title={s.shop_name} style={{width:22,height:22,borderRadius:5,background:s.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:700,cursor:'default'}}>
              {(s.shop_alias||s.shop_name||'??').slice(0,2)}
            </div>
          ))}
          {(shops||[]).length > 8 && (
            <div style={{width:22,height:22,borderRadius:5,background:'#e8e6df',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--text3)'}}>
              +{(shops||[]).length-8}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
          <Sidebar />
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/reconcile" element={<Reconcile />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/shops" element={<ShopSettings />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </ShopProvider>
    </BrowserRouter>
  )
}
