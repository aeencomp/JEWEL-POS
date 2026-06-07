import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/push-notifications";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  void registerServiceWorker();
}
