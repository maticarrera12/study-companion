import { createHashRouter } from "react-router-dom"
import App from "./App"
import Home from "./views/Home"
import FlashcardReview from "./views/FlashcardReview"
import FlashcardLibrary from "./views/FlashcardLibrary"
import FlashcardEdit from "./views/FlashcardEdit"
import CornellNotes from "./views/CornellNotes"
import Timer from "./views/Timer"

// IMPORTANT: createHashRouter is required for Tauri production.
// createBrowserRouter will break when served from tauri://localhost.
// Do not change this without updating routing across the entire app.

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "review", element: <FlashcardReview /> },
      { path: "library", element: <FlashcardLibrary /> },
      { path: "library/:id", element: <FlashcardEdit /> },
      { path: "new-card", element: <FlashcardEdit /> },
      { path: "cornell", element: <CornellNotes /> },
      { path: "timer", element: <Timer /> },
    ],
  },
])
