import { HashRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import Demo from "@/pages/Demo";
import Demo2 from "@/pages/Demo2";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo2" element={<Demo2 />} />
      </Routes>
    </HashRouter>
  );
}
