import React from "react";
import Routes from "./Routes";
import ErrorBoundary from "components/ErrorBoundary";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react"
import "./styles/tailwind.css";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <div className="App">
            <Routes />
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
