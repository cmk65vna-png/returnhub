import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrders, getOrderStats } from '../services/api.js'

const STATUS_COLOR = {
  pending:   { bg:'#fdf6b2', color:'#c27803' },
  confirmed: { bg:'#eff4ff', color:'#1a56db' },
  shipping:  { bg:'#f0fdf4', color:'#057a55' },
  delivered: { bg:'#f3faf7', color:'#057a55' },
  cancelled: { bg:'#fdf2f2', color:'#e02424' },
  return:    { bg:'#fff7ed', color:'#c2410c' },
}
const STATUS_OPTS = [
  ['all','Tất cả'],['pending','Chờ xác nhận'],['confirmed','Đã xác nhận'],
  ['shipping','Đang giao'],['delivered','Đã giao'],['cancelled','Đã huỷ'],['return','Hoàn hàng'],
]
const DAY_OPTS = [[7,'7 ngày'],[14,'14 ngày'],[30,'30 ngày']]

function Pill({label, status}) {
  const s = STATUS_COLOR[status] || {bg:'#f0ede6',color:'#6b6860'}
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:99,fontWeight:500,whiteSpace:'nowrap',background:s.bg,color:s.color}}>{label}</span>
}

export default function Orders() {
  const [status, setStatus] = useState('all')
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status, days, search],
    queryFn: () => getOrders({ status: status !== 'all' ? status : undefined, days, search: search || undefined }),
    refetchInterval: 60000,
  })
  const { data: stats } = useQuery({
    queryKey: ['order-stats', days],
    queryFn: () => getOrderStats({ days }),
  })

  const items = data?.items || []
  const s = stats || {}

  const exportCSV = () => {
    const rows = [
      ['Mã đơn','Sản phẩm','SKU','Số lượng','Đơn giá','Tổng tiền','Trạng thái','Người mua','Tỉnh/TP','Ngày đặt'],
      ...items.map(o => [o.order_id,o.product_name,o.sku,o.quantity,o.unit_price,o.total_amount,o.status_label,o.buyer_name,o.province,o.order_date])
    ]
    const csv = rows.map(r => r.map(c => '"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `DonHang_${days}ngay_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Quản lý đơn hàng</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>TikTok Shop — đồng bộ demo</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {DAY_OPTS.map(([d,l]) => (
            <button key={d} onClick={()=>setDays(d)} style={{padding:'6px 14px',border:'none',borderRadius:'var(--radius)',fontSize:12,fontWeight:500,cursor:'pointer',background:days===d?'var(--accent)':'var(--border)',color:days===d?'#fff':'var(--text2)'}}>{l}</button>
          ))}
          <button onClick={exportCSV} style={{padding:'6px 14px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',color:'var(--text)',fontWeight:500}}>↓ Xuất CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Tổng đơn', value:s.total||0, color:'var(--text)'},
          {label:'Đã giao', value:(s.by_status?.delivered||0), color:'var(--success)'},
          {label:'Đang giao', value:(s.by_status?.shipping||0), color:'var(--accent-text)'},
          {label:'Đã huỷ', value:(s.by_status?.cancelled||0), color:'var(--danger)'},
          {label:'Doanh thu', value:`${((s.total_revenue||0)/1e6).toFixed(1)}M`, color:'var(--text)'},
        ].map(c => (
          <div key={c.label} style={{background:'#f0ede6',borderRadius:'var(--radius)',padding:'12px 14px'}}>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:22,fontWeight:600,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter + Table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm mã đơn, sản phẩm, người mua..."
            style={{fontSize:12,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',width:220}}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {STATUS_OPTS.map(([v,l]) => (
              <button key={v} onClick={()=>setStatus(v)} style={{padding:'5px 12px',border:'1.5px solid '+(status===v?'var(--accent)':'var(--border)'),borderRadius:99,fontSize:11,fontWeight:status===v?500:400,cursor:'pointer',background:status===v?'var(--accent-bg)':'transparent',color:status===v?'var(--accent-text)':'var(--text2)'}}>{l}</button>
            ))}
          </div>
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--text3)'}}>{data?.total||0} đơn</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',fontSize:12,borderCollapse:'collapse',tableLayout:'fixed'}}>
            <thead>
              <tr>{['Mã đơn','Sản phẩm','SL','Tổng tiền','Trạng thái','Người mua','Tỉnh/TP','Ngày đặt',''].map((h,i) => (
                <th key={i} style={{padding:'9px 14px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Đang tải...</td></tr>}
              {!isLoading && items.length===0 && <tr><td colSpan={9} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Không có đơn nào</td></tr>}
              {items.map(o => (
                <tr key={o.order_id} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'9px 14px',fontFamily:'var(--mono)',fontSize:11,whiteSpace:'nowrap'}}>{o.order_id}</td>
                  <td style={{padding:'9px 14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{o.product_name}</td>
                  <td style={{padding:'9px 14px',color:'var(--text2)',textAlign:'center'}}>{o.quantity}</td>
                  <td style={{padding:'9px 14px',fontWeight:500}}>{o.total_amount.toLocaleString('vi-VN')}đ</td>
                  <td style={{padding:'9px 14px'}}><Pill label={o.status_label} status={o.status}/></td>
                  <td style={{padding:'9px 14px',color:'var(--text2)',whiteSpace:'nowrap'}}>{o.buyer_name}</td>
                  <td style={{padding:'9px 14px',color:'var(--text2)',fontSize:11}}>{o.province}</td>
                  <td style={{padding:'9px 14px',color:'var(--text2)',fontSize:11,whiteSpace:'nowrap'}}>{o.order_date}</td>
                  <td style={{padding:'9px 14px'}}>
                    <button onClick={()=>setDetail(o)} style={{fontSize:11,padding:'3px 9px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',cursor:'pointer'}}>Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={()=>setDetail(null)}>
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',padding:24,width:420,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:15,fontWeight:600}}>Chi tiết đơn hàng</h2>
              <button onClick={()=>setDetail(null)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--text2)'}}>×</button>
            </div>
            {[
              ['Mã đơn', detail.order_id, true],
              ['Sản phẩm', detail.product_name],
              ['SKU', detail.sku, true],
              ['Số lượng', detail.quantity],
              ['Đơn giá', detail.unit_price.toLocaleString('vi-VN')+'đ'],
              ['Tổng tiền', detail.total_amount.toLocaleString('vi-VN')+'đ'],
              ['Trạng thái', detail.status_label],
              ['Người mua', detail.buyer_name],
              ['Điện thoại', detail.buyer_phone],
              ['Tỉnh/TP', detail.province],
              ['Mã vận đơn', detail.tracking_code, true],
              ['Shipper', detail.shipper],
              ['Ngày đặt', detail.order_date],
            ].map(([k,v,mono]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                <span style={{color:'var(--text2)'}}>{k}</span>
                <span style={{fontFamily:mono?'var(--mono)':'inherit',fontWeight:500,color:'var(--text)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
