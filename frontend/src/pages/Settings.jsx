import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatformConfig, savePlatformConfig, syncPlatform } from '../services/api.js'

function PlatformCard({ config, onSave, onSync, syncing }) {
  const p = config.platform
  const isT = p === 'tiktok'
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ partner_id: config.partner_id, partner_key:'', shop_id: config.shop_id, access_token:'' })
  const color = isT ? 'var(--tiktok)' : 'var(--shopee)'
  const bg = isT ? 'var(--tiktok-bg)' : 'var(--shopee-bg)'

  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
      <div style={{background:bg,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,color}}>{isT?'TikTok Shop':'Shopee'}</div>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{isT?'TikTok Shop Open API v2':'Shopee Open Platform API v2'}</div>
        </div>
        <span style={{fontSize:11,padding:'4px 10px',borderRadius:99,fontWeight:500,background:config.is_connected?'var(--success-bg)':'#f0ede6',color:config.is_connected?'var(--success)':'var(--text3)'}}>
          {config.is_connected?'● Đã kết nối':'○ Chưa kết nối'}
        </span>
      </div>
      <div style={{padding:20}}>
        {config.last_sync && <p style={{fontSize:11,color:'var(--text3)',marginBottom:12}}>Đồng bộ lần cuối: {config.last_sync}</p>}

        {!editing ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              {[['Partner/App ID', config.partner_id||'Chưa cài'], ['Shop ID', config.shop_id||'Chưa cài'], ['Partner Key', config.has_key?'••••••••':'Chưa cài'], ['Access Token', config.has_token?'••••••••':'Chưa cài']].map(([l,v])=>(
                <div key={l} style={{background:'#f8f7f4',borderRadius:'var(--radius)',padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:12,color:v.startsWith('Chưa')?'var(--text3)':'var(--text)',fontFamily:v==='••••••••'?'var(--mono)':'inherit'}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditing(true)} style={{flex:1,padding:'9px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',fontWeight:500}}>
                ✎ Cài đặt API key
              </button>
              <button onClick={()=>onSync(p)} disabled={syncing} style={{flex:1,padding:'9px',border:'none',borderRadius:'var(--radius)',background:color,color:'#fff',fontSize:12,cursor:syncing?'wait':'pointer',fontWeight:500,opacity:syncing?0.7:1}}>
                {syncing?'Đang đồng bộ...':'⇄ Đồng bộ ngay'}
              </button>
            </div>
          </>
        ) : (
          <>
            {[
              {key:'partner_id', label:isT?'App Key (Partner ID)':'Partner ID', ph:isT?'Lấy từ TikTok Shop Developer Portal':'Lấy từ Shopee Open Platform'},
              {key:'partner_key', label:isT?'App Secret (Partner Key)':'Partner Key', ph:'Nhập key bảo mật', pw:true},
              {key:'shop_id', label:'Shop ID', ph:'ID shop của bạn trên sàn'},
              {key:'access_token', label:'Access Token', ph:'Token sau khi OAuth thành công', pw:true},
            ].map(({key,label,ph,pw})=>(
              <div key={key} style={{marginBottom:10}}>
                <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>{label}</label>
                <input type={pw?'password':'text'} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={{width:'100%',fontSize:12,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}/>
              </div>
            ))}
            <div style={{background:'var(--accent-bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px',marginBottom:12,fontSize:11,color:'var(--accent-text)'}}>
              <strong>Hướng dẫn lấy API key:</strong><br/>
              {isT?<>1. Truy cập <strong>partner.tiktokshop.com</strong> → Đăng ký developer<br/>2. Tạo app → Lấy App Key & App Secret<br/>3. OAuth để lấy Access Token</>:<>1. Truy cập <strong>open.shopee.com</strong> → Đăng ký partner<br/>2. Lấy Partner ID & Partner Key<br/>3. OAuth để lấy Access Token</>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditing(false)} style={{flex:1,padding:'8px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer'}}>Hủy</button>
              <button onClick={()=>{onSave(p,form);setEditing(false)}} style={{flex:1,padding:'8px',border:'none',borderRadius:'var(--radius)',background:'var(--accent)',color:'#fff',fontSize:12,fontWeight:500,cursor:'pointer'}}>Lưu cấu hình</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const { data: configs } = useQuery({ queryKey:['platform-config'], queryFn: getPlatformConfig })
  const [syncingPlatform, setSyncingPlatform] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  const saveMutation = useMutation({ mutationFn: ({p,b})=>savePlatformConfig(p,b), onSuccess:()=>qc.invalidateQueries(['platform-config']) })

  const handleSync = async (p) => {
    setSyncingPlatform(p); setSyncResult(null)
    try { const r = await syncPlatform(p); setSyncResult({platform:p,...r}) } catch(e) { setSyncResult({platform:p,success:false,error:String(e)}) }
    setSyncingPlatform(null); qc.invalidateQueries(['platform-config'])
  }

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Kết nối sàn</h1>
      <p style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>Cấu hình API để đồng bộ đơn hoàn tự động</p>

      {syncResult && (
        <div style={{background:syncResult.success?'var(--success-bg)':'var(--danger-bg)',border:`1px solid ${syncResult.success?'#a7f3d0':'#fca5a5'}`,borderRadius:'var(--radius)',padding:'10px 16px',marginBottom:16,fontSize:13,color:syncResult.success?'var(--success)':'var(--danger)'}}>
          {syncResult.success ? `✓ ${syncResult.platform==='tiktok'?'TikTok Shop':'Shopee'}: ${syncResult.message||`Đồng bộ ${syncResult.synced} đơn (${syncResult.new} mới, ${syncResult.updated} cập nhật)`}` : `✗ Lỗi: ${syncResult.error}`}
          {syncResult.mode==='demo' && <span style={{marginLeft:8,fontSize:11,opacity:0.7}}>(demo mode — chưa cài API key thật)</span>}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {(configs||[]).map(c=>(
          <PlatformCard key={c.platform} config={c}
            onSave={(p,b)=>saveMutation.mutate({p,b})}
            onSync={handleSync}
            syncing={syncingPlatform===c.platform}
          />
        ))}
      </div>

      <div style={{marginTop:20,padding:16,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',fontSize:12}}>
        <strong style={{fontSize:13,color:'var(--text)'}}>⚠ Lưu ý bảo mật</strong>
        <ul style={{marginTop:8,paddingLeft:18,lineHeight:2,color:'var(--text2)'}}>
          <li>API key được lưu trong database local trên máy bạn, không gửi đi đâu</li>
          <li>Không chia sẻ Partner Key / Access Token với người khác</li>
          <li>Access Token Shopee hết hạn sau 4 giờ — cần refresh định kỳ</li>
          <li>Access Token TikTok Shop hết hạn sau 24 giờ</li>
        </ul>
      </div>
    </div>
  )
}
