import { useCallback, useEffect, useMemo, useState } from 'react';
import './NPSSurvey.css';

const NPS_LOCAL_STORAGE_KEY = 'agoraai-nps-v1';
const ADMIN_PASSWORD = 'agoraai-admin-2024';
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

const scheduleLocalStorageWrite = (key, value) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleHandle = window.requestIdleCallback(() => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // ignore quota or availability issues
      }
    }, { timeout: 500 });

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }

  const timeoutHandle = window.setTimeout(() => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // ignore quota or availability issues
    }
  }, 120);

  return () => window.clearTimeout(timeoutHandle);
};

const NPSSurvey = () => {
  const [hydrated, setHydrated] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedResults, setStoredResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState('');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState('');

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
          const isSubmitted = Boolean(parsed.submitted);
          setSubmitted(isSubmitted);
          setSubmittedAt(parsed.submittedAt ?? null);
          setShowDetails(isSubmitted);
        }
      } catch (error) {
        // ignora armazenamento inválido
      } finally {
        setHydrated(true);
      }
    };
    loadStoredSurvey();
  }, []);

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

  const serializedSurveyState = useMemo(
    () =>
      JSON.stringify({
        score: selectedScore,
        feedback,
        reasons: selectedReasons,
        submitted,
        submittedAt
      }),
    [feedback, selectedReasons, selectedScore, submitted, submittedAt]
  );

  useEffect(() => {
    if (!hydrated || !serializedSurveyState) return undefined;

    const cancel = scheduleLocalStorageWrite(NPS_LOCAL_STORAGE_KEY, serializedSurveyState);

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }

    return cancel;
  }, [hydrated, serializedSurveyState]);

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

  const recommendedFeedbackLength = useMemo(() => {
    if (classification === 'detrator') return 25;
    if (classification === 'promotor') return 35;
    if (classification === 'neutro') return 20;
    return 18;
  }, [classification]);

  const steps = useMemo(() => {
    return [
      {
        id: 'score',
        label: 'Nota',
        complete: selectedScore !== null
      },
      {
        id: 'reasons',
        label: 'Motivos',
        complete: selectedReasons.length > 0,
        disabled: !classification
      },
      {
        id: 'feedback',
        label: 'Detalhes',
        complete:
          feedback.trim().length >= recommendedFeedbackLength || (classification === 'detrator' && selectedReasons.length > 0),
        disabled: selectedScore === null
      }
    ];
  }, [classification, feedback, recommendedFeedbackLength, selectedReasons, selectedScore]);

  const activeStep = useMemo(() => {
    const firstIncomplete = steps.find((step) => !step.complete && !step.disabled);
    if (firstIncomplete) return firstIncomplete.id;
    const firstEnabled = steps.find((step) => !step.disabled);
    return firstEnabled ? firstEnabled.id : steps[0].id;
  }, [steps]);

  const completedSteps = useMemo(() => steps.filter((step) => step.complete).length, [steps]);
  const progress = useMemo(() => {
    const totalSteps = steps.length;
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [completedSteps, steps]);

  useEffect(() => {
    if (!classification) {
      setSelectedReasons([]);
      return;
    }

    setSelectedReasons((prev) => prev.filter((reason) => availableReasons.includes(reason)));
  }, [availableReasons, classification]);

  const gaugeValue = selectedScore === null ? 0 : Math.round((selectedScore / 10) * 100);

  const feedbackLength = feedback.trim().length;

  const surveyPayload = useMemo(
    () => ({
      score: selectedScore,
      classification,
      reasons: selectedReasons,
      feedback,
      submittedAt
    }),
    [classification, feedback, selectedReasons, selectedScore, submittedAt]
  );

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (selectedScore === null) {
      setError('Escolha uma nota para continuar.');
      return;
    }

    const requiresDetail = classification === 'detrator';
    if (requiresDetail && feedback.trim().length < 15 && selectedReasons.length === 0) {
      setError('Detalhe pelo menos um ponto de melhoria ou escreva um comentário mais completo.');
      return;
    }

    const timestamp = new Date().toISOString();
    const payload = {
      score: selectedScore,
      classification,
      reasons: selectedReasons,
      feedback: feedback.trim(),
      submittedAt: timestamp
    };

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/nps/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar resposta');
      }

      const saved = await response.json();
      const normalized = normalizeResult({ ...payload, ...saved });

      setSubmitted(true);
      setSubmittedAt(normalized?.submittedAt ?? timestamp);
      setError('');
      setShowDetails(true);
      setResultsError('');

      if (normalized) {
        setStoredResults((previous) => {
          const filtered = previous.filter((entry) => {
            return !(
              entry.submittedAt === normalized.submittedAt &&
              entry.score === normalized.score &&
              entry.feedback === normalized.feedback
            );
          });
          const next = [normalized, ...filtered];
          return next.sort((a, b) => {
            if (!a.submittedAt || !b.submittedAt) return 0;
            return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
          });
        });
      }

      fetchResults();
    } catch (submissionError) {
      setError('Não foi possível enviar sua resposta agora. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSurvey = () => {
    setSelectedScore(null);
    setFeedback('');
    setSelectedReasons([]);
    setSubmitted(false);
    setSubmittedAt(null);
    setError('');
    setShowDetails(false);
    setCopied(false);
    setCopyError('');
    setIsSubmitting(false);
    setAdminPanelOpen(false);
    setAdminPassword('');
    setAdminUnlocked(false);
    setAdminError('');
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

  const handleCopyResponse = async () => {
    setCopyError('');
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyError('Copie o conteúdo do resumo manualmente caso seu navegador não permita copiar automaticamente.');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(surveyPayload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (error) {
      setCopyError('Não foi possível copiar automaticamente. Copie manualmente o resumo exibido.');
    }
  };

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

  const handleAdminAccess = (event) => {
    event.preventDefault();
    setAdminError('');

    if (adminPassword.trim() === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
    } else {
      setAdminUnlocked(false);
      setAdminError('Senha incorreta. Tente novamente.');
    }
  };

  const openAdminPanel = () => {
    setAdminPanelOpen(true);
    fetchResults();
  };

  const closeAdminPanel = () => {
    setAdminPanelOpen(false);
    setAdminPassword('');
    setAdminUnlocked(false);
    setAdminError('');
  };

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
        <button
          type="button"
          className="nps-admin-access"
          onClick={openAdminPanel}
          aria-haspopup="dialog"
          aria-expanded={adminPanelOpen}
        >
          Área administrativa
        </button>
      </header>

      <div className="nps-progress" role="group" aria-label="Etapas da pesquisa">
        <div className="nps-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="nps-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <ul className="nps-progress-steps">
          {steps.map((step) => {
            const status = step.complete ? 'done' : step.id === activeStep ? 'active' : 'pending';
            return (
              <li key={step.id} className={`nps-progress-step ${status}`} aria-current={status === 'active' ? 'step' : undefined}>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {submitted ? (
        <div className="nps-thankyou" role="status">
          <h3>Obrigado por apoiar a ÁgoraAI!</h3>
          <p>
            Nota <strong>{selectedScore}</strong> · {copy?.label ?? 'Feedback registrado'}
          </p>
          <div className="nps-thankyou-actions">
            <button type="button" className="nps-details-toggle" onClick={() => setShowDetails((prev) => !prev)}>
              {showDetails ? 'Ocultar resumo da resposta' : 'Ver resumo da resposta'}
            </button>
            <button type="button" className="nps-details-toggle secondary" onClick={handleCopyResponse}>
              {copied ? 'Resumo copiado!' : 'Copiar resposta'}
            </button>
          </div>
          {copyError && (
            <p className="nps-error" role="alert">
              {copyError}
            </p>
          )}
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
          {showDetails && (
            <div className="nps-details" aria-live="polite">
              <div className="nps-details-grid">
                <div>
                  <span className="nps-details-label">Nota registrada</span>
                  <strong className="nps-details-value">{surveyPayload.score ?? '--'}</strong>
                </div>
                <div>
                  <span className="nps-details-label">Classificação</span>
                  <strong className="nps-details-value">{copy?.label ?? '—'}</strong>
                </div>
                <div>
                  <span className="nps-details-label">Motivos</span>
                  <strong className="nps-details-value">
                    {surveyPayload.reasons?.length ? surveyPayload.reasons.join(', ') : 'Não selecionado'}
                  </strong>
                </div>
                <div>
                  <span className="nps-details-label">Comentário</span>
                  <strong className="nps-details-value">{surveyPayload.feedback || 'Não informado'}</strong>
                </div>
                <div>
                  <span className="nps-details-label">Carimbo de data</span>
                  <strong className="nps-details-value">{formattedDate ?? 'Não registrado'}</strong>
                </div>
              </div>
              <p className="nps-saved-hint">
                Para revisar ou limpar este envio no futuro, acesse o armazenamento local do navegador e procure pela chave
                <code>agoraai-nps-v1</code>.
              </p>
            </div>
          )}
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
            rows={5}
            maxLength={600}
          />
          <div className="nps-feedback-meta">
            <span>
              {feedbackLength < recommendedFeedbackLength
                ? `Conte um pouco mais (${feedbackLength}/${recommendedFeedbackLength} sugeridos).`
                : 'Excelente! Obrigado por compartilhar mais contexto.'}
            </span>
            <span>{feedback.length}/600</span>
          </div>

          {error && (
            <p className="nps-error" role="alert">
              {error}
            </p>
          )}

          <div className="nps-form-actions">
            <button type="submit" className="nps-submit" disabled={selectedScore === null || isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar avaliação'}
            </button>
            <span className="nps-saved-hint">
              As respostas confirmadas ficam guardadas na base administrativa protegida da ÁgoraAI.
            </span>
          </div>
        </form>
      )}

      {adminPanelOpen && (
        <div className="nps-admin-overlay" role="presentation">
          <div className="nps-admin-dialog" role="dialog" aria-modal="true" aria-label="Resultados NPS da ÁgoraAI">
            <div className="nps-admin-header">
              <h3>Painel NPS · Acesso restrito</h3>
              <button type="button" className="nps-admin-close" onClick={closeAdminPanel} aria-label="Fechar painel">
                ×
              </button>
            </div>

            {!adminUnlocked ? (
              <form className="nps-admin-form" onSubmit={handleAdminAccess}>
                <label htmlFor="admin-password">Digite a senha administrativa</label>
                <input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Senha da equipe"
                  autoFocus
                />
                {adminError && (
                  <p className="nps-error" role="alert">
                    {adminError}
                  </p>
                )}
                <button type="submit" className="nps-admin-submit">
                  Entrar
                </button>
                <p className="nps-admin-hint">Somente gestores autenticados podem consultar os resultados agregados.</p>
              </form>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default NPSSurvey;
