import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const ADMIN_PASSWORD = 'agoraai-admin-2024';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simula um pequeno delay para melhor UX
    setTimeout(() => {
      if (password.trim() === ADMIN_PASSWORD) {
        // Salva autenticação no sessionStorage
        sessionStorage.setItem('nps_admin_authenticated', 'true');
        navigate('/admin/nps');
      } else {
        setError('Senha incorreta. Tente novamente.');
        setIsSubmitting(false);
      }
    }, 300);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>Área Administrativa</h1>
          <p>Painel NPS · Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="admin-password">Digite a senha administrativa</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha da equipe"
            autoFocus
            disabled={isSubmitting}
            required
          />

          {error && (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="admin-login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verificando...' : 'Entrar'}
          </button>

          <p className="admin-login-hint">
            Somente gestores autenticados podem consultar os resultados agregados.
          </p>
        </form>

        <div className="admin-login-footer">
          <button 
            type="button" 
            className="admin-login-back"
            onClick={() => navigate('/')}
          >
            ← Voltar ao chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;


