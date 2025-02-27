import './hmr-disable';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const render = () => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

render();

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}