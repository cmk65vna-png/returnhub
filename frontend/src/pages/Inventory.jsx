import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInventory, getInventoryStats } from '../services/api.js'

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const { data: items } = useQuery({ queryKey:['inventory'], queryFn: getInventory, refetchInterval:60000 })
  const { data: stats } = useQuery({ queryKey:['inventory-stats'], queryFn: getInventoryStats })
  const s = stats || {}

  const filtered = (items||[]).filter(item => {
    const matchSearch = !search || item.product_name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter==='all' || item.status===filter
    return matchSearch && matchFilter
  })

  const exportCSV = () => {
    const rows = [
      ['SKU','Tên sản phẩm','Danh mục','Tồn kho','Tồn tối thiểu','Giá','Đã bán 30 ngày','Trạng thái','Giá trị tồn','Ngày còn hàng'],
      ...(items||[]).map(i=>[i.sku,i.product_name,i.category,i.stock,i.min_stock,i.price,i.sold_30d,i.status,i.stock_value,i.days_left])
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob)
    a.download=`TonKho_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const statusStyle = {
    ok:  {bg:'var(--success-bg)',color:'var(--success)',label:'Đủ hàng'},
    low: {bg:'var(--warning-bg)',color:'var(--warning)',label:'Sắp hết'},
    out: {bg:'var(--danger-bg)',color:'var(--danger)',label:'Hết hàng'},
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Tồn kho & Sản phẩm</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>TikTok Shop — đồng bộ demo</p>
        </div>
        <button onClick={exportCSV} style={{padding:'7px 14px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',color:'var(--text)',fontWeight:500}}>↓ Xuất CSV</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Tổng SKU', value:s.total_skus||0, color:'var(--text)'},
          {label:'Sắp hết hàng', value:s.low_stock||0, color:'var(--warning)', sub:'≤ tồn tối thiểu'},
          {label:'Hết hàng', value:s.out_of_stock||0, color:'var(--danger)', sub:'cần nhập ngay'},
          {label:'Giá trị tồn kho', value:`${((s.total_value||0)/1e6).toFixed(1)}M`, color:'var(--text)', sub:'VNĐ'},
        ].map(c=>(
          <div key={c.label} style={{background:'#f0ede6',borderRadius:'var(--radius)',padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:24,fontWeight:600,color:c.color}}>{c.value}</div>
            {c.sub && <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Cảnh báo */}
      {(s.out_of_stock > 0 || s.low_stock > 0) && (
        <div style={{background:'var(--warning-bg)',border:'1px solid #fde68a',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:16,fontSize:13,color:'var(--warning)',display:'flex',gap:10,alignItems:'center'}}>
          ⚠ <span><strong>{s.out_of_stock} SKU hết hàng</strong> và <strong>{s.low_stock} SKU sắp hết</strong> — cần nhập thêm hàng!</span>
        </div>
      )}

      {/* Table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm SKU hoặc tên sản phẩm..."
            style={{fontSize:12,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',width:220}}/>
          {[['all','Tất cả'],['ok','Đủ hàng'],['low','Sắp hết'],['out','Hết hàng']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{padding:'5px 12px',border:'1.5px solid '+(filter===v?'var(--accent)':'var(--border)'),borderRadius:99,fontSize:11,fontWeight:filter===v?500:400,cursor:'pointer',background:filter===v?'var(--accent-bg)':'transparent',color:filter===v?'var(--accent-text)':'var(--text2)'}}>{l}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--text3)'}}>{filtered.length} SKU</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
            <thead>
              <tr>{['SKU','Sản phẩm','Danh mục','Tồn kho','Tồn tối thiểu','Đã bán/30 ngày','Ngày còn hàng','Giá trị tồn','Trạng thái'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={9} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Không có sản phẩm nào</td></tr>}
              {filtered.map(item=>{
                const ss = statusStyle[item.status]||statusStyle.ok
                const daysLeft = item.days_left >= 999 ? '∞' : item.days_left
                return (
                  <tr key={item.sku} style={{borderBottom:'1px solid var(--border)',background:item.status==='out'?'#fdf2f2':item.status==='low'?'#fffbeb':'transparent'}} onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.97)'} onMouseLeave={e=>e.currentTarget.style.filter='none'}>
                    <td style={{padding:'10px 14px',fontFamily:'var(--mono)',fontSize:11,color:'var(--accent-text)'}}>{item.sku}</td>
                    <td style={{padding:'10px 14px',fontWeight:500}}>{item.product_name}</td>
                    <td style={{padding:'10px 14px',color:'var(--text2)',fontSize:11}}>{item.category}</td>
                    <td style={{padding:'10px 14px',textAlign:'center'}}>
                      <span style={{fontSize:16,fontWeight:700,color:item.status==='out'?'var(--danger)':item.status==='low'?'var(--warning)':'var(--text)'}}>{item.stock}</span>
                    </td>
                    <td style={{padding:'10px 14px',textAlign:'center',color:'var(--text2)'}}>{item.min_stock}</td>
                    <td style={{padding:'10px 14px',textAlign:'center',color:'var(--text2)'}}>{item.sold_30d}</td>
                    <td style={{padding:'10px 14px',textAlign:'center'}}>
                      <span style={{fontSize:12,fontWeight:500,color:daysLeft<7?'var(--danger)':daysLeft<14?'var(--warning)':'var(--text)'}}>{daysLeft} ngày</span>
                    </td>
                    <td style={{padding:'10px 14px',color:'var(--text2)'}}>{(item.stock_value||0).toLocaleString('vi-VN')}đ</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:11,padding:'2px 9px',borderRadius:99,fontWeight:500,background:ss.bg,color:ss.color}}>{ss.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
