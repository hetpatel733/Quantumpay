import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// IMPORTANT: CSS Import Order
// 1. Tailwind base styles first (includes reset)
import "./styles/tailwind.css";

// 2. Bootstrap CSS removed to avoid class conflicts with Tailwind (icons still loaded via CDN in index.html)
// import 'bootstrap/dist/css/bootstrap.min.css';

// 3. Custom base styles and utilities (non-conflicting)
import "./styles/index.css";

// 4. Component-specific styles (these should be minimal now)
import "./styles/landingpage/navbar.css";
import "./styles/landingpage/footer.css";
// Removed legacy landing page CSS that duplicated Tailwind or caused conflicts
// import "./styles/landingpage/home.css";
// import "./styles/landingpage/home_hover.css";
// import "./styles/landingpage/home-responsive.css";
// import "./styles/landingpage/login.css";
// import "./styles/landingpage/signup.css";
// import "./styles/landingpage/contact.css";

// 5. Payment page styles last
import "./styles/payment/coinselect.css";
import "./styles/payment/finalpayment.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<App />);