import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRevenueChart, getOrderStats } from '../services/api.js'

function MiniBar({value, max, color}) {
  const pct = max > 0 ? Math.max(4, (value/max)*100) : 4
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:80,cursor:'pointer'}}>
      <div style={{width:'100%',maxWidth:18,background:color||'var(--accent)',borderRadius:'3px 3px 0 0',height:`${pct}%`,minHeight:4,transition:'height .3s'}}></div>
    </div>
  )
}

export default function Revenue() {
  const [days, setDays] = useState(30)
  const { data: chart } = useQuery({ queryKey:['revenue-chart',days], queryFn:()=>getRevenueChart({days}) })
  const { data: stats } = useQuery({ queryKey:['order-stats',days], queryFn:()=>getOrderStats({days}) })

  const chartData = chart || []
  const maxRevenue = Math.max(...chartData.map(d=>d.revenue), 1)
  const totalRevenue = chartData.reduce((s,d)=>s+d.revenue,0)
  const totalOrders = chartData.reduce((s,d)=>s+d.count,0)
  const avgDay = Math.round(totalRevenue / Math.max(days, 1))
  const s = stats || {}

  const exportCSV = () => {
    const rows = [
      ['Ngày','Doanh thu (VND)','Số đơn'],
      ...chartData.map(d=>[d.date,d.revenue,d.count])
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob)
    a.download=`DoanhThu_${days}ngay_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const byStatus = s.by_status || {}
  const totalWithStatus = Object.values(byStatus).reduce((a,b)=>a+b,0)||1
  const statusColors = {delivered:'#057a55',shipping:'#1a56db',confirmed:'#c27803',pending:'#6b7280',cancelled:'#e02424',return:'#c2410c'}
  const statusLabels = {delivered:'Đã giao',shipping:'Đang giao',confirmed:'Đã xác nhận',pending:'Chờ xác nhận',cancelled:'Đã huỷ',return:'Hoàn hàng'}

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Doanh thu & Báo cáo</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>TikTok Shop — dữ liệu demo</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {[[7,'7 ngày'],[14,'14 ngày'],[30,'30 ngày']].map(([d,l])=>(
            <button key={d} onClick={()=>setDays(d)} style={{padding:'6px 14px',border:'none',borderRadius:'var(--radius)',fontSize:12,fontWeight:500,cursor:'pointer',background:days===d?'var(--accent)':'var(--border)',color:days===d?'#fff':'var(--text2)'}}>{l}</button>
          ))}
          <button onClick={exportCSV} style={{padding:'6px 14px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',color:'var(--text)',fontWeight:500}}>↓ Xuất CSV</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:`Tổng doanh thu ${days} ngày`, value:`${(totalRevenue/1e6).toFixed(1)}M`, sub:'VNĐ', color:'var(--text)'},
          {label:'Tổng đơn thành công', value:totalOrders, sub:'đơn', color:'var(--accent-text)'},
          {label:'Doanh thu TB/ngày', value:`${(avgDay/1e6).toFixed(2)}M`, sub:'VNĐ', color:'var(--success)'},
          {label:'Giá trị TB/đơn', value:`${((s.avg_order_value||0)/1000).toFixed(0)}K`, sub:'VNĐ', color:'var(--text)'},
        ].map(c=>(
          <div key={c.label} style={{background:'#f0ede6',borderRadius:'var(--radius)',padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:24,fontWeight:600,color:c.color}}>{c.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
        {/* Bar chart */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:18}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Doanh thu theo ngày</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:16}}>Chỉ tính đơn thành công (không bao gồm huỷ/hoàn)</div>
          {chartData.length === 0 ? (
            <div style={{height:100,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:12}}>Không có dữ liệu</div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'flex-end',gap:2,height:90,marginBottom:6}}>
                {chartData.map((d,i) => (
                  <MiniBar key={i} value={d.revenue} max={maxRevenue} color={d.revenue>0?'var(--accent)':'#e8e6df'}/>
                ))}
              </div>
              {/* X axis — show every N labels */}
              <div style={{display:'flex',gap:2}}>
                {chartData.map((d,i) => {
                  const step = Math.ceil(chartData.length/8)
                  return (
                    <div key={i} style={{flex:1,textAlign:'center',fontSize:9,color:'var(--text3)',overflow:'hidden'}}>
                      {i%step===0 ? d.date : ''}
                    </div>
                  )
                })}
              </div>
              {/* Top 3 days */}
              <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>Ngày doanh thu cao nhất</div>
                {[...chartData].sort((a,b)=>b.revenue-a.revenue).slice(0,3).map((d,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:12,color:'var(--text2)'}}>{['🥇','🥈','🥉'][i]} {d.date}</span>
                    <span style={{fontSize:12,fontWeight:500}}>{d.revenue.toLocaleString('vi-VN')}đ</span>
                    <span style={{fontSize:11,color:'var(--text3)'}}>{d.count} đơn</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Status breakdown */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:18}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:16}}>Tỷ lệ đơn theo trạng thái</div>
          {/* Stacked bar */}
          <div style={{height:16,borderRadius:8,overflow:'hidden',display:'flex',marginBottom:16}}>
            {Object.entries(byStatus).map(([st,count])=>(
              <div key={st} style={{width:`${count/totalWithStatus*100}%`,background:statusColors[st]||'#ccc',minWidth:count>0?4:0}}></div>
            ))}
          </div>
          {Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).map(([st,count])=>(
            <div key={st} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{width:10,height:10,borderRadius:2,background:statusColors[st]||'#ccc',flexShrink:0}}></div>
              <span style={{fontSize:12,color:'var(--text2)',flex:1}}>{statusLabels[st]||st}</span>
              <span style={{fontSize:12,fontWeight:500}}>{count}</span>
              <span style={{fontSize:11,color:'var(--text3)',width:38,textAlign:'right'}}>{Math.round(count/totalWithStatus*100)}%</span>
            </div>
          ))}
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}>
            Tổng {s.total||0} đơn trong {days} ngày
          </div>
        </div>
      </div>

      {/* Daily table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:500}}>Chi tiết theo ngày</div>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
            <thead style={{position:'sticky',top:0,background:'var(--surface)'}}>
              <tr>{['Ngày','Doanh thu','Số đơn','TB/đơn','Tỷ trọng'].map(h=>(
                <th key={h} style={{padding:'8px 16px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((d,i)=>(
                <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'8px 16px',color:'var(--text2)'}}>{d.date}</td>
                  <td style={{padding:'8px 16px',fontWeight:d.revenue>0?500:400,color:d.revenue>0?'var(--text)':'var(--text3)'}}>{d.revenue.toLocaleString('vi-VN')}đ</td>
                  <td style={{padding:'8px 16px',color:'var(--text2)',textAlign:'center'}}>{d.count}</td>
                  <td style={{padding:'8px 16px',color:'var(--text2)'}}>{d.count>0?(d.revenue/d.count).toLocaleString('vi-VN')+'đ':'—'}</td>
                  <td style={{padding:'8px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{height:4,width:60,background:'#f0ede6',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${totalRevenue>0?d.revenue/totalRevenue*100:0}%`,background:'var(--accent)',borderRadius:2}}></div>
                      </div>
                      <span style={{fontSize:11,color:'var(--text3)'}}>{totalRevenue>0?Math.round(d.revenue/totalRevenue*100):0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
