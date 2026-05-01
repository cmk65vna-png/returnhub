import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReconcileSummary, getMismatches, runReconcile } from '../services/api.js'

export default function Reconcile() {
  const qc = useQueryClient()
  const { data: summary } = useQuery({ queryKey:['reconcile-summary'], queryFn: getReconcileSummary })
  const { data: mismatches, isLoading } = useQuery({ queryKey:['mismatches'], queryFn: getMismatches })
  const mutation = useMutation({
    mutationFn: runReconcile,
    onSuccess: () => { qc.invalidateQueries(['reconcile-summary']); qc.invalidateQueries(['mismatches']); qc.invalidateQueries(['stats']) }
  })

  const s = summary || {}
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Đối soát tự động</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>So sánh trạng thái sàn ↔ kho thực tế</p>
        </div>
        <button onClick={()=>mutation.mutate()} disabled={mutation.isPending} style={{padding:'9px 18px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          {mutation.isPending?'Đang chạy...':'⇄ Chạy đối soát ngay'}
        </button>
      </div>

      {mutation.data && (
        <div style={{background:'var(--success-bg)',border:'1px solid #a7f3d0',borderRadius:'var(--radius)',padding:'10px 16px',marginBottom:16,fontSize:13,color:'var(--success)'}}>
          ✓ Đối soát xong: {mutation.data.matched} khớp, {mutation.data.mismatch} lệch, {mutation.data.pending} đang xử lý
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Khớp hoàn toàn', value:s.matched||0, pct:s.matched_pct||0, color:'var(--success)', bg:'var(--success-bg)'},
          {label:'Lệch kho', value:s.mismatch||0, pct:s.mismatch_pct||0, color:'var(--danger)', bg:'var(--danger-bg)'},
          {label:'Đang xử lý', value:s.pending||0, pct:s.pending_pct||0, color:'var(--accent-text)', bg:'var(--accent-bg)'},
        ].map(c=>(
          <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:28,fontWeight:600,color:c.color}}>{c.value}</div>
            <div style={{height:4,background:'#f0ede6',borderRadius:2,marginTop:10,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${c.pct}%`,background:c.color,borderRadius:2}}></div>
            </div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>{c.pct}% tổng số đơn</div>
          </div>
        ))}
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,fontWeight:500}}>Đơn lệch — cần xử lý thủ công</span>
          <span style={{fontSize:11,background:'var(--danger-bg)',color:'var(--danger)',padding:'2px 10px',borderRadius:99}}>{mismatches?.length||0} đơn</span>
        </div>
        <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
          <thead>
            <tr>{['Mã đơn','Sàn','Sản phẩm','Sàn báo','Kho thực tế','Lý do lệch','Ngày hoàn'].map(h=>(
              <th key={h} style={{padding:'9px 16px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading&&<tr><td colSpan={7} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Đang tải...</td></tr>}
            {!isLoading&&(mismatches||[]).length===0&&<tr><td colSpan={7} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Không có đơn lệch ✓</td></tr>}
            {(mismatches||[]).map(m=>(
              <tr key={m.order_id} style={{background:'#fffbeb'}}>
                <td style={{padding:'10px 16px',fontFamily:'var(--mono)',fontSize:11,whiteSpace:'nowrap'}}>{m.order_id}</td>
                <td style={{padding:'10px 16px'}}>{m.platform==='tiktok'?<span style={{background:'var(--tiktok-bg)',color:'var(--tiktok)',fontSize:11,padding:'2px 7px',borderRadius:4,fontWeight:500}}>TikTok</span>:<span style={{background:'var(--shopee-bg)',color:'var(--shopee)',fontSize:11,padding:'2px 7px',borderRadius:4,fontWeight:500}}>Shopee</span>}</td>
                <td style={{padding:'10px 16px',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.product_name}</td>
                <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:11}}>{m.platform_status}</td>
                <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:11}}>{m.warehouse_status}</td>
                <td style={{padding:'10px 16px',color:'var(--danger)',fontSize:11}}>{m.reason}</td>
                <td style={{padding:'10px 16px',color:'var(--text3)'}}>{m.return_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:16,padding:16,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',fontSize:12,color:'var(--text2)'}}>
        <strong style={{color:'var(--text)'}}>Quy tắc đối soát tự động:</strong>
        <ul style={{marginTop:8,paddingLeft:18,lineHeight:2}}>
          <li>Sàn = "Hoàn xong" + Kho = "Đã nhận" → <span style={{color:'var(--success)',fontWeight:500}}>Khớp ✓</span></li>
          <li>Sàn = "Đang hoàn" + Kho = "Đã nhận" → <span style={{color:'var(--danger)',fontWeight:500}}>Lệch — sàn chưa cập nhật</span></li>
          <li>Sàn = "Hoàn xong" + Kho = "Chưa nhận" → <span style={{color:'var(--danger)',fontWeight:500}}>Lệch — hàng chưa về kho</span></li>
          <li>Kho = "Hỏng hàng" → <span style={{color:'var(--danger)',fontWeight:500}}>Lệch — cần khiếu nại shipper</span></li>
        </ul>
      </div>
    </div>
  )
}
