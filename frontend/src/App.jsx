import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
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

export default App;
