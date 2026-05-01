import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReturns, updateWarehouse, manualReconcile } from '../services/api.js'

const STATUS_LABELS = {
  platform: { returning:'Đang hoàn', completed:'Hoàn xong', processing:'Đang xử lý' },
  warehouse: { not_received:'Chưa nhận', received:'Đã nhận', damaged:'Hỏng hàng', missing:'Thiếu hàng' },
  reconcile: { matched:'Khớp', mismatch:'Lệch', pending:'Đang xử lý' },
}
const PILL_TYPE = {
  matched:'success', mismatch:'danger', pending:'info',
  returning:'warning', completed:'success', processing:'info',
  received:'success', not_received:'gray', damaged:'danger', missing:'danger',
}
function Pill({label, type}) {
  const styles = {
    danger:{background:'var(--danger-bg)',color:'var(--danger)'},
    success:{background:'var(--success-bg)',color:'var(--success)'},
    warning:{background:'var(--warning-bg)',color:'var(--warning)'},
    info:{background:'var(--accent-bg)',color:'var(--accent-text)'},
    gray:{background:'#f0ede6',color:'var(--text2)'},
  }
  return <span style={{...styles[type]||styles.gray,fontSize:11,padding:'2px 9px',borderRadius:99,fontWeight:500,whiteSpace:'nowrap'}}>{label}</span>
}

export default function Returns() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ platform:'all', reconcile_status:'all', search:'' })
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({ warehouse_status:'', notes:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['returns', filters],
    queryFn: () => getReturns({ platform: filters.platform!=='all'?filters.platform:undefined, reconcile_status: filters.reconcile_status!=='all'?filters.reconcile_status:undefined, search: filters.search||undefined }),
  })

  const mutation = useMutation({
    mutationFn: ({orderId, body}) => updateWarehouse(orderId, body),
    onSuccess: () => { qc.invalidateQueries(['returns']); qc.invalidateQueries(['stats']); setSelected(null) }
  })

  const f = v => setFilters(p=>({...p,...v}))
  const items = data?.items || []
  const total = data?.total || 0

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Đơn hoàn</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{total} đơn</p>
        </div>
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input value={filters.search} onChange={e=>f({search:e.target.value})} placeholder="Tìm mã đơn, sản phẩm..." style={{fontSize:12,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',width:200}}/>
          {[
            {key:'platform',opts:[['all','Tất cả sàn'],['tiktok','TikTok Shop'],['shopee','Shopee']]},
            {key:'reconcile_status',opts:[['all','Tất cả trạng thái'],['mismatch','Lệch kho'],['matched','Đã khớp'],['pending','Đang xử lý']]},
          ].map(({key,opts})=>(
            <select key={key} value={filters[key]} onChange={e=>f({[key]:e.target.value})} style={{fontSize:12,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}>
              {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',fontSize:12,borderCollapse:'collapse',tableLayout:'fixed'}}>
            <thead>
              <tr>{['Mã đơn','Sàn','Sản phẩm','Trạng thái sàn','Trạng thái kho','Đối soát','Ngày hoàn',''].map((h,i)=>(
                <th key={i} style={{padding:'9px 14px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'var(--text3)'}}>Đang tải...</td></tr>}
              {!isLoading && items.length===0 && <tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'var(--text3)'}}>Không có đơn nào</td></tr>}
              {items.map(r=>(
                <tr key={r.order_id} style={{background:r.reconcile_status==='mismatch'?'#fffbeb':'transparent'}} onMouseEnter={e=>e.currentTarget.style.background=r.reconcile_status==='mismatch'?'#fef9c3':'#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background=r.reconcile_status==='mismatch'?'#fffbeb':'transparent'}>
                  <td style={{padding:'10px 14px',fontFamily:'var(--mono)',fontSize:11,whiteSpace:'nowrap'}}>{r.order_id}</td>
                  <td style={{padding:'10px 14px'}}>{r.platform==='tiktok'?<span style={{background:'var(--tiktok-bg)',color:'var(--tiktok)',fontSize:11,padding:'2px 7px',borderRadius:4,fontWeight:500}}>TikTok</span>:<span style={{background:'var(--shopee-bg)',color:'var(--shopee)',fontSize:11,padding:'2px 7px',borderRadius:4,fontWeight:500}}>Shopee</span>}</td>
                  <td style={{padding:'10px 14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{r.product_name}</td>
                  <td style={{padding:'10px 14px'}}><Pill label={STATUS_LABELS.platform[r.platform_status]||r.platform_status} type={PILL_TYPE[r.platform_status]}/></td>
                  <td style={{padding:'10px 14px'}}><Pill label={STATUS_LABELS.warehouse[r.warehouse_status]||r.warehouse_status} type={PILL_TYPE[r.warehouse_status]}/></td>
                  <td style={{padding:'10px 14px'}}><Pill label={STATUS_LABELS.reconcile[r.reconcile_status]||r.reconcile_status} type={PILL_TYPE[r.reconcile_status]}/></td>
                  <td style={{padding:'10px 14px',color:'var(--text2)'}}>{r.return_date}</td>
                  <td style={{padding:'10px 14px'}}>
                    <button onClick={()=>setSelected(r)} style={{fontSize:11,padding:'4px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',color:'var(--text)',cursor:'pointer'}}>Cập nhật</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}} onClick={()=>setSelected(null)}>
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',padding:24,width:440,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>Cập nhật đơn hoàn</h2>
            <p style={{fontSize:12,color:'var(--text3)',marginBottom:16,fontFamily:'var(--mono)'}}>{selected.order_id}</p>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Trạng thái kho thực tế</label>
              <select value={editForm.warehouse_status} onChange={e=>setEditForm(f=>({...f,warehouse_status:e.target.value}))} style={{width:'100%',fontSize:13,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}>
                {[['not_received','Chưa nhận'],['received','Đã nhận — nguyên vẹn'],['damaged','Đã nhận — hỏng hàng'],['missing','Thiếu hàng']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Ghi chú</label>
              <textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} rows={3} style={{width:'100%',fontSize:13,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',resize:'vertical'}}></textarea>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setSelected(null)} style={{padding:'8px 16px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:13,cursor:'pointer'}}>Hủy</button>
              <button onClick={()=>mutation.mutate({orderId:selected.order_id,body:{warehouse_status:editForm.warehouse_status,notes:editForm.notes}})} style={{padding:'8px 16px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                {mutation.isPending?'Đang lưu...':'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
