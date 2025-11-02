import { useState } from 'react';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [error, setError] = useState(null);

  return (
    <div className="app-container">
      <Chat />
      {error && (
        <div className="error">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
