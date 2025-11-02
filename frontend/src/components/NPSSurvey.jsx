import { useEffect, useMemo, useState } from 'react';
import './NPSSurvey.css';

const NPS_LOCAL_STORAGE_KEY = 'politian-nps';

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

const NPSSurvey = () => {
  const [selectedScore, setSelectedScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(NPS_LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setSelectedScore(parsed.score ?? null);
          setFeedback(parsed.feedback ?? '');
          setSubmitted(Boolean(parsed.submitted));
        }
      } catch (error) {
        // ignora se JSON inválido
      }
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({
      score: selectedScore,
      feedback,
      submitted
    });
    localStorage.setItem(NPS_LOCAL_STORAGE_KEY, payload);
  }, [feedback, selectedScore, submitted]);

  const scoreDescription = useMemo(() => {
    if (selectedScore === null || selectedScore === undefined) {
      return 'Selecione uma nota de 0 a 10';
    }
    return scoreLabels[selectedScore] ?? '';
  }, [selectedScore]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedScore === null) return;
    setSubmitted(true);
  };

  const resetSurvey = () => {
    setSelectedScore(null);
    setFeedback('');
    setSubmitted(false);
  };

  return (
    <section className="nps-card" aria-label="Pesquisa de satisfação NPS">
      <header className="nps-header">
        <div>
          <h2>Como estamos ajudando você?</h2>
          <p>
            Conte-nos, em uma escala de 0 a 10, qual a probabilidade de indicar o Politian Insight
            para alguém que precisa de inteligência política confiável.
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
          <h3>Obrigado pelo feedback!</h3>
          <p>
            Sua avaliação de <strong>{selectedScore}</strong> nos ajuda a priorizar melhorias. Continuaremos evoluindo o
            monitoramento político com transparência.
          </p>
          {feedback && (
            <p className="nps-feedback-quote">
              <span>"{feedback}"</span>
            </p>
          )}
        </div>
      ) : (
        <form className="nps-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Qual a probabilidade de você recomendar o Politian Insight?</legend>
            <div className="nps-scale">
              {scores.map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`nps-score ${selectedScore === score ? 'selected' : ''}`}
                  onClick={() => setSelectedScore(score)}
                  aria-pressed={selectedScore === score}
                >
                  {score}
                </button>
              ))}
            </div>
            <span className="nps-description" role="note">{scoreDescription}</span>
          </fieldset>

          <label className="nps-label" htmlFor="nps-feedback">
            O que faria nossa plataforma ser ainda melhor?
          </label>
          <textarea
            id="nps-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Compartilhe sugestões ou necessidades específicas de monitoramento político."
            rows={4}
          />

          <button type="submit" className="nps-submit" disabled={selectedScore === null}>
            Enviar avaliação
          </button>
        </form>
      )}
    </section>
  );
};

export default NPSSurvey;
