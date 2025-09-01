import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AuthGate from './components/AuthGate';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PhotoUploaderDev from './components/PhotoUploaderDev';

function Home() {
  return (
    <>
      <Header />
      <div className="p-4">
        <PhotoUploaderDev />
      </div>
    </>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<AuthGate><Header /><Profile /></AuthGate>} />
        <Route path="/" element={<AuthGate><Home /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}