from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, PlatformConfig, ReturnOrder
from datetime import datetime, timezone, timedelta
import httpx, hashlib, time, hmac, os

router = APIRouter()

@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    configs = db.query(PlatformConfig).all()
    return [_fmt(c) for c in configs]

@router.put("/{platform}/config")
def save_config(platform: str, body: dict, db: Session = Depends(get_db)):
    c = db.query(PlatformConfig).filter_by(platform=platform).first()
    if not c:
        c = PlatformConfig(platform=platform)
        db.add(c)
    c.partner_id = body.get("partner_id", c.partner_id)
    c.partner_key = body.get("partner_key", c.partner_key)
    c.shop_id = body.get("shop_id", c.shop_id)
    c.access_token = body.get("access_token", c.access_token)
    db.commit()
    return _fmt(c)

@router.post("/{platform}/sync")
def sync_platform(platform: str, db: Session = Depends(get_db)):
    c = db.query(PlatformConfig).filter_by(platform=platform).first()
    if not c or not c.partner_id:
        # Demo mode: simulate sync
        return _demo_sync(platform, db)
    if platform == "shopee":
        return _sync_shopee(c, db)
    elif platform == "tiktok":
        return _sync_tiktok(c, db)
    return {"error": "unknown platform"}

def _demo_sync(platform, db):
    """Simulate API sync in demo mode"""
    c = db.query(PlatformConfig).filter_by(platform=platform).first()
    if c:
        c.last_sync = datetime.now(timezone(timedelta(hours=7)))
        db.commit()
    return {
        "success": True,
        "mode": "demo",
        "message": f"Demo sync {platform}: Đã giả lập đồng bộ 10 đơn hoàn",
        "synced": 10,
        "new": 2,
        "updated": 8
    }

def _sync_shopee(config: PlatformConfig, db: Session):
    """
    Shopee Open API - Get Return Orders
    Docs: https://open.shopee.com/documents/v2/v2.returns.get_return_list
    """
    try:
        ts = int(time.time())
        path = "/api/v2/returns/get_return_list"
        base_str = f"{config.partner_id}{path}{ts}{config.access_token}{config.shop_id}"
        sign = hmac.new(config.partner_key.encode(), base_str.encode(), hashlib.sha256).hexdigest()
        url = f"https://partner.shopeemobile.com{path}"
        params = {
            "partner_id": int(config.partner_id),
            "shop_id": int(config.shop_id),
            "access_token": config.access_token,
            "timestamp": ts,
            "sign": sign,
            "page_size": 50,
            "page_no": 0
        }
        resp = httpx.get(url, params=params, timeout=10)
        data = resp.json()
        if data.get("error"):
            return {"success": False, "error": data["error"], "message": data.get("message","")}
        returns = data.get("response", {}).get("return", [])
        synced = _upsert_shopee_returns(returns, db)
        config.last_sync = datetime.now(timezone(timedelta(hours=7)))
        db.commit()
        return {"success": True, "synced": len(returns), "new": synced["new"], "updated": synced["updated"]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def _sync_tiktok(config: PlatformConfig, db: Session):
    """
    TikTok Shop API - Get Return Orders
    Docs: https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9
    """
    try:
        ts = str(int(time.time()))
        path = "/return/202309/returns/search"
        params_str = f"app_key{config.partner_id}shop_id{config.shop_id}timestamp{ts}"
        sign_str = path + params_str
        sign = hmac.new(config.partner_key.encode(), sign_str.encode(), hashlib.sha256).hexdigest()
        url = f"https://open-api.tiktokglobalshop.com{path}"
        headers = {"x-tts-access-token": config.access_token, "Content-Type": "application/json"}
        params = {"app_key": config.partner_id, "shop_id": config.shop_id, "timestamp": ts, "sign": sign}
        body = {"page_size": 50, "page_token": ""}
        resp = httpx.post(url, params=params, json=body, headers=headers, timeout=10)
        data = resp.json()
        if data.get("code") != 0:
            return {"success": False, "error": data.get("message", "API error")}
        returns = data.get("data", {}).get("return_order_list", [])
        synced = _upsert_tiktok_returns(returns, db)
        config.last_sync = datetime.now(timezone(timedelta(hours=7)))
        db.commit()
        return {"success": True, "synced": len(returns), "new": synced["new"], "updated": synced["updated"]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def _upsert_shopee_returns(returns, db):
    new_count = updated = 0
    for r in returns:
        oid = str(r.get("return_sn", ""))
        existing = db.query(ReturnOrder).filter_by(order_id=f"SP-{oid}").first()
        status_map = {1: "returning", 2: "completed", 3: "processing"}
        pstat = status_map.get(r.get("status", 1), "returning")
        if not existing:
            db.add(ReturnOrder(
                id=f"sp-{oid}", order_id=f"SP-{oid}", platform="shopee",
                product_name=r.get("item", [{}])[0].get("name", "Unknown") if r.get("item") else "Unknown",
                sku=r.get("item", [{}])[0].get("item_sku", "") if r.get("item") else "",
                quantity=1, value=float(r.get("refund_amount", 0)),
                platform_status=pstat, warehouse_status="not_received",
                reconcile_status="pending", shipper="", tracking_code=r.get("tracking_number","")
            ))
            new_count += 1
        else:
            existing.platform_status = pstat
            updated += 1
    return {"new": new_count, "updated": updated}

def _upsert_tiktok_returns(returns, db):
    new_count = updated = 0
    for r in returns:
        oid = str(r.get("return_order_id", ""))
        existing = db.query(ReturnOrder).filter_by(order_id=f"TT-{oid}").first()
        if not existing:
            db.add(ReturnOrder(
                id=f"tt-{oid}", order_id=f"TT-{oid}", platform="tiktok",
                product_name=r.get("sku_list", [{}])[0].get("product_name","Unknown") if r.get("sku_list") else "Unknown",
                sku=r.get("sku_list", [{}])[0].get("sku_id","") if r.get("sku_list") else "",
                quantity=1, value=float(r.get("refund_total",{}).get("amount",0)),
                platform_status=r.get("return_status","returning").lower(),
                warehouse_status="not_received", reconcile_status="pending",
                shipper="", tracking_code=r.get("tracking_number","")
            ))
            new_count += 1
        else:
            existing.platform_status = r.get("return_status","returning").lower()
            updated += 1
    return {"new": new_count, "updated": updated}

def _fmt(c: PlatformConfig):
    return {
        "platform": c.platform,
        "partner_id": c.partner_id,
        "shop_id": c.shop_id,
        "has_key": bool(c.partner_key),
        "has_token": bool(c.access_token),
        "is_connected": bool(c.partner_id and c.partner_key and c.access_token),
        "last_sync": c.last_sync.strftime("%d/%m/%Y %H:%M") if c.last_sync else None,
    }
