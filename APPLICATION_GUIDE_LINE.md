# 🚀 Depot Management System – API Endpoints

## Base URL
/api/v1

---

# 🔐 1. Authentication APIs

POST   /auth/login  
POST   /auth/logout  
POST   /auth/refresh-token  
POST   /auth/register (admin only)  
GET    /auth/me  

---

# 🏢 2. Province APIs

GET    /provinces  
GET    /provinces/:id  
POST   /provinces  
PUT    /provinces/:id  
DELETE /provinces/:id  

---

# 📍 3. District APIs

GET    /districts  
GET    /districts/:id  
GET    /districts?provinceId=1  
POST   /districts  
PUT    /districts/:id  
DELETE /districts/:id  

---

# 🏬 4. Depot APIs

## CRUD

GET    /depots  
GET    /depots/:id  
POST   /depots  
PUT    /depots/:id  
DELETE /depots/:id  

---

## Advanced Filtering

GET    /depots/search?q=  
GET    /depots/filter  
GET    /depots/by-location?provinceId=&districtId=  
GET    /depots/by-owner?employeeId=  
GET    /depots/by-brand?brandId=  

---

## KPI / Dashboard

GET    /depots/kpi/summary  
GET    /depots/kpi/by-district  
GET    /depots/kpi/by-status  
GET    /depots/kpi/expiring-soon  

---

## Detail & Export

GET    /depots/:id/detail  
GET    /depots/:id/report  
GET    /depots/:id/export/pdf  
GET    /depots/:id/export/png  

---

# 👷 5. Employee APIs

GET    /employees  
GET    /employees/:id  
POST   /employees  
PUT    /employees/:id  
DELETE /employees/:id  

---

## Assignments

GET    /employees/:id/assignments  
POST   /employees/:id/assign  
PUT    /assignments/:id  
DELETE /assignments/:id  

---

# 🏷 6. Brand APIs

GET    /brands  
GET    /brands/:id  
POST   /brands  
PUT    /brands/:id  
DELETE /brands/:id  
## for detail page 
GET /brands/:id
GET /brands/:id/products
GET /brands/:id/depots

# Create brand
curl -X POST http://localhost:8080/api/v1/brands \
-H "Content-Type: application/json" \
-d '{"name":"Coca-Cola","code":"CC","description":"Soft drink","status":"active"}'

# Get all
curl http://localhost:8080/api/v1/brands?search=Cola

# Update
curl -X PATCH http://localhost:8080/api/v1/brands/1 \
-H "Content-Type: application/json" \
-d '{"description":"Updated"}'

# Delete
curl -X DELETE http://localhost:8080/api/v1/brands/1
---

## Depot ↔ Brand

GET    /depots/:id/brands  
POST   /depots/:id/brands  
DELETE /depots/:id/brands/:brandId  

---

# 📦 7. Product APIs

GET    /products  
GET    /products/:id  
POST   /products  
PUT    /products/:id  
DELETE /products/:id  

---

## Inventory

GET    /inventory  
GET    /inventory/by-depot/:depotId  
POST   /inventory/adjust  
POST   /inventory/transfer  
GET    /inventory/low-stock  

---

# 📊 8. Report APIs

GET    /reports  
GET    /reports/:id  
POST   /reports/generate  
GET    /reports/download/:id  
DELETE /reports/:id  

---

## Report Types

GET /reports/type/depot  
GET /reports/type/inventory  
GET /reports/type/employee  
GET /reports/type/assignment  

---

# 📈 9. Dashboard APIs

GET /dashboard/summary  
GET /dashboard/kpi  
GET /dashboard/charts/depots-by-district  
GET /dashboard/charts/products-by-brand  
GET /dashboard/charts/monthly-growth  

---

# 👤 10. User APIs

GET    /users  
GET    /users/:id  
POST   /users  
PUT    /users/:id  
DELETE /users/:id  

---

# 🔐 11. Roles & Permissions

GET    /roles  
POST   /roles  
PUT    /roles/:id  
DELETE /roles/:id  

GET    /permissions  
POST   /permissions  

---

# 📂 12. File & Export APIs

POST   /files/upload  
GET    /files/:id  
DELETE /files/:id  

---

## Export

GET /export/depots/png  
GET /export/depots/pdf  
GET /export/depots/excel  
GET /export/depot/:id/png  
GET /export/depot/:id/pdf  

---

# 📍 13. Assignment APIs

GET    /assignments  
GET    /assignments/:id  
POST   /assignments  
PUT    /assignments/:id  
DELETE /assignments/:id  

---

# 🔄 14. System APIs

GET /health  
GET /version  
GET /logs  

---

# 🚀 Best Practice Rules

## 1. Pagination
GET /depots?page=1&limit=20

## 2. Filtering
GET /depots?status=active&districtId=2&brandId=1

## 3. Sorting
GET /depots?sort=createdAt&order=desc

## 4. Search
GET /depots?search=main

---

# 🧠 Architecture Recommendation

Modules:
- auth
- depot
- employee
- product
- brand
- inventory
- report
- dashboard
- user
- assignment

---

# config upstash and arject 

# 📊 System Outcome

This API design supports:

✅ ERP system  
✅ Manager dashboard  
✅ Reporting system  
✅ Export system (PNG/PDF/Excel)  
✅ Scalable architecture  