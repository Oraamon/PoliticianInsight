import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './NPSAdmin.css';

const NPSAdmin = () => {
  const navigate = useNavigate();
  const [storedResults, setStoredResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState('');

  // Verifica autenticação
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('nps_admin_authenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const normalizeResult = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return null;

    const score = typeof entry.score === 'number' ? entry.score : Number(entry.score);
    if (Number.isNaN(score)) {
      return null;
    }

    let submittedAt = null;
    if (entry.submittedAt) {
      try {
        submittedAt = new Date(entry.submittedAt).toISOString();
      } catch (error) {
        submittedAt = null;
      }
    }

    const trimmedFeedback = typeof entry.feedback === 'string' ? entry.feedback.trim() : '';
    const reasons = Array.isArray(entry.reasons)
      ? entry.reasons.filter((reason) => typeof reason === 'string' && reason.trim().length > 0)
      : [];

    let classification = typeof entry.classification === 'string' ? entry.classification : null;
    if (!classification) {
      if (score <= 6) classification = 'detrator';
      else if (score <= 8) classification = 'neutro';
      else classification = 'promotor';
    }

    return {
      score,
      classification,
      reasons,
      feedback: trimmedFeedback,
      submittedAt
    };
  }, []);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    setResultsError('');

    try {
      const response = await fetch('/api/nps/responses');
      if (!response.ok) {
        throw new Error('Falha ao buscar respostas NPS');
      }

      const data = await response.json();
      const entries = Array.isArray(data?.responses) ? data.responses : [];
      const normalized = entries
        .map((entry) => normalizeResult(entry))
        .filter((entry) => entry !== null)
        .sort((a, b) => {
          if (!a.submittedAt || !b.submittedAt) return 0;
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

      setStoredResults(normalized);
    } catch (error) {
      setResultsError('Não foi possível carregar as respostas salvas. Tente novamente mais tarde.');
    } finally {
      setResultsLoading(false);
    }
  }, [normalizeResult]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const aggregatedMetrics = useMemo(() => {
    if (!storedResults.length) {
      return {
        total: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        nps: null,
        average: null,
        reasonFrequency: [],
        entries: []
      };
    }

    const tally = storedResults.reduce(
      (accumulator, entry) => {
        const { score } = entry;
        if (typeof score !== 'number') {
          return accumulator;
        }

        accumulator.total += 1;
        accumulator.sum += score;

        if (score >= 9) {
          accumulator.promoters += 1;
        } else if (score <= 6) {
          accumulator.detractors += 1;
        } else {
          accumulator.passives += 1;
        }

        if (Array.isArray(entry.reasons)) {
          for (const reason of entry.reasons) {
            if (typeof reason !== 'string') continue;
            accumulator.reasonMap.set(reason, (accumulator.reasonMap.get(reason) ?? 0) + 1);
          }
        }

        return accumulator;
      },
      {
        total: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        sum: 0,
        reasonMap: new Map()
      }
    );

    if (!tally.total) {
      return {
        total: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        nps: null,
        average: null,
        reasonFrequency: [],
        entries: []
      };
    }

    const npsScore = Math.round(((tally.promoters - tally.detractors) / tally.total) * 100);
    const averageScore = Math.round((tally.sum / tally.total) * 10) / 10;

    const reasonFrequency = Array.from(tally.reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const sortedEntries = [...storedResults].sort((a, b) => {
      if (!a.submittedAt && !b.submittedAt) return 0;
      if (!a.submittedAt) return 1;
      if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    return {
      total: tally.total,
      promoters: tally.promoters,
      passives: tally.passives,
      detractors: tally.detractors,
      nps: npsScore,
      average: averageScore,
      reasonFrequency,
      entries: sortedEntries
    };
  }, [storedResults]);

  const handleLogout = () => {
    sessionStorage.removeItem('nps_admin_authenticated');
    navigate('/admin/login');
  };

  return (
    <div className="nps-admin-page">
      <div className="nps-admin-container">
        <header className="nps-admin-header">
          <div>
            <h1>Painel NPS · Acesso restrito</h1>
            <p>Resultados agregados da pesquisa de satisfação</p>
          </div>
          <div className="nps-admin-actions">
            <button type="button" className="nps-admin-refresh" onClick={fetchResults}>
              Atualizar
            </button>
            <button type="button" className="nps-admin-logout" onClick={handleLogout}>
              Sair
            </button>
            <button type="button" className="nps-admin-back" onClick={() => navigate('/')}>
              ← Voltar ao chat
            </button>
          </div>
        </header>

        <div className="nps-admin-content">
          <div className="nps-admin-summary">
            <div className="nps-admin-tile">
              <span>Total de respostas</span>
              <strong>{aggregatedMetrics.total}</strong>
            </div>
            <div className="nps-admin-tile">
              <span>NPS consolidado</span>
              <strong>{aggregatedMetrics.nps !== null ? `${aggregatedMetrics.nps}` : '—'}</strong>
            </div>
            <div className="nps-admin-tile">
              <span>Média das notas</span>
              <strong>{aggregatedMetrics.average !== null ? aggregatedMetrics.average.toFixed(1) : '—'}</strong>
            </div>
            <div className="nps-admin-tile trio">
              <div>
                <span>Promotores</span>
                <strong>{aggregatedMetrics.promoters}</strong>
              </div>
              <div>
                <span>Neutros</span>
                <strong>{aggregatedMetrics.passives}</strong>
              </div>
              <div>
                <span>Detratores</span>
                <strong>{aggregatedMetrics.detractors}</strong>
              </div>
            </div>
          </div>

          <div className="nps-admin-section">
            <h4>Motivos mais citados</h4>
            {aggregatedMetrics.reasonFrequency.length ? (
              <ul className="nps-admin-reasons">
                {aggregatedMetrics.reasonFrequency.map((item) => (
                  <li key={item.reason}>
                    <span>{item.reason}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nps-admin-empty">Ainda não há motivos consolidados para exibir.</p>
            )}
          </div>

          <div className="nps-admin-section">
            <h4>Respostas registradas</h4>
            {resultsLoading ? (
              <p className="nps-admin-empty">Carregando respostas salvas…</p>
            ) : resultsError ? (
              <p className="nps-admin-empty">{resultsError}</p>
            ) : aggregatedMetrics.entries.length ? (
              <ul className="nps-admin-list">
                {aggregatedMetrics.entries.map((entry, index) => {
                  const formatted = entry.submittedAt
                    ? new Intl.DateTimeFormat('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(entry.submittedAt))
                    : 'Data indisponível';
                  return (
                    <li key={`${entry.submittedAt ?? 'sem-data'}-${index}`}>
                      <div className="nps-admin-list-header">
                        <span className={`tag ${entry.classification ?? 'indefinido'}`}>{entry.classification ?? '—'}</span>
                        <strong>Nota {entry.score}</strong>
                        <span>{formatted}</span>
                      </div>
                      {entry.reasons?.length > 0 && (
                        <p className="nps-admin-reason-tags">{entry.reasons.join(' · ')}</p>
                      )}
                      {entry.feedback && <p className="nps-admin-feedback">{entry.feedback}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="nps-admin-empty">Nenhuma resposta registrada até o momento.</p>
            )}
          </div>

          <p className="nps-admin-storage">
            Os registros ficam guardados com segurança nos servidores da ÁgoraAI e só aparecem aqui após autenticação.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NPSAdmin;

