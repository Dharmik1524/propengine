import { Routes, Route, Link } from "react-router-dom";
import FindPropertyPage from "./pages/FindPropertyPage";
import ListPropertyPage from "./pages/ListPropertyPage";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      
      
      <div>
      <nav className="bg-blue-600 p-4 text-white flex gap-4 fixed top-0 right-0 left-0">
        <Link to="/findProperty" className="hover:underline">Find Property</Link>
        <Link to="/listProperty" className="hover:underline">List Property</Link>
      </nav>
      </div>
           


      <div>
      <Routes>
        <Route path="/findProperty" element={<FindPropertyPage />} />
        <Route path="/listProperty" element={<ListPropertyPage />} />
      </Routes>
      </div>
    </div>
  
  );
}