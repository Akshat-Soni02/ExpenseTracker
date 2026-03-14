# ExpenZ - Smart Expense Tracker

ExpenZ is a robust and feature-rich expense tracking system designed to help users manage their personal finances, track group expenses, and automate financial management.

## 🚀 Features

- **User Authentication**: Secure signup and login using JWT and Bcrypt.
- **Personal Expense Tracking**: Log and categorize your daily spending.
- **Group Expenses & Splitting**: Create groups, add shared expenses, and track settlements among friends.
- **Budget Management**: Set monthly budgets and track your progress.
- **Smart Transaction Detection**: Automated detection of transactions for easier logging.
- **Wallet Management**: Track multiple wallets or bank accounts.
- **Push Notifications**: Real-time alerts for expenses and settlements via Firebase.
- **Image Uploads**: Attach receipts to your expenses using Cloudinary.
- **Background Tasks**: Efficient handling of notifications and scheduled jobs using BullMQ and Redis.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Queue Management**: BullMQ & Redis
- **Authentication**: JSON Web Token (JWT)
- **Validation**: Zod
- **File Storage**: Cloudinary
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Documentation**: JSDoc

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

## ⚙️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Akshat-Soni02/ExpenseTracker.git
   cd ExpenseTracker
   ```

2. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `development.env` file in the `server` directory and populate it with your credentials (refer to `development.env` for the required keys).

4. **Run the application**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run prod
   ```

## 📂 Project Structure

```text
server/
├── config/         # Configuration files (Database, Cloudinary, etc.)
├── controller/     # Request handlers
├── models/         # Mongoose schemas
├── routes/         # API route definitions
├── services/       # Business logic layer
├── middlewares/    # Custom Express middlewares
├── queues/         # BullMQ queue definitions and workers
├── utils/          # Helper functions
└── validators/     # Zod validation schemas
```

## 🛣️ API Endpoints Summary

- `POST /api/v1/users/register` - User registration
- `POST /api/v1/users/login` - User login
- `GET /api/v1/expenses` - Fetch all expenses
- `POST /api/v1/groups` - Create a new expense group
- `PUT /api/v1/budgets` - Set or update budget limits

(For a full list of endpoints, please refer to the `routes/` directory.)

## 👥 Authors

- **Akshat Soni**
- **Atharva Lonhari**

## 📄 License

This project is licensed under the ISC License.
