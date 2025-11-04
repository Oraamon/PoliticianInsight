import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import AdminLogin from './components/AdminLogin';
import NPSAdmin from './components/NPSAdmin';
import './App.css';

function ChatPage() {
  const [error, setError] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);

  // Carrega chat selecionado
  useEffect(() => {
    if (currentChatId) {
      try {
        const savedMessages = localStorage.getItem(`chat_${currentChatId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Dispara evento para o Chat carregar as mensagens
          window.dispatchEvent(new CustomEvent('loadChat', { 
            detail: { chatId: currentChatId, messages: Array.isArray(parsedMessages) ? parsedMessages : [] } 
          }));
        } else {
          // Se não há mensagens salvas, limpa as mensagens
          window.dispatchEvent(new CustomEvent('loadChat', { 
            detail: { chatId: currentChatId, messages: [] } 
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar chat:', error);
        // Em caso de erro, limpa as mensagens
        window.dispatchEvent(new CustomEvent('loadChat', { 
          detail: { chatId: currentChatId, messages: [] } 
        }));
      }
    } else {
      // Limpa as mensagens para novo chat
      window.dispatchEvent(new CustomEvent('loadChat', { 
        detail: { chatId: null, messages: [] } 
      }));
    }
  }, [currentChatId]);

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="app-container">
      <Sidebar onSelectChat={handleChatSelect} currentChatId={currentChatId} />
      <Chat currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
      {error && (
        <div className="error">
          {error}
        </div>
      )}
    </div>
  );
}

// Protected Route para admin
function ProtectedAdminRoute({ children }) {
  const isAuthenticated = sessionStorage.getItem('nps_admin_authenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin/nps" 
          element={
            <ProtectedAdminRoute>
              <NPSAdmin />
            </ProtectedAdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
