import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster, TooltipProvider } from "@repo/ui";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={200}>
      <App />
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>,
);
