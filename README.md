# API Racine Académie

API backend en Netlify Functions + Netlify Blobs pour Racine Académie.

## Endpoints

- GET /api/courses — liste des cours
- POST /api/check-access — vérifie un code d'accès
- POST /api/verify-payment — vérifie un paiement USDT BEP20 et génère un code
- POST /api/admin/issue-code — génère un code manuellement (protégé)
