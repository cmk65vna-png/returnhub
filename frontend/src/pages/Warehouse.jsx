import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodaySummary, receiveItem, getStats, getReturns } from '../services/api.js'

const COND_LABELS = { intact:'Nguyên vẹn', torn_package:'Rách bao bì', damaged:'Hỏng hàng', missing:'Thiếu hàng' }
const COND_COLORS = { intact:'var(--success)', torn_package:'var(--warning)', damaged:'var(--danger)', missing:'var(--danger)' }
const SHIPPERS = ['GHTK','GiaoHàng','ViettelPost','ĐTDS','JT Express','Ninja Van']

export default function Warehouse() {
  const qc = useQueryClient()
  const inputRef = useRef(null)
  const { data: summary, refetch } = useQuery({ queryKey:['today-summary'], queryFn: getTodaySummary, refetchInterval:10000 })
  const { data: stats } = useQuery({ queryKey:['stats'], queryFn: getStats })
  const { data: allReturns } = useQuery({ queryKey:['returns',{}], queryFn: () => getReturns({limit:500}) })

  const [preset, setPreset] = useState({ shipper:'GHTK', condition:'intact' })
  const [batchMode, setBatchMode] = useState(true)
  const [trackingInput, setTrackingInput] = useState('')
  const [toasts, setToasts] = useState([])
  const [scanCount, setScanCount] = useState(0)

  useEffect(() => {
    if (batchMode && inputRef.current) inputRef.current.focus()
  }, [batchMode])

  const addToast = (msg, type='success') => {
    const id = Date.now()
    setToasts(t => [...t.slice(-4), { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 4000 : 2500)
  }

  const mutation = useMutation({
    mutationFn: receiveItem,
    onSuccess: (data, vars) => {
      if (data.duplicate) {
        // Trùng mã — cảnh báo, KHÔNG lưu
        addToast('⚠ TRÙNG: ' + data.error, 'error')
        setTrackingInput('')
        setTimeout(() => inputRef.current?.focus(), 30)
        return
      }
      if (!data.success) {
        addToast('✗ Lỗi: ' + (data.error || 'Không xác định'), 'error')
        setTrackingInput('')
        setTimeout(() => inputRef.current?.focus(), 30)
        return
      }
      qc.invalidateQueries(['today-summary'])
      qc.invalidateQueries(['stats'])
      setScanCount(c => c + 1)
      addToast('✓ Đã nhập: ' + vars.tracking_code, 'success')
      setTrackingInput('')
      setTimeout(() => inputRef.current?.focus(), 30)
    },
    onError: (_, vars) => {
      addToast('✗ Lỗi kết nối', 'error')
      setTrackingInput('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  })

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && trackingInput.trim()) {
      e.preventDefault()
      mutation.mutate({ tracking_code: trackingInput.trim(), condition: preset.condition, shipper: preset.shipper, note: '' })
    }
  }

  const exportReport = () => {
    const logs = summary?.logs || []
    const today = new Date().toLocaleDateString('vi-VN')
    const rows = [
      ['BÁO CÁO NHẬP KHO - ' + today],
      [],
      ['Tổng nhận hôm nay', summary?.total || 0],
      ['Nguyên vẹn', summary?.intact || 0],
      ['Hỏng/Rách', summary?.damaged || 0],
      [],
      ['Mã vận đơn', 'Shipper', 'Giờ nhận', 'Tình trạng'],
      ...logs.map(l => [l.tracking_code || '', l.shipper || '', l.received_at || '', l.condition_label || '']),
    ]
    const csv = rows.map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'NhapKho_' + new Date().toISOString().slice(0,10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const logs = summary?.logs || []

  return (
    <div>
      {/* Toast popup */}
      <div style={{position:'fixed',bottom:20,right:20,zIndex:999,display:'flex',flexDirection:'column',gap:6}}>
        {toasts.map(t=>(
          <div key={t.id} style={{
            padding:'10px 16px',borderRadius:'var(--radius)',fontSize:13,fontWeight:500,minWidth:280,
            background: t.type==='success' ? '#052e16' : t.type==='error' ? '#450a0a' : '#1e3a5f',
            color: t.type==='success' ? '#4ade80' : t.type==='error' ? '#fca5a5' : '#93c5fd',
            border: '1px solid ' + (t.type==='success' ? '#166534' : t.type==='error' ? '#991b1b' : '#1e40af'),
            boxShadow:'0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600}}>Nhập kho</h1>
          <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Ghi nhận kiện hàng shipper trả về</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportReport} style={{padding:'7px 14px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',color:'var(--text)',fontWeight:500}}>
            ↓ Xuất CSV hôm nay
          </button>
          <button onClick={()=>setBatchMode(true)} style={{padding:'7px 14px',border:'none',borderRadius:'var(--radius)',background:batchMode?'var(--accent)':'var(--border)',color:batchMode?'#fff':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer'}}>
            ⚡ Quét hàng loạt
          </button>
          <button onClick={()=>setBatchMode(false)} style={{padding:'7px 14px',border:'none',borderRadius:'var(--radius)',background:!batchMode?'var(--accent)':'var(--border)',color:!batchMode?'#fff':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer'}}>
            📝 Thủ công
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:20,alignItems:'start'}}>
        <div>
          {/* Cài đặt cố định */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:18,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>
              ⚙ Cài đặt cố định
              <span style={{fontSize:11,color:'var(--text3)',fontWeight:400,marginLeft:6}}>chọn 1 lần, quét nhiều đơn</span>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6}}>Đơn vị vận chuyển</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {SHIPPERS.map(s=>(
                  <button key={s} onClick={()=>setPreset(p=>({...p,shipper:s}))}
                    style={{padding:'5px 12px',borderRadius:99,fontSize:12,cursor:'pointer',fontWeight:preset.shipper===s?500:400,
                      border:'1.5px solid '+(preset.shipper===s?'var(--accent)':'var(--border)'),
                      background:preset.shipper===s?'var(--accent-bg)':'transparent',
                      color:preset.shipper===s?'var(--accent-text)':'var(--text2)'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6}}>Tình trạng kiện hàng</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {Object.entries(COND_LABELS).map(([v,l])=>(
                  <button key={v} onClick={()=>setPreset(p=>({...p,condition:v}))}
                    style={{padding:'7px 10px',borderRadius:'var(--radius)',fontSize:12,cursor:'pointer',textAlign:'left',fontWeight:preset.condition===v?500:400,
                      border:'1.5px solid '+(preset.condition===v?COND_COLORS[v]:'var(--border)'),
                      background:preset.condition===v?'#f0fdf4':'transparent',
                      color:preset.condition===v?COND_COLORS[v]:'var(--text2)'}}>
                    {preset.condition===v?'● ':'○ '}{l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {batchMode ? (
            <div style={{background:'var(--surface)',border:'2px solid var(--accent)',borderRadius:'var(--radius-lg)',padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:500}}>📡 Quét hàng loạt</span>
                <span style={{fontSize:12,background:'var(--accent-bg)',color:'var(--accent-text)',padding:'2px 10px',borderRadius:99,fontWeight:600}}>
                  Đã quét: {scanCount} kiện
                </span>
              </div>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>
                Shipper: <strong style={{color:'var(--text)'}}>{preset.shipper}</strong>
                &nbsp;|&nbsp;
                Tình trạng: <strong style={{color:COND_COLORS[preset.condition]}}>{COND_LABELS[preset.condition]}</strong>
              </div>
              <input
                ref={inputRef}
                value={trackingInput}
                onChange={e=>setTrackingInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Quét mã vận đơn → tự lưu, tự chặn trùng..."
                autoFocus
                style={{width:'100%',fontSize:15,padding:'12px 14px',borderRadius:'var(--radius)',outline:'none',fontFamily:'var(--mono)',
                  border:'1.5px solid var(--accent)',background:'var(--bg)',color:'var(--text)'}}
              />
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                <span style={{fontSize:11,color:'var(--text3)'}}>Máy quét HID tự nhấn Enter</span>
                <span style={{fontSize:11,color:'var(--danger)',fontWeight:500}}>🛡 Tự động chặn mã trùng</span>
              </div>
            </div>
          ) : (
            <ManualForm preset={preset} mutation={mutation} />
          )}
        </div>

        {/* Bảng bên phải */}
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[
              {label:'Tổng nhận hôm nay', value:summary?.total||0, color:'var(--text)'},
              {label:'Nguyên vẹn', value:summary?.intact||0, color:'var(--success)'},
              {label:'Hỏng/Rách', value:summary?.damaged||0, color:'var(--danger)'},
            ].map(c=>(
              <div key={c.label} style={{background:'#f0ede6',borderRadius:'var(--radius)',padding:'12px 14px'}}>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:24,fontWeight:600,color:c.color}}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:500,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Nhận hôm nay</span>
              <button onClick={()=>refetch()} style={{fontSize:11,padding:'3px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'transparent',cursor:'pointer',color:'var(--text2)'}}>↻ Làm mới</button>
            </div>
            <div style={{maxHeight:440,overflowY:'auto'}}>
              <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                <thead style={{position:'sticky',top:0,background:'var(--surface)'}}>
                  <tr>{['Mã vận đơn','Shipper','Giờ nhận','Tình trạng'].map(h=>(
                    <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:500}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {logs.length===0 && <tr><td colSpan={4} style={{padding:24,textAlign:'center',color:'var(--text3)'}}>Chưa có kiện hàng nào hôm nay</td></tr>}
                  {logs.map(l=>(
                    <tr key={l.id}>
                      <td style={{padding:'8px 14px',fontFamily:'var(--mono)',fontSize:11}}>{l.tracking_code}</td>
                      <td style={{padding:'8px 14px',color:'var(--text2)',fontSize:11}}>{l.shipper}</td>
                      <td style={{padding:'8px 14px',color:'var(--text2)',fontSize:11}}>{l.received_at}</td>
                      <td style={{padding:'8px 14px'}}>
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,fontWeight:500,
                          background:l.condition==='intact'?'var(--success-bg)':l.condition==='torn_package'?'var(--warning-bg)':'var(--danger-bg)',
                          color:l.condition==='intact'?'var(--success)':l.condition==='torn_package'?'var(--warning)':'var(--danger)'}}>
                          {l.condition_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManualForm({ preset, mutation }) {
  const [form, setForm] = useState({ tracking_code:'', order_id:'', note:'' })
  const f = v => setForm(p=>({...p,...v}))
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>📝 Nhập thủ công</div>
      {[
        {label:'Mã vận đơn *', key:'tracking_code', ph:'VD: GHTK-8823411'},
        {label:'Mã đơn hoàn (nếu có)', key:'order_id', ph:'VD: TT-20240401-001'},
      ].map(({label,key,ph})=>(
        <div key={key} style={{marginBottom:10}}>
          <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>{label}</label>
          <input value={form[key]} onChange={e=>f({[key]:e.target.value})} placeholder={ph}
            style={{width:'100%',fontSize:13,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)'}}/>
        </div>
      ))}
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Ghi chú</label>
        <textarea value={form.note} onChange={e=>f({note:e.target.value})} rows={2}
          placeholder="Hàng bị ướt, thiếu phụ kiện..."
          style={{width:'100%',fontSize:13,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',resize:'vertical'}}/>
      </div>
      <button
        disabled={!form.tracking_code || mutation.isPending}
        onClick={()=>{ mutation.mutate({...form, condition:preset.condition, shipper:preset.shipper}); setForm({tracking_code:'',order_id:'',note:''}) }}
        style={{width:'100%',padding:'10px',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:500,
          background:form.tracking_code?'var(--accent)':'var(--border)',color:'#fff',
          cursor:form.tracking_code?'pointer':'not-allowed'}}>
        {mutation.isPending ? 'Đang lưu...' : '✓ Xác nhận nhận hàng'}
      </button>
    </div>
  )
}
