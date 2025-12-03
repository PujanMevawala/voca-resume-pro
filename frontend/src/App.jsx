import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastProvider from './components/Toaster';
import Home from './pages/Home';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Summary from './pages/Summary';
import Ask from './pages/Ask';
import Audio from './pages/Audio';
import Analysis from './pages/Analysis';
import Chat from './pages/Chat';
import Documents from './pages/Documents';

function RequireAuth({ token, children }) {
  const location = useLocation();
  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [resumeId, setResumeId] = useState('');

  const LogoutHandler = () => {
    const navigate = useNavigate();
    React.useEffect(() => {
      localStorage.removeItem('token');
      setToken('');
      navigate('/login', { replace: true });
    }, []);
    return null;
  };

  const logout = (navigate) => {
    localStorage.removeItem('token');
    setToken('');
    navigate('/login', { replace: true });
  };

  const ConditionalNavbar = () => {
    const location = useLocation();
    const hideNavbarRoutes = ['/login'];
    const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);
    
    if (shouldHideNavbar) return null;
    return <Navbar token={token} onLogout={() => {}} />;
  };

  const AppContent = () => {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    
    return (
      <>
        <ConditionalNavbar />
        <main className={isLoginPage ? '' : 'pb-16'}>
        <Routes>
          <Route path="/" element={<Home token={token} />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/documents" element={<RequireAuth token={token}><Documents /></RequireAuth>} />
          <Route path="/analysis" element={<RequireAuth token={token}><Analysis token={token} /></RequireAuth>} />
          <Route path="/chat" element={<RequireAuth token={token}><Chat /></RequireAuth>} />
          <Route path="/audio" element={<RequireAuth token={token}><Audio token={token} /></RequireAuth>} />
          <Route path="/summary" element={<RequireAuth token={token}><Summary token={token} resumeId={resumeId} /></RequireAuth>} />
          <Route path="/ask" element={<RequireAuth token={token}><Ask token={token} resumeId={resumeId} /></RequireAuth>} />
          <Route path="/logout" element={<LogoutHandler />} />
        </Routes>
        </main>
      </>
    );
  };

  return (
    <BrowserRouter>
      <ToastProvider />
      <AppContent />
    </BrowserRouter>
  );
}
