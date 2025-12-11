import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";
import BillingPage from "./pages/BillingPage";
import "./i18n";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <BrowserRouter>
    <ToastContainer position="top-right" autoClose={3000} aria-label="Toast" />
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/billing/:id" element={<BillingPage />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
