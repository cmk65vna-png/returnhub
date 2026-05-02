import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getShops } from '../services/api.js'
import { useShop } from '../context/ShopContext.jsx'

export default function ShopSelector() {
  const { selectedShop, setSelectedShop } = useShop()
  const { data: shops } = useQuery({ queryKey:['shops'], queryFn: getShops })
  const current = selectedShop === 'all' ? null : (shops||[]).find(s => s.id === selectedShop)

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <select
        value={selectedShop}
        onChange={e => setSelectedShop(e.target.value)}
        style={{
          appearance:'none', WebkitAppearance:'none',
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', padding:'7px 32px 7px 10px',
          fontSize:13, color:'var(--text)', cursor:'pointer', fontFamily:'inherit',
          paddingLeft: current ? '30px' : '10px',
        }}
      >
        <option value="all">🏪 Tất cả shop ({(shops||[]).length})</option>
        {(shops||[]).map(s => (
          <option key={s.id} value={s.id}>{s.shop_name}</option>
        ))}
      </select>
      {current && (
        <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',width:14,height:14,borderRadius:3,background:current.color,pointerEvents:'none'}}></div>
      )}
      <div style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'var(--text3)',fontSize:10}}>▼</div>
    </div>
  )
}
