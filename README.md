# Restaurant Bill Extractor & Customer Loyalty CRM - Backend

Production-ready Node.js & Express REST API for bill extraction, customer tracking, and marketing campaign automation.

## 🚀 Features

- **Google Gemini Vision OCR**: Extracts customer name, phone number, bill items, subtotals, taxes, and grand total from receipt images.
- **Cloudinary Integration**: Stores receipt images securely in Cloudinary CDN with automatic thumbnail generation.
- **MongoDB Atlas Database**: Multi-tenant customer profiles, bill history, loyalty points, and client configuration.
- **JWT Authentication**: Role-based access control (Superadmin and Restaurant Staff).
- **CORS Configured**: Ready to connect with any frontend deployment (Vercel, Netlify, Render).

## 🛠️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/restaurant_bills?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key

# Google Gemini Vision
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Messaging (Optional)
WHATSAPP_API_URL=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🔗 Endpoints

- `GET /` - Root status check
- `GET /api/health` - API health and system status
- `POST /api/auth/login` - Admin/Staff authentication
- `POST /api/bills/extract` - Upload and analyze receipt photo
- `POST /api/bills/confirm` - Save validated bill & update customer points
- `GET /api/customers` - Customer list with RFM metrics
- `GET /api/customers/analytics/overview` - Revenue & visit analytics
- `POST /api/marketing/send-offer` - Send targeted SMS/WhatsApp offers
- `GET /api/admin/clients` - Client and branch management
