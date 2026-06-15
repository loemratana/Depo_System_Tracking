BaseUrl = api/v1/
## Products
router.post('/products', productCtrl.create);
router.get('/products', productCtrl.findAll);
router.get('/products/:id', productCtrl.findById);
router.put('/products/:id', productCtrl.update);
router.delete('/products/:id', productCtrl.delete);



## KPIs
router.post('/kpi/targets', kpiCtrl.setTarget);
router.get('/kpi/targets', kpiCtrl.getTargets);
router.delete('/kpi/targets/:id', kpiCtrl.deleteTarget);
router.post('/kpi/performances', kpiCtrl.logPerformance);
router.get('/kpi/performances', kpiCtrl.getPerformances);
router.delete('/kpi/performances/:id', kpiCtrl.deletePerformance);
router.get('/kpi/employees/:id/achievement', kpiCtrl.getEmployeeAchievement);


🚀 FINAL CLEAN API STRUCTURE
📦 PRODUCTS
POST   /api/products
GET    /api/products
GET    /api/products/{id}
PATCH  /api/products/{id}/stock
PATCH  /api/products/{id}/price
PATCH  /api/products/{id}/min-stock
GET    /api/products/low-stock
GET    /api/products/{id}/performance

🎯 KPI TARGET
POST   /api/kpi-targets
GET    /api/kpi-targets
GET    /api/kpi-targets/employee/{id}
PUT    /api/kpi-targets/{id}
DELETE /api/kpi-targets/{id}


📊 KPI RESULT
POST /api/kpi-results/generate
GET  /api/kpi-results
GET  /api/kpi-results/employee/{id}
GET  /api/kpi-results/depot/{id}
GET  /api/kpi-results/ranking
GET  /api/kpi-results/summary



# Get all products (with pagination)
curl "http://localhost:3000/api/products?page=1&limit=10"

# Filter by depot
curl "http://localhost:3000/api/products?depotId=1"

# Filter by brand
curl "http://localhost:3000/api/products?brandId=1"

# Get low stock only
curl "http://localhost:3000/api/products?minStockAlert=true"

# Search by name
curl "http://localhost:3000/api/products?search=coca"

# Combined filters
curl "http://localhost:3000/api/products?depotId=1&minStockAlert=true&page=1&limit=5"