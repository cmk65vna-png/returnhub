from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import returns, warehouse, reconcile, platforms, stats, orders
import uvicorn

app = FastAPI(title="ReturnHub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(returns.router, prefix="/api/returns", tags=["returns"])
app.include_router(warehouse.router, prefix="/api/warehouse", tags=["warehouse"])
app.include_router(reconcile.router, prefix="/api/reconcile", tags=["reconcile"])
app.include_router(platforms.router, prefix="/api/platforms", tags=["platforms"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
