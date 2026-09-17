import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
