# Mapa de Domínio — Agendaqui API

```
Agendaqui API
│
├── App
│   └── Health Check (GET /)
│
├── Auth
│   ├── Login (POST /auth/login)
│   ├── Refresh Token (POST /auth/refresh-token)
│   ├── Logout (POST /auth/logout)
│   ├── Logout All (POST /auth/logout-all)
│   ├── Forgot Password (POST /auth/forgot-password)
│   ├── Reset Password (POST /auth/reset-password)
│   ├── Verify Email (POST /auth/verify-email)
│   ├── First Access Set Password (POST /auth/first-access/set-password)
│   ├── Create Temp Session (POST /auth/create-temp-session)
│   ├── Me (GET /auth/me)
│   └── Accept Invite (POST /auth/accept-invite)
│
├── Users
│   ├── Create (POST /users)
│   └── Get by ID (GET /users/{id})
│
├── Categories (admin)
│   ├── Create (POST /categories)
│   ├── List Tree (GET /categories)
│   └── Delete (DELETE /categories/{id})
│
├── Businesses
│   ├── Create (POST /businesses)
│   ├── Update (PUT /businesses/{id})
│   ├── Delete (DELETE /businesses/{id})
│   ├── Get by Slug (GET /businesses/{slug}) [público]
│   └── List Services by Slug (GET /businesses/{slug}/services) [público]
│
├── Locations
│   ├── Create (POST /businesses/{businessId}/locations)
│   ├── Update (PUT /locations/{id})
│   ├── Delete (DELETE /locations/{id})
│   ├── Create Holiday (POST /locations/{id}/holidays)
│   └── Delete Holiday (DELETE /holidays/{id})
│
├── Services
│   ├── Create (POST /businesses/{businessId}/services)
│   ├── Update (PUT /services/{id})
│   └── Delete (DELETE /services/{id})
│
├── Staff
│   ├── Add Employee (POST /locations/{locationId}/employees)
│   ├── Update Employee (PUT /employees/{employeeMembershipId})
│   ├── Remove Employee (DELETE /employees/{employeeMembershipId})
│   ├── Set Working Hours (PUT /employees/{employeeMembershipId}/working-hours)
│   ├── Request Time Off (POST /employees/{employeeMembershipId}/time-offs)
│   ├── Approve Time Off (PUT /time-offs/{id}/approve)
│   ├── Reject Time Off (PUT /time-offs/{id}/reject)
│   ├── Assign Professional (POST /services/{serviceId}/professionals)
│   ├── Unassign Professional (DELETE /services/{serviceId}/professionals)
│   └── Invite Employee (POST /businesses/{businessId}/invites)
│
├── Appointments
│   ├── Create (POST /businesses/{businessId}/appointments)
│   ├── List Business (GET /businesses/{businessId}/appointments)
│   ├── Confirm (PATCH /appointments/{id}/confirm)
│   ├── Cancel (PATCH /appointments/{id}/cancel)
│   ├── Complete (PATCH /appointments/{id}/complete)
│   ├── No Show (PATCH /appointments/{id}/no-show)
│   ├── Available Slots (GET /businesses/{businessId}/slots)
│   ├── My Appointments (GET /me/appointments)
│   ├── My Agenda (GET /me/agenda)
│   └── Get by ID (GET /appointments/{id})
│
├── Me (perfis)
│   ├── Customer Profile (GET /me/customer-profile)
│   └── Admin Profile (GET /me/admin-profile)
│
└── Platform Config (admin)
    ├── Get (GET /platform-config)
    └── Update (PUT /platform-config)
```
