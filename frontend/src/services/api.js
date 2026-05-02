import axios from 'axios'

// Khi chạy local: proxy qua vite -> backend:8000
// Khi chạy Railway: dùng VITE_API_URL = URL của backend service
const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: BASE + '/api' })

export const getStats = () => api.get('/stats/dashboard').then(r => r.data)
export const getReturns = (params) => api.get('/returns/', { params }).then(r => r.data)
export const updateWarehouse = (orderId, body) => api.put(`/returns/${orderId}/warehouse`, body).then(r => r.data)
export const manualReconcile = (orderId, body) => api.put(`/returns/${orderId}/reconcile`, body).then(r => r.data)
export const getWarehouseLogs = () => api.get('/warehouse/logs').then(r => r.data)
export const getTodaySummary = () => api.get('/warehouse/today-summary').then(r => r.data)
export const getWarehouseReport = () => api.get('/warehouse/report').then(r => r.data)
export const receiveItem = (body) => api.post('/warehouse/receive', body).then(r => r.data)
export const getReconcileSummary = () => api.get('/reconcile/summary').then(r => r.data)
export const getMismatches = () => api.get('/reconcile/mismatches').then(r => r.data)
export const runReconcile = () => api.post('/reconcile/run').then(r => r.data)
export const getPlatformConfig = () => api.get('/platforms/config').then(r => r.data)
export const savePlatformConfig = (platform, body) => api.put(`/platforms/${platform}/config`, body).then(r => r.data)
export const syncPlatform = (platform) => api.post(`/platforms/${platform}/sync`).then(r => r.data)
export const getOrders = (params) => api.get('/orders/', { params }).then(r => r.data)
export const getOrderStats = (params) => api.get('/orders/stats', { params }).then(r => r.data)
export const getRevenueChart = (params) => api.get('/orders/revenue', { params }).then(r => r.data)
export const getInventory = () => api.get('/orders/inventory').then(r => r.data)
export const getInventoryStats = () => api.get('/orders/inventory/stats').then(r => r.data)
export const getShops = () => api.get('/shops/').then(r => r.data)
export const createShop = (body) => api.post('/shops/', body).then(r => r.data)
export const updateShop = (id, body) => api.put(`/shops/${id}`, body).then(r => r.data)
export const deleteShop = (id) => api.delete(`/shops/${id}`).then(r => r.data)
export const syncShop = (id) => api.post(`/shops/${id}/sync`).then(r => r.data)
export const getAllShopStats = () => api.get('/shops/stats/all').then(r => r.data)
