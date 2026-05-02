import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShops, createShop, updateShop, deleteShop, syncShop } from '../services/api.js'

const COLORS = ['#1a56db','#057a55','#c27803','#9333ea','#e02424','#0891b2','#d97706','#7c3aed']
const PRESET_COLORS = COLORS

function ShopCard({ shop, onEdit, onDelete, onSync, syncing }) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:36,height:36,borderRadius:8,background:shop.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0}}>
          {shop.shop_alias?.slice(0,2) || shop.shop_name?.slice(0,2)}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shop.shop_name}</div>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{shop.shop_alias || '—'}</div>
        </div>
        <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,fontWeight:500,flexShrink:0,
          background:shop.is_connected?'var(--success-bg)':'#f0ede6',
          color:shop.is_connected?'var(--success)':'var(--text3)'}}>
          {shop.is_connected ? '● Đã kết nối' : '○ Chưa kết nối'}
        </span>
      </div>
      <div style={{padding:'12px 18px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          {[
            ['App Key', shop.partner_id||'Chưa cài'],
            ['Shop ID', shop.shop_id||'Chưa cài'],
            ['Partner Key', shop.has_key?'••••••••':'Chưa cài'],
            ['Access Token', shop.has_token?'••••••••':'Chưa cài'],
          ].map(([l,v])=>(
            <div key={l} style={{background:'#f8f7f4',borderRadius:'var(--radius)',padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'var(--text3)',marginBottom:2}}>{l}</div>
              <div style={{fontSize:12,color:v.startsWith('Chưa')?'var(--text3)':'var(--text)',fontFamily:v==='••••••••'?'var(--mono)':'inherit'}}>{v}</div>
            </div>
          ))}
        </div>
        {shop.last_sync && <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>Đồng bộ lần cuối: {shop.last_sync}</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>onEdit(shop)} style={{flex:1,padding:'7px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',fontWeight:500}}>
            ✎ Cài đặt
          </button>
          <button onClick={()=>onSync(shop.id)} disabled={syncing===shop.id} style={{flex:1,padding:'7px',border:'none',borderRadius:'var(--radius)',background:shop.color,color:'#fff',fontSize:12,cursor:'pointer',fontWeight:500,opacity:syncing===shop.id?0.7:1}}>
            {syncing===shop.id?'Đang đồng bộ...':'⇄ Đồng bộ'}
          </button>
          <button onClick={()=>onDelete(shop)} style={{padding:'7px 10px',border:'1px solid var(--danger)',borderRadius:'var(--radius)',background:'transparent',color:'var(--danger)',fontSize:12,cursor:'pointer'}}>🗑</button>
        </div>
      </div>
    </div>
  )
}

function ShopModal({ shop, onClose, onSave }) {
  const [form, setForm] = useState(shop || { shop_name:'', shop_alias:'', color:'#1a56db', partner_id:'', partner_key:'', shop_id:'', access_token:'', note:'' })
  const f = v => setForm(p=>({...p,...v}))
  const isEdit = !!shop

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',padding:24,width:480,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:600}}>{isEdit?'Chỉnh sửa shop':'Thêm shop mới'}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text2)'}}>×</button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500}}>Tên shop *</label>
          <input value={form.shop_name} onChange={e=>f({shop_name:e.target.value})} placeholder="VD: Shop Thời Trang A"
            style={{width:'100%',fontSize:13,padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500}}>Tên viết tắt</label>
            <input value={form.shop_alias} onChange={e=>f({shop_alias:e.target.value})} placeholder="TTA" maxLength={6}
              style={{width:'100%',fontSize:13,padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}/>
          </div>
          <div>
            <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500}}>Màu nhận diện</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {PRESET_COLORS.map(c=>(
                <div key={c} onClick={()=>f({color:c})} style={{width:24,height:24,borderRadius:6,background:c,cursor:'pointer',border:form.color===c?'2px solid var(--text)':'2px solid transparent',transition:'border .1s'}}></div>
              ))}
            </div>
          </div>
        </div>

        <div style={{background:'var(--accent-bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--accent-text)'}}>
          <strong>API TikTok Shop</strong> — Lấy từ partner.tiktokshop.com sau khi được duyệt
        </div>

        {[
          {label:'App Key (Partner ID)', key:'partner_id', ph:'Lấy từ TikTok Developer Portal'},
          {label:'App Secret (Partner Key)', key:'partner_key', ph:'Nhập key bảo mật', pw:true},
          {label:'Shop ID', key:'shop_id', ph:'ID shop trên TikTok'},
          {label:'Access Token', key:'access_token', ph:'Token sau khi OAuth thành công', pw:true},
        ].map(({label,key,ph,pw})=>(
          <div key={key} style={{marginBottom:12}}>
            <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500}}>{label}</label>
            <input type={pw?'password':'text'} value={form[key]} onChange={e=>f({[key]:e.target.value})} placeholder={ph}
              style={{width:'100%',fontSize:12,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',fontFamily:pw?'var(--mono)':'inherit'}}/>
          </div>
        ))}

        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500}}>Ghi chú</label>
          <textarea value={form.note} onChange={e=>f({note:e.target.value})} rows={2} placeholder="Shop thời trang, target 18-25..."
            style={{width:'100%',fontSize:12,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',resize:'vertical'}}/>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 18px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:13,cursor:'pointer'}}>Huỷ</button>
          <button onClick={()=>onSave(form)} style={{padding:'9px 20px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            {isEdit?'Lưu thay đổi':'Thêm shop'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ShopSettings() {
  const qc = useQueryClient()
  const { data: shops, isLoading } = useQuery({ queryKey:['shops'], queryFn: getShops })
  const [editShop, setEditShop] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [syncing, setSyncing] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  const saveMutation = useMutation({
    mutationFn: ({id,body}) => id ? updateShop(id,body) : createShop(body),
    onSuccess: () => { qc.invalidateQueries(['shops']); setEditShop(null); setShowNew(false) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteShop(id),
    onSuccess: () => qc.invalidateQueries(['shops'])
  })

  const handleSync = async (id) => {
    setSyncing(id); setSyncResult(null)
    try {
      const r = await syncShop(id)
      setSyncResult({id,...r})
      qc.invalidateQueries(['shops'])
    } catch(e) { setSyncResult({id,success:false,error:String(e)}) }
    setSyncing(null)
  }

  const handleDelete = (shop) => {
    if(confirm(`Xoá shop "${shop.shop_name}"? Dữ liệu đơn hàng vẫn được giữ lại.`)) {
      deleteMutation.mutate(shop.id)
    }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Quản lý Shop</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Kết nối nhiều shop TikTok Shop</p>
        </div>
        <button onClick={()=>setShowNew(true)} style={{padding:'8px 18px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          + Thêm shop
        </button>
      </div>

      {syncResult && (
        <div style={{background:syncResult.success?'var(--success-bg)':'var(--danger-bg)',border:`1px solid ${syncResult.success?'#a7f3d0':'#fca5a5'}`,borderRadius:'var(--radius)',padding:'10px 16px',marginBottom:16,fontSize:13,color:syncResult.success?'var(--success)':'var(--danger)'}}>
          {syncResult.success ? `✓ Đồng bộ thành công${syncResult.mode==='demo'?' (demo mode — chưa có API key)':` — ${syncResult.synced} đơn`}` : `✗ Lỗi: ${syncResult.error}`}
        </div>
      )}

      {isLoading && <div style={{color:'var(--text3)',padding:20}}>Đang tải...</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginBottom:20}}>
        {(shops||[]).map(shop => (
          <ShopCard key={shop.id} shop={shop} onEdit={setEditShop} onDelete={handleDelete} onSync={handleSync} syncing={syncing}/>
        ))}
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:18,fontSize:12,color:'var(--text2)'}}>
        <strong style={{color:'var(--text)',fontSize:13}}>Hướng dẫn kết nối shop</strong>
        <ol style={{marginTop:10,paddingLeft:18,lineHeight:2.2}}>
          <li>Truy cập <strong>partner.tiktokshop.com</strong> → đăng ký developer (nếu chưa có)</li>
          <li>Tạo app → lấy <strong>App Key</strong> và <strong>App Secret</strong></li>
          <li>Chờ TikTok duyệt app (3-5 ngày làm việc)</li>
          <li>Sau khi duyệt → thực hiện OAuth → lấy <strong>Access Token</strong> và <strong>Shop ID</strong></li>
          <li>Điền thông tin vào từng shop ở trên → nhấn <strong>Đồng bộ</strong></li>
        </ol>
        <div style={{marginTop:12,padding:'8px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'var(--radius)',color:'#c2410c'}}>
          ⚠ Access Token TikTok hết hạn sau 24 giờ — cần refresh định kỳ. Partner Key không bao giờ hết hạn.
        </div>
      </div>

      {(showNew || editShop) && (
        <ShopModal
          shop={editShop}
          onClose={()=>{ setEditShop(null); setShowNew(false) }}
          onSave={(form) => saveMutation.mutate({ id: editShop?.id, body: form })}
        />
      )}
    </div>
  )
}
