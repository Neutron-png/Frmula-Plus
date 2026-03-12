# FRMULA+ Dashboard API

Node + Express API used by the app Feed screen and the dashboard.

## Run locally
npm install
npm run dev

## ENV
- `PORT=4000`
- `ADMIN_KEY=frmula-admin-key`
- `EXPO_PUSH_TOKENS=ExpoPushToken[...],ExpoPushToken[...]` optional

## Main endpoints
- `GET /api/feed`
- `GET /api/sections`
- `GET /api/media`
- `GET /api/admin/bootstrap`
- `POST /api/admin/feed`
- `PUT /api/admin/feed/:id`
- `DELETE /api/admin/feed/:id`
- `PUT /api/admin/sections`
- `POST /api/admin/media`
- `POST /api/admin/push`
