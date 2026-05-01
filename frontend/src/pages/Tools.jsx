import React, { useState } from 'react'

const TOOLS = [
  {
    id: 'quet-ban-giao',
    label: 'Quét bàn giao đơn',
    icon: '📦',
    url: '/quet-ban-giao.html',
    desc: 'Quét mã vận đơn bàn giao cho shipper, chặn trùng, xuất PDF biên bản',
    color: '#1a56db',
    bg: '#eff4ff',
  },
  {
    id: 'quay-video',
    label: 'Quay video nhận hoàn',
    icon: '🎥',
    url: '/quay-video.html',
    desc: 'Quét mã → tự quay video bằng chứng nhận hàng hoàn, burn mã đơn + timestamp vào video',
    color: '#057a55',
    bg: '#f3faf7',
  },
]

export default function Tools() {
  const [active, setActive] = useState(null)

  if (active) {
    const tool = TOOLS.find(t => t.id === active)
    return (
      <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 40px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12,flexShrink:0}}>
          <button onClick={()=>setActive(null)} style={{padding:'6px 14px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--surface)',fontSize:12,cursor:'pointer',color:'var(--text)',display:'flex',alignItems:'center',gap:6}}>
            ← Quay lại
          </button>
          <span style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{tool.icon} {tool.label}</span>
          <a href={tool.url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',fontSize:12,color:'var(--accent-text)',textDecoration:'none',padding:'5px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
            ↗ Mở tab mới
          </a>
        </div>
        <iframe
          src={tool.url}
          style={{flex:1,width:'100%',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',background:'#000'}}
          allow="camera; microphone; autoplay"
          title={tool.label}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:600}}>Công cụ tích hợp</h1>
        <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Các tool hỗ trợ vận hành kho</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        {TOOLS.map(tool => (
          <div key={tool.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',cursor:'pointer',transition:'box-shadow 0.2s'}}
            onClick={()=>setActive(tool.id)}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            <div style={{background:tool.bg,padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
              <span style={{fontSize:36}}>{tool.icon}</span>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:tool.color}}>{tool.label}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{tool.desc}</div>
              </div>
            </div>
            <div style={{padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'var(--text2)'}}>Nhấn để mở trong ReturnHub</span>
              <span style={{fontSize:12,color:tool.color,fontWeight:500}}>Mở →</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Hướng dẫn sử dụng</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,fontSize:12,color:'var(--text2)'}}>
          <div>
            <div style={{fontWeight:500,color:'var(--text)',marginBottom:6}}>📦 Quét bàn giao đơn</div>
            <ol style={{paddingLeft:16,lineHeight:2.2}}>
              <li>Nhập tên nhân viên / shipper</li>
              <li>Dùng máy quét HID quét từng mã vận đơn</li>
              <li>App tự chặn trùng lặp</li>
              <li>Xuất PDF biên bản bàn giao</li>
            </ol>
          </div>
          <div>
            <div style={{fontWeight:500,color:'var(--text)',marginBottom:6}}>🎥 Quay video nhận hoàn</div>
            <ol style={{paddingLeft:16,lineHeight:2.2}}>
              <li>Cho phép trình duyệt dùng camera</li>
              <li>Quét mã vận đơn lần 1 → tự động quay</li>
              <li>Mở kiện hàng, kiểm tra trước camera</li>
              <li>Quét lần 2 → dừng và lưu video tự động</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
