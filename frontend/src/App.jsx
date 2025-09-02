import { Routes, Route, Link } from "react-router-dom";
import FindPropertyPage from "./pages/FindPropertyPage";
import ListPropertyPage from "./pages/ListPropertyPage";
import DisplayPropertiesPage from "./pages/DisplayPropertiesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      
  
      <div className="bg-purple-900 p-4 text-white flex justify-between sticky top-0 right-0 left-0">
        
        <div className="text-xl font-bold"> PROPENGINE </div>
        <div className="flex gap-4">
          <Link to="/displayProperties" className="hover:underline">View Properties</Link>
          <Link to="/findProperty" className="hover:underline">Find Property</Link>
          <Link to="/listProperty" className="hover:underline">List Property</Link>
          

       </div>
        
      </div>
      <div className="flex flex-col w-1/2 mx-auto">
      <Routes>
        <Route path="/findProperty" element={<FindPropertyPage />} />
        <Route path="/listProperty" element={<ListPropertyPage />} />
        <Route path="/displayProperties" element={<DisplayPropertiesPage />} />
      </Routes>
      </div>
    </div>
  
  );
}