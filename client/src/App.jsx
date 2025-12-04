import React from "react";
import Routes from "./Routes";
import ErrorBoundary from "components/ErrorBoundary";
import { ThemeProvider } from "contexts/ThemeContext";
import "./styles/tailwind.css";

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="App">
          <Routes />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
