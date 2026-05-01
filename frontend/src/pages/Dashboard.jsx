import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStats, getMismatches, getWarehouseReport, getReturns } from '../services/api.js'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey:['stats'], queryFn: getStats, refetchInterval:60000 })
  const { data: mismatches } = useQuery({ queryKey:['mismatches'], queryFn: getMismatches })
  const { data: report } = useQuery({ queryKey:['warehouse-report'], queryFn: getWarehouseReport })
  const { data: allReturns } = useQuery({ queryKey:['returns',{}], queryFn: () => getReturns({limit:500}) })

  const exportReport = () => {
    const s = stats || {}
    const r = report || {}
    const items = allReturns?.items || []
    const mis = mismatches || []
    const today = new Date().toLocaleDateString('vi-VN')
    const now = new Date().toLocaleString('vi-VN')

    const rows = [
      ['BÁO CÁO TỔNG HỢP HÀNG HOÀN'],
      ['Xuất lúc: ' + now],
      [],
      ['=== I. TỔNG QUAN ==='],
      ['Chỉ tiêu', 'Số liệu'],
      ['Tổng đơn đang hoàn', s.returning || 0],
      ['Đã về kho hôm nay', s.today_received || 0],
      ['Lệch kho cần xử lý', s.mismatch || 0],
      ['Đã đối soát khớp', s.matched || 0],
      ['Tổng giá trị hàng hoàn (VND)', s.total_value || 0],
      ['Giá trị TikTok Shop (VND)', r.tiktok_value || 0],
      ['Giá trị Shopee (VND)', r.shopee_value || 0],
      [],
      ['=== II. THỐNG KÊ THEO ĐƠN VỊ VẬN CHUYỂN ==='],
      ['Shipper', 'Tổng kiện', 'Hỏng/Rách', 'Tỷ lệ lỗi'],
      ...Object.entries(r.by_shipper || {}).map(([ship, d]) => [
        ship, d.total, d.damaged,
        d.total > 0 ? (d.damaged / d.total * 100).toFixed(1) + '%' : '0%'
      ]),
      [],
      ['=== III. NHẬP KHO THEO NGÀY (7 ngày gần nhất) ==='],
      ['Ngày', 'Tổng nhận', 'Nguyên vẹn', 'Hỏng/Rách'],
      ...Object.entries(r.by_day || {}).map(([day, d]) => [day, d.total, d.intact, d.damaged]),
      [],
      ['=== IV. DANH SÁCH ĐƠN LỆCH KHO ==='],
      ['Mã đơn', 'Sàn', 'Sản phẩm', 'Sàn báo', 'Kho thực tế', 'Lý do', 'Ngày hoàn'],
      ...mis.map(m => [m.order_id, m.platform, m.product_name, m.platform_status, m.warehouse_status, m.reason, m.return_date]),
      [],
      ['=== V. TOÀN BỘ ĐƠN HOÀN ==='],
      ['Mã đơn', 'Sàn', 'Sản phẩm', 'SKU', 'Giá trị', 'Trạng thái sàn', 'Trạng thái kho', 'Đối soát', 'Shipper', 'Mã vận đơn', 'Ngày hoàn'],
      ...items.map(r => [r.order_id, r.platform, r.product_name, r.sku, r.value, r.platform_status, r.warehouse_status, r.reconcile_status, r.shipper, r.tracking_code, r.return_date]),
    ]
    const csv = rows.map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'BaoCao_TongHop_HangHoan_' + new Date().toISOString().slice(0,10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div style={{color:'var(--text2)',padding:40}}>Đang tải dữ liệu...</div>
  const s = stats || {}
  const r = report || {}

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,color:'var(--text)'}}>Dashboard</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Tổng quan hàng hoàn</p>
        </div>
        <button onClick={exportReport} style={{padding:'8px 18px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
          ↓ Xuất báo cáo tổng hợp
        </button>
      </div>

      {s.mismatch > 0 && (
        <div style={{background:'var(--warning-bg)',border:'1px solid #fde68a',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--warning)'}}>
          ⚠ <strong>{s.mismatch} đơn lệch kho</strong> — Cần đối soát thủ công.
          <a href="/reconcile" style={{marginLeft:'auto',color:'var(--warning)',fontSize:12}}>Xem chi tiết →</a>
        </div>
      )}

      {/* Stats */}
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

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Đơn lệch */}
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

        {/* Tỷ lệ đối soát */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px'}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:16}}>Tỷ lệ đối soát</div>
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
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}>Tổng {s.total||0} đơn — Cập nhật mỗi 60 giây</div>
        </div>
      </div>

      {/* Thống kê shipper */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:500}}>Thống kê theo đơn vị vận chuyển</div>
        <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
          <thead><tr>{['Shipper','Tổng kiện nhận','Hỏng/Rách','Tỷ lệ lỗi'].map(h=><th key={h} style={{padding:'9px 18px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500}}>{h}</th>)}</tr></thead>
          <tbody>
            {Object.entries(r.by_shipper||{}).length===0 && <tr><td colSpan={4} style={{padding:20,textAlign:'center',color:'var(--text3)'}}>Chưa có dữ liệu nhập kho</td></tr>}
            {Object.entries(r.by_shipper||{}).map(([ship,d])=>(
              <tr key={ship}>
                <td style={{padding:'10px 18px',fontWeight:500}}>{ship}</td>
                <td style={{padding:'10px 18px'}}>{d.total}</td>
                <td style={{padding:'10px 18px',color:d.damaged>0?'var(--danger)':'var(--text2)'}}>{d.damaged}</td>
                <td style={{padding:'10px 18px'}}>
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,fontWeight:500,background:d.total>0&&d.damaged/d.total>0.1?'var(--danger-bg)':'var(--success-bg)',color:d.total>0&&d.damaged/d.total>0.1?'var(--danger)':'var(--success)'}}>
                    {d.total>0?(d.damaged/d.total*100).toFixed(1):0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
