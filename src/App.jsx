import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import Demo from "@/pages/Demo";
import Demo2 from "@/pages/Demo2";
import Demo3 from "@/pages/Demo3";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo2" element={<Demo2 />} />
        <Route path="/demo3" element={<Demo3 />} />
      </Routes>
    </BrowserRouter>
  );
}
