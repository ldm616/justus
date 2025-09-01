import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PhotoGrid from './components/PhotoGrid';
import Header from './components/Header';

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<AuthGate><Header /><Profile /></AuthGate>} />
        <Route path="/" element={<AuthGate><PhotoGrid /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}