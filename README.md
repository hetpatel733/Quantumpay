# QuantumPay

URL: https://quantumpayfinance.vercel.app/

QuantumPay is a comprehensive cryptocurrency payment gateway designed for businesses and individuals. It provides a full suite of tools to accept, manage, and track cryptocurrency payments, featuring a merchant dashboard, product portfolio management, secure API integration, and detailed transaction reporting.

## Key Features

-   **Multi-Currency Support**: Accept payments in a wide range of cryptocurrencies including BTC, ETH, SOL, MATIC, and stablecoins like USDT and USDC across multiple networks.
-   **Merchant Dashboard**: An analytical dashboard providing insights into payment trends, volume, recent activity, and cryptocurrency distribution.
-   **Portfolio Management**: Create and manage a portfolio of products or services with fixed USD prices.
-   **Payment Links**: Generate unique, shareable payment links for any item in your portfolio.
-   **API Management**: Securely create, manage, and monitor API keys for integrating QuantumPay with your applications.
-   **Payment Configuration**: Configure wallets for different cryptocurrencies to receive payments directly.
-   **Transaction Export**: Generate and download detailed transaction reports in various formats (CSV, JSON, PDF).
-   **Secure Authentication**: JWT-based authentication system for user and business accounts.

## Tech Stack

-   **Frontend**: React, Vite, Tailwind CSS, React Router, Recharts
-   **Backend**: Node.js, Express.js, MongoDB, Mongoose
-   **Authentication**: JSON Web Tokens (JWT), Cookie-based sessions
-   **Image Storage**: ImageKit for product image uploads and optimization
-   **Blockchain Integration**: Alchemy API for real-time payment verification
-   **Rate Conversion**: Binance API for live cryptocurrency exchange rates
-   **Background Jobs**: Node-cron for automatic payment status verification and expiration

## Demo Credentials

You can test the application using the following demo account:

-   **Email**: `test@gmail.com`
-   **Password**: `Test@123`

## Getting Started

### Prerequisites

-   Node.js (v20.x or later recommended)
-   npm or yarn
-   MongoDB (local instance or a cloud service like MongoDB Atlas)

### Backend Setup (Server)

1.  **Navigate to the server directory:**
    ```sh
    cd server
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Create a `.env` file** in the `server` directory and add the following environment variables:

    ```env
    PORT=8000
    # Your MongoDB connection string
    MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/yourdbname?retryWrites=true&w=majority
    # A strong secret key for signing JWTs
    JWT_SECRET=your_super_secret_key
    # Alchemy API Key for blockchain data
    ALCHEMY_API_KEY=your_alchemy_api_key
    # ImageKit credentials for file uploads
    IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
    IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
    IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
    ```

4.  **Start the backend server:**
    ```sh
    npm run dev
    ```
    The server will be running on `http://localhost:8000`.

### Frontend Setup (Client)

1.  **Navigate to the client directory:**
    ```sh
    cd client
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Create a `.env` file** in the `client` directory and add the following:

    ```env
    # URL of your running backend server
    VITE_SERVER_URL=http://localhost:8000
    # URL of the client application (for generating payment links)
    VITE_CLIENT_URL=http://localhost:9000
    ```

4.  **Start the frontend development server:**
    ```sh
    npm start
    ```
    The application will be available at `http://localhost:9000`.

## Functionality Overview

### Dashboard
The main dashboard provides an at-a-glance view of your payment performance, including:
-   Pending, completed, and failed transaction counts.
-   Total payment volume over selected periods (7, 30, 90 days).
-   A bar chart visualizing payment trends.
-   A pie chart showing the distribution of cryptocurrencies received.
-   A feed of recent transaction activity.

### Payments Management
This section allows for detailed monitoring of all transactions. You can:
-   View a paginated list of all payments.
-   Filter transactions by status, cryptocurrency, network, and search term.
-   Sort transactions by date, amount, or other criteria.
-   Click on any transaction to view its detailed information in a modal.

### Portfolio Management
Manage the products or services you offer for sale.
-   Create new products with a name, description, price in USD, and an image.
-   Edit existing products.
-   Activate or deactivate products.
-   The system automatically generates a unique `productId` for each item.

### Transaction Export
Generate custom reports of your transaction history.
-   **Configure**: Select date ranges, filter by status or cryptocurrency, choose columns to include, and select the file format (CSV, JSON, PDF).
-   **Preview**: See a live preview of the data that will be included in your export based on your configuration.
-   **History**: View a history of all generated exports, check their status (pending, completed, failed), and download completed files.

### Account Settings
Manage your user and business profile from a unified settings page.
-   **Profile Information**: Update your business name, contact details, and profile photo.
-   **Security Settings**: Change your account password.
-   **Payment Configuration**: Set up your personal cryptocurrency wallet addresses where you will receive payments.
-   **API Management**: Create, view, and manage API keys required for generating payment links and integrating with external applications.

## Project Structure
The repository is a monorepo containing two main packages: `client` and `server`.

```
/
├── client/        # React frontend application (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/          # Frontend API service functions
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (Auth, Theme, Toast)
│   │   ├── landingpages/ # Public-facing pages (Home, Login, etc.)
│   │   └── pages/        # Authenticated dashboard pages
│   └── ...
└── server/        # Node.js backend server (Express + Mongoose)
    ├── src/
    │   ├── db/           # Database connection logic
    │   ├── jobs/         # Cron jobs for payment verification/expiration
    │   ├── models/       # Mongoose schemas for database models
    │   ├── routes/       # API endpoint definitions
    │   ├── services/     # Business logic for routes
    │   └── utils/        # Utility helpers (blockchain, currency conversion)
    └── ...
