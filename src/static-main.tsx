import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { Route as rootRoute } from "./routes/__root";
import { getRouter } from "./router";
import "./styles.css";

// shellComponent renders <html>/<head>/<body> — correct for TanStack Start SSR,
// but nesting those tags inside <div id="root"> in CSR breaks React 19's event
// delegation (inputs freeze). SafeFragment is used when shellComponent is absent.
(rootRoute.options as Record<string, unknown>).shellComponent = undefined;

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<RouterProvider router={getRouter()} />);
