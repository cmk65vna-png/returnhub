import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStats, getMismatches, getWarehouseReport, getReturns, getAllShopStats } from '../services/api.js'
import { useShop } from '../context/ShopContext.jsx'
import ShopSelector from '../components/ShopSelector.jsx'

export default function Dashboard() {
  const { selectedShop } = useShop()
  const { data: stats, isLoading } = useQuery({ queryKey:['stats'], queryFn: getStats, refetchInterval:60000 })
  const { data: mismatches } = useQuery({ queryKey:['mismatches'], queryFn: getMismatches })
  const { data: report } = useQuery({ queryKey:['warehouse-report'], queryFn: getWarehouseReport })
  const { data: allReturns } = useQuery({ queryKey:['returns',{}], queryFn: () => getReturns({limit:500}) })
  const { data: shopStats } = useQuery({ queryKey:['shop-stats'], queryFn: getAllShopStats, refetchInterval:60000 })

  const exportReport = () => {
    const logs = report ? [] : []
    const s = stats || {}, r = report || {}
    const items = allReturns?.items || []
    const mis = mismatches || []
    const today = new Date().toLocaleDateString('vi-VN')
    const now = new Date().toLocaleString('vi-VN')
    const rows = [
      ['BÁO CÁO TỔNG HỢP HÀNG HOÀN'], ['Xuất lúc: ' + now], [],
      ['=== TỔNG QUAN ==='],
      ['Tổng đơn hoàn', s.total||0], ['Về kho hôm nay', s.today_received||0],
      ['Lệch kho', s.mismatch||0], ['Tổng giá trị (VND)', s.total_value||0],
      [], ['=== THEO SHIPPER ==='],
      ['Shipper','Tổng','Hỏng','Tỷ lệ'],
      ...Object.entries(r.by_shipper||{}).map(([sh,d])=>[sh,d.total,d.damaged,d.total>0?(d.damaged/d.total*100).toFixed(1)+'%':'0%']),
      [], ['=== ĐƠN LỆCH ==='],
      ['Mã đơn','Sàn','Sản phẩm','Sàn báo','Kho','Lý do','Ngày'],
      ...mis.map(m=>[m.order_id,m.platform,m.product_name,m.platform_status,m.warehouse_status,m.reason,m.return_date]),
      [], ['=== TẤT CẢ ĐƠN HOÀN ==='],
      ['Mã đơn','Sàn','Sản phẩm','SKU','Giá trị','Sàn','Kho','Đối soát','Shipper','Mã vận đơn','Ngày'],
      ...items.map(r=>[r.order_id,r.platform,r.product_name,r.sku,r.value,r.platform_status,r.warehouse_status,r.reconcile_status,r.shipper,r.tracking_code,r.return_date]),
    ]
    const csv = rows.map(r=>r.map(c=>'"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob)
    a.download='BaoCao_TongHop_'+new Date().toISOString().slice(0,10)+'.csv'; a.click()
    URL.revokeObjectURL(a.href)
  }

  if (isLoading) return <div style={{color:'var(--text2)',padding:40}}>Đang tải dữ liệu...</div>
  const s = stats || {}, r = report || {}
  const ss = shopStats || {}
  const shops = ss.shops || []
  const filteredShops = selectedShop === 'all' ? shops : shops.filter(sh => sh.shop_id === selectedShop)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Dashboard</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Tổng quan toàn hệ thống</p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <ShopSelector/>
          <button onClick={exportReport} style={{padding:'7px 16px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:12,fontWeight:500,cursor:'pointer'}}>
            ↓ Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Shop overview cards */}
      {selectedShop === 'all' && shops.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:500,color:'var(--text2)',marginBottom:10}}>Tổng quan theo shop (30 ngày)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10,marginBottom:12}}>
            {shops.map(sh=>(
              <div key={sh.shop_id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px',borderLeft:`3px solid ${sh.color}`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{width:24,height:24,borderRadius:5,background:sh.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700,flexShrink:0}}>
                    {sh.shop_alias?.slice(0,2)||'??'}
                  </div>
                  <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sh.shop_name}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>Đơn hàng</div>
                    <div style={{fontSize:16,fontWeight:600,color:sh.color}}>{sh.orders_30d}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>Doanh thu</div>
                    <div style={{fontSize:14,fontWeight:600}}>{(sh.revenue_30d/1e6).toFixed(1)}M</div>
                  </div>
                </div>
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:sh.is_connected?'#4ade80':'#fbbf24',display:'inline-block'}}></span>
                  <span style={{fontSize:10,color:'var(--text3)'}}>{sh.is_connected?'Đã kết nối':'Chờ kết nối'}</span>
                  {sh.last_sync && <span style={{fontSize:10,color:'var(--text3)',marginLeft:'auto'}}>{sh.last_sync}</span>}
                </div>
              </div>
            ))}
            {/* Tổng cộng */}
            <div style={{background:'#f0ede6',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px',borderLeft:'3px solid var(--text)'}}>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:8,fontWeight:500}}>TỔNG TẤT CẢ</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>Tổng đơn</div>
                  <div style={{fontSize:16,fontWeight:700}}>{ss.total_orders||0}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>Tổng DT</div>
                  <div style={{fontSize:14,fontWeight:700}}>{((ss.total_revenue||0)/1e6).toFixed(1)}M</div>
                </div>
              </div>
              <div style={{marginTop:8,fontSize:10,color:'var(--text3)'}}>{ss.connected_shops||0}/{ss.total_shops||0} shop đã kết nối</div>
            </div>
          </div>
        </div>
      )}

      {s.mismatch > 0 && (
        <div style={{background:'var(--warning-bg)',border:'1px solid #fde68a',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--warning)'}}>
          ⚠ <strong>{s.mismatch} đơn lệch kho</strong> — Cần đối soát thủ công.
          <a href="/reconcile" style={{marginLeft:'auto',color:'var(--warning)',fontSize:12}}>Xem chi tiết →</a>
        </div>
      )}

      {/* Hàng hoàn stats */}
      <div style={{fontSize:12,fontWeight:500,color:'var(--text2)',marginBottom:10}}>Hàng hoàn</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Tổng đang hoàn', value:s.returning||0, sub:`TT: ${s.by_platform?.tiktok||0} | SP: ${s.by_platform?.shopee||0}`},
          {label:'Về kho hôm nay', value:s.today_received||0, sub:'kiện nhận được', color:'var(--success)'},
          {label:'Lệch kho', value:s.mismatch||0, sub:'cần xử lý', color:'var(--danger)'},
          {label:'Tổng giá trị hoàn', value:`${((s.total_value||0)/1e6).toFixed(1)}M`, sub:'VNĐ'},
        ].map(c=>(
          <div key={c.label} style={{background:'#f0ede6',borderRadius:'var(--radius)',padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:24,fontWeight:600,color:c.color||'var(--text)'}}>{c.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:500}}>Đơn lệch kho cần xử lý</span>
            <span style={{fontSize:11,background:'var(--danger-bg)',color:'var(--danger)',padding:'2px 8px',borderRadius:99}}>{mismatches?.length||0} đơn</span>
          </div>
          <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
            <thead><tr>{['Mã đơn','Sàn','Lý do'].map(h=><th key={h} style={{padding:'8px 16px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500}}>{h}</th>)}</tr></thead>
            <tbody>
              {(mismatches||[]).slice(0,5).map(m=>(
                <tr key={m.order_id} style={{background:'#fffbeb'}}>
                  <td style={{padding:'10px 16px',fontFamily:'var(--mono)',fontSize:11}}>{m.order_id}</td>
                  <td style={{padding:'10px 16px'}}>{m.platform==='tiktok'?<span style={{background:'var(--tiktok-bg)',color:'var(--tiktok)',fontSize:11,padding:'2px 7px',borderRadius:4}}>TikTok</span>:<span style={{background:'var(--shopee-bg)',color:'var(--shopee)',fontSize:11,padding:'2px 7px',borderRadius:4}}>Shopee</span>}</td>
                  <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:11}}>{m.reason}</td>
                </tr>
              ))}
              {(!mismatches||mismatches.length===0)&&<tr><td colSpan={3} style={{padding:'20px 16px',color:'var(--text3)',textAlign:'center'}}>Không có đơn lệch kho ✓</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px'}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:16}}>Tỷ lệ đối soát hàng hoàn</div>
          {[
            {label:'Khớp hoàn toàn', pct:s.reconcile_pct?.matched||0, color:'#4ade80'},
            {label:'Đang xử lý', pct:s.reconcile_pct?.pending||0, color:'#60a5fa'},
            {label:'Lệch kho', pct:s.reconcile_pct?.mismatch||0, color:'#f87171'},
          ].map(b=>(
            <div key={b.label} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                <span style={{color:'var(--text2)'}}>{b.label}</span>
                <span style={{fontWeight:500,color:b.color}}>{b.pct}%</span>
              </div>
              <div style={{height:6,background:'#f0ede6',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${b.pct}%`,background:b.color,borderRadius:3}}></div>
              </div>
            </div>
          ))}

          {/* Shipper stats */}
          {Object.keys(r.by_shipper||{}).length > 0 && (
            <>
              <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:12,fontWeight:500,marginBottom:10}}>Theo shipper</div>
              {Object.entries(r.by_shipper||{}).slice(0,3).map(([sh,d])=>(
                <div key={sh} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
                  <span style={{color:'var(--text2)'}}>{sh}</span>
                  <span>{d.total} kiện</span>
                  <span style={{color:d.damaged>0?'var(--danger)':'var(--success)'}}>{d.total>0?(d.damaged/d.total*100).toFixed(0):0}% hỏng</span>
                </div>
              ))}
            </>
          )}
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}>Tổng {s.total||0} đơn hoàn — cập nhật mỗi 60 giây</div>
        </div>
      </div>
    </div>
  )
}
