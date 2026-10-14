import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import './i18n';
import App from './App';
import { UserProvider } from './context/UserContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const tree = (
  <BrowserRouter>
    <UserProvider>
      <App />
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
    </UserProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
    ) : (
      tree
    )}
  </React.StrictMode>
);
