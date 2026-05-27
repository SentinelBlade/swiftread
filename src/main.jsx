import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SpeedReader from "./SpeedReader.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpeedReader />
  </StrictMode>
);
