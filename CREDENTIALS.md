# 🔐 Finding Moto - Sample Account Credentials

## ✅ Database Seeding Complete

The project has been successfully seeded with sample data including:
- **1 Admin Account**
- **5 Seller Accounts** (Pre-approved)
- **5 Mechanic Accounts** (Pre-approved)
- **5 Delivery Agent Accounts** (Pre-approved & Enabled)
- **100 Buyer Accounts**

---

## 📋 Account Credentials

### 🔐 ADMIN ACCOUNT
```
Email:    admin@findingmoto.com
Password: Admin@123
Role:     Admin
Status:   Active & Verified
```

### 🛍️ SELLER ACCOUNTS (5 accounts)
All sellers are pre-approved and ready to use.

| # | Email | Password | Status |
|---|-------|----------|--------|
| 1 | seller1@samplemail.com | Seller@123 | ✅ Approved |
| 2 | seller2@samplemail.com | Seller@123 | ✅ Approved |
| 3 | seller3@samplemail.com | Seller@123 | ✅ Approved |
| 4 | seller4@samplemail.com | Seller@123 | ✅ Approved |
| 5 | seller5@samplemail.com | Seller@123 | ✅ Approved |

### 🔧 MECHANIC ACCOUNTS (5 accounts)
All mechanics are pre-approved and ready to use.

| # | Email | Password | Status |
|---|-------|----------|--------|
| 1 | mechanic1@samplemail.com | Mechanic@123 | ✅ Approved |
| 2 | mechanic2@samplemail.com | Mechanic@123 | ✅ Approved |
| 3 | mechanic3@samplemail.com | Mechanic@123 | ✅ Approved |
| 4 | mechanic4@samplemail.com | Mechanic@123 | ✅ Approved |
| 5 | mechanic5@samplemail.com | Mechanic@123 | ✅ Approved |

### 🚚 DELIVERY AGENT ACCOUNTS (5 accounts)
All delivery agents are pre-approved, enabled, and ready to accept deliveries.

| # | Email | Password | Vehicle | Status |
|---|-------|----------|---------|--------|
| 1 | deliveryagent1@samplemail.com | DeliveryAgent@123 | Motorcycle | ✅ Approved & Enabled |
| 2 | deliveryagent2@samplemail.com | DeliveryAgent@123 | Bicycle | ✅ Approved & Enabled |
| 3 | deliveryagent3@samplemail.com | DeliveryAgent@123 | Scooter | ✅ Approved & Enabled |
| 4 | deliveryagent4@samplemail.com | DeliveryAgent@123 | Car | ✅ Approved & Enabled |
| 5 | deliveryagent5@samplemail.com | DeliveryAgent@123 | Van | ✅ Approved & Enabled |

### 👤 BUYER ACCOUNTS (100 accounts)
All buyer accounts are created and verified.

**Pattern:** `buyer{number}@samplemail.com`

| # | Email | Password | Examples |
|---|-------|----------|----------|
| 1-100 | buyer1@samplemail.com ... buyer100@samplemail.com | Buyer@123 | ✅ Verified |

---

## ✨ Key Features of Sample Data

✅ **Email Verification Skipped**
- All accounts are pre-verified (`isEmailVerified: true`)
- No email confirmation required for login

✅ **No SMTP Required**
- Sample emails use dummy domain (@samplemail.com)
- Sellers and Mechanics use pre-approved status
- No confirmation emails are sent

✅ **Ready for Testing**
- Admin can access all administrative functions
- Sellers can immediately list products
- Mechanics can immediately offer services
- Delivery agents can immediately accept deliveries
- Buyers can immediately browse and purchase

✅ **Database**
- All data is stored in MongoDB (configured in `.env`)
- Data persists across application restarts
- Safe to run seed script multiple times (no duplicates created)

---

## 🚀 How to Use These Accounts

### 1. **Start the Backend**
```bash
cd backend
npm run dev
```

### 2. **Login via API**
```bash
POST http://localhost:5000/api/auth/login
{
  "email": "admin@findingmoto.com",
  "password": "Admin@123",
  "role": "admin"
}
```

### 3. **Start the Frontend**
```bash
cd frontend
npm run dev
```
Then visit `http://localhost:3000` and login with any of the sample credentials.

---

## 📊 Sample Data Details

### Seller Data
- **Pre-approved status**: All sellers are set to `approvalStatus: 'approved'`
- **Shop information**: Each seller has shop name, description, and location
- **Brands**: Pre-configured with popular motorcycle brands (Honda, Yamaha, Suzuki, Kawasaki)

### Mechanic Data
- **Pre-approved status**: All mechanics are set to `approvalStatus: 'approved'`
- **Specializations**: Random specializations like Engine Repair, Electrical Systems, etc.
- **Experience**: Randomly assigned 3-18 years of experience
- **Workshop information**: Each mechanic has workshop name and location

### Buyer Data
- **Email verified**: All buyers have `isEmailVerified: true`
- **Active status**: All buyers are active (`isActive: true`)
- **Random details**: Names and phone numbers are randomly generated

### Delivery Agent Data
- **Pre-approved status**: All delivery agents are set to `approvalStatus: 'approved'`
- **Enabled status**: All delivery agents are set to `agent_status: 'ENABLED'`
- **Work status**: All delivery agents start as `work_status: 'AVAILABLE'`
- **Vehicle details**: Motorcycle, Bicycle, Scooter, Car, and Van sample vehicles are configured

---

## 🔄 Re-running the Seed Script

To re-run the seed script and refresh sample data:

```bash
cd backend
npm run seed:all
npm run seed:delivery-agents
```

**Note**: The script checks for existing accounts and won't create duplicates. If you want to clear and start fresh, you can modify the script to uncomment the delete line:

```typescript
// Uncomment this line in seedAllData.ts to clear existing sample data:
await User.deleteMany({ email: /samplemail\.com|findingmoto\.com/ });
```

---

## 📝 Important Notes

⚠️ **For Development/Testing Only**
- These sample accounts use simple passwords
- Do NOT use in production
- Change all credentials before deploying

⚠️ **Email Verification Bypassed**
- Sample accounts skip email verification flow
- Production accounts will still require email confirmation
- SMTP configuration is still in `.env` for production use

⚠️ **No Email Sending**
- Seed script creates verified accounts directly in database
- No OTP emails or confirmation emails are sent
- Safe to use with incomplete SMTP configuration

---

## 🆘 Troubleshooting

**"Database connection failed"**
- Check `.env` file has valid `MONGO_URI`
- Ensure MongoDB is running
- Verify MongoDB credentials

**"Duplicate key error"**
- Run seed script again (it handles duplicates automatically)
- Or manually delete and re-run

**"Email validation failed during login"**
- All sample accounts use dummy @samplemail.com domain
- This is expected and bypassed for sample accounts
- Login will work normally with provided credentials

---

## 📞 Support

For issues or questions about the setup, check:
1. `.env` configuration
2. MongoDB connection status
3. Backend server logs (`npm run dev`)
4. API response messages

Happy testing! 🎉
