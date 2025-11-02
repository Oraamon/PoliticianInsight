import { useEffect, useMemo, useState } from 'react';
import './NPSSurvey.css';

const NPS_LOCAL_STORAGE_KEY = 'agoraai-nps-v1';
const LEGACY_STORAGE_KEYS = ['politian-nps'];

const scores = Array.from({ length: 11 }, (_, index) => index);

const scoreLabels = {
  0: 'Nada provável',
  1: 'Muito baixa',
  2: 'Muito baixa',
  3: 'Baixa',
  4: 'Baixa',
  5: 'Neutra',
  6: 'Neutra',
  7: 'Boa',
  8: 'Boa',
  9: 'Excelente',
  10: 'Recomendaria com certeza'
};

const reasonCatalog = {
  detrator: [
    'Faltam dados atualizados',
    'Interface confusa',
    'Respostas imprecisas',
    'Dificuldade para exportar insights',
    'Gostaria de integrações com outras ferramentas'
  ],
  neutro: [
    'Estou testando a plataforma',
    'Preciso de mais personalização',
    'Quero relatórios automatizados',
    'Desejo alertas em tempo real'
  ],
  promotor: [
    'Dashboards claros',
    'ÁgoraAI responde rápido',
    'Dados confiáveis',
    'Insights acionáveis',
    'Excelente curadoria de pautas'
  ]
};

const classificationCopy = {
  detrator: {
    label: 'Precisa melhorar',
    helper: 'Vamos priorizar correções urgentes com base no que você sinalizar.',
    question: 'O que mais atrapalhou a sua experiência?'
  },
  neutro: {
    label: 'Experiência regular',
    helper: 'Conte como podemos dar o próximo passo para surpreender você.',
    question: 'Qual funcionalidade destravaria o uso recorrente?'
  },
  promotor: {
    label: 'Experiência excelente',
    helper: 'Ficamos muito felizes! Compartilhe o que mais entregou valor.',
    question: 'Quais resultados você já alcançou com a ÁgoraAI?'
  }
};

const placeholderByClassification = {
  detrator: 'Descreva em detalhes onde não atendemos suas expectativas e o impacto disso.',
  neutro: 'Conte o que falta para a ÁgoraAI fazer parte da sua rotina.',
  promotor: 'Compartilhe histórias de uso ou resultados que possamos amplificar.'
};

const NPSSurvey = () => {
  const [hydrated, setHydrated] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStoredSurvey = () => {
      let stored = localStorage.getItem(NPS_LOCAL_STORAGE_KEY);

      if (!stored) {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          const legacy = localStorage.getItem(legacyKey);
          if (legacy) {
            stored = legacy;
            break;
          }
        }
      }

      if (!stored) {
        setHydrated(true);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setSelectedScore(parsed.score ?? null);
          setFeedback(parsed.feedback ?? '');
          setSelectedReasons(Array.isArray(parsed.reasons) ? parsed.reasons : []);
          setSubmitted(Boolean(parsed.submitted));
          setSubmittedAt(parsed.submittedAt ?? null);
        }
      } catch (error) {
        // ignora armazenamento inválido
      } finally {
        setHydrated(true);
      }
    };

    loadStoredSurvey();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload = JSON.stringify({
      score: selectedScore,
      feedback,
      reasons: selectedReasons,
      submitted,
      submittedAt
    });

    localStorage.setItem(NPS_LOCAL_STORAGE_KEY, payload);

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
  }, [feedback, hydrated, selectedReasons, selectedScore, submitted, submittedAt]);

  const classification = useMemo(() => {
    if (selectedScore === null || selectedScore === undefined) {
      return null;
    }
    if (selectedScore <= 6) return 'detrator';
    if (selectedScore <= 8) return 'neutro';
    return 'promotor';
  }, [selectedScore]);

  const scoreDescription = useMemo(() => {
    if (selectedScore === null || selectedScore === undefined) {
      return 'Selecione uma nota de 0 a 10';
    }
    return scoreLabels[selectedScore] ?? '';
  }, [selectedScore]);

  const availableReasons = useMemo(() => {
    if (!classification) return [];
    return reasonCatalog[classification] ?? [];
  }, [classification]);

  useEffect(() => {
    if (!classification) {
      setSelectedReasons([]);
      return;
    }

    setSelectedReasons((prev) => prev.filter((reason) => availableReasons.includes(reason)));
  }, [availableReasons, classification]);

  const gaugeValue = selectedScore === null ? 0 : Math.round((selectedScore / 10) * 100);

  const handleScoreSelect = (score) => {
    setSelectedScore(score);
    setError('');
  };

  const toggleReason = (reason) => {
    setSelectedReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((item) => item !== reason);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), reason];
      }
      return [...prev, reason];
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (selectedScore === null) {
      setError('Escolha uma nota para continuar.');
      return;
    }

    const requiresDetail = classification === 'detrator';
    if (requiresDetail && feedback.trim().length < 15 && selectedReasons.length === 0) {
      setError('Detalhe pelo menos um ponto de melhoria ou escreva um comentário mais completo.');
      return;
    }

    setSubmitted(true);
    setSubmittedAt(new Date().toISOString());
    setError('');
  };

  const resetSurvey = () => {
    setSelectedScore(null);
    setFeedback('');
    setSelectedReasons([]);
    setSubmitted(false);
    setSubmittedAt(null);
    setError('');
  };

  const formattedDate = useMemo(() => {
    if (!submittedAt) return null;
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(submittedAt));
    } catch (error) {
      return null;
    }
  }, [submittedAt]);

  const placeholder = classification ? placeholderByClassification[classification] : 'Conte-nos o que podemos aprimorar.';
  const copy = classification ? classificationCopy[classification] : null;

  return (
    <section className="nps-card" aria-label="Pesquisa de satisfação NPS da ÁgoraAI">
      <header className="nps-header">
        <div>
          <h2>Como a ÁgoraAI pode evoluir?</h2>
          <p>
            Avalie sua experiência recente com nossa inteligência política. Seus apontamentos guiam o roadmap de dados, UX e
            integrações.
          </p>
        </div>
        {submitted && (
          <button type="button" className="nps-reset" onClick={resetSurvey}>
            Responder novamente
          </button>
        )}
      </header>

      {submitted ? (
        <div className="nps-thankyou" role="status">
          <h3>Obrigado por apoiar a ÁgoraAI!</h3>
          <p>
            Nota <strong>{selectedScore}</strong> · {copy?.label ?? 'Feedback registrado'}
          </p>
          {selectedReasons.length > 0 && (
            <div className="nps-reason-list">
              <span>Motivos destacados:</span>
              <ul>
                {selectedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          {feedback && (
            <blockquote className="nps-feedback-quote">
              <span aria-label="Comentário registrado">“{feedback}”</span>
            </blockquote>
          )}
          {formattedDate && <p className="nps-timestamp">Enviado em {formattedDate}</p>}
          <p className="nps-followup">
            Nossa equipe de produto acompanha cada resposta semanalmente para destravar entregas prioritárias.
          </p>
        </div>
      ) : (
        <form className="nps-form" onSubmit={handleSubmit} noValidate>
          <fieldset>
            <legend>Qual a probabilidade de você recomendar a ÁgoraAI?</legend>
            <div className="nps-score-panel">
              <div className="nps-gauge" role="img" aria-label={`Nota selecionada: ${selectedScore ?? 'nenhuma'}`}>
                <svg viewBox="0 0 120 120" role="presentation" aria-hidden="true">
                  <defs>
                    <linearGradient id="npsGaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46ef" />
                      <stop offset="50%" stopColor="#6ea8ff" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle className="nps-gauge-track" cx="60" cy="60" r="54" />
                  <circle
                    className="nps-gauge-fill"
                    cx="60"
                    cy="60"
                    r="54"
                    style={{ strokeDashoffset: 339.292 - (339.292 * gaugeValue) / 100 }}
                  />
                  <text x="60" y="66" className="nps-gauge-score">
                    {selectedScore ?? '--'}
                  </text>
                </svg>
                <span className="nps-gauge-label">impacto da sua nota</span>
              </div>
              <div className="nps-scale">
                {scores.map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`nps-score ${selectedScore === score ? 'selected' : ''}`}
                    onClick={() => handleScoreSelect(score)}
                    aria-pressed={selectedScore === score}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
            <span className="nps-description" role="note">{scoreDescription}</span>
          </fieldset>

          {classification && (
            <div className="nps-classification" role="status">
              <strong>{copy?.label}</strong>
              <span>{copy?.helper}</span>
            </div>
          )}

          {availableReasons.length > 0 && (
            <div className="nps-reasons" aria-live="polite">
              <span className="nps-label">O que influenciou sua nota? <small>(até 3 opções)</small></span>
              <div className="nps-reason-chips">
                {availableReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={`nps-reason ${selectedReasons.includes(reason) ? 'selected' : ''}`}
                    onClick={() => toggleReason(reason)}
                    aria-pressed={selectedReasons.includes(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="nps-label" htmlFor="nps-feedback">
            {copy?.question ?? 'O que faria nossa plataforma ser ainda melhor?'}
          </label>
          <textarea
            id="nps-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={placeholder}
            rows={4}
          />

          {error && (
            <p className="nps-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="nps-submit" disabled={selectedScore === null}>
            Enviar avaliação
          </button>
        </form>
      )}
    </section>
  );
};

export default NPSSurvey;
