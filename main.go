package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type CacheEntry struct {
	Data      *ChatResponse `json:"data"`
	Timestamp time.Time     `json:"timestamp"`
}

type Cache struct {
	entries map[string]*CacheEntry
	mutex   sync.RWMutex
	maxAge  time.Duration
}

func NewCache(maxAge time.Duration) *Cache {
	return &Cache{
		entries: make(map[string]*CacheEntry),
		maxAge:  maxAge,
	}
}

func (c *Cache) Get(key string) (*ChatResponse, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	entry, exists := c.entries[key]
	if !exists {
		return nil, false
	}

	if time.Since(entry.Timestamp) > c.maxAge {
		return nil, false
	}

	log.Printf("[CACHE HIT] %s...", truncateString(key, 50))
	return entry.Data, true
}

func (c *Cache) Set(key string, data *ChatResponse) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.entries[key] = &CacheEntry{
		Data:      data,
		Timestamp: time.Now(),
	}
	log.Printf("[CACHE SAVE] %s...", truncateString(key, 50))
}

func (c *Cache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.entries = make(map[string]*CacheEntry)
}

func (c *Cache) Size() int {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return len(c.entries)
}

func truncateString(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

type ChatRequest struct {
	Message string        `json:"message"`
	Context []ChatContext `json:"context,omitempty"`
}

type ChatContext struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Text    string `json:"text"` // Campo alternativo para compatibilidade
}

type ChatResponse struct {
	Reply     string `json:"reply"`
	Timestamp string `json:"timestamp"`
	RealTime  bool   `json:"realTime,omitempty"`
	Cached    bool   `json:"cached,omitempty"`
}

type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Cache     CacheInfo `json:"cache"`
}

type CacheInfo struct {
	Size   int           `json:"size"`
	MaxAge time.Duration `json:"maxAge"`
}

type Source struct {
	Nome string `json:"nome"`
	URL  string `json:"url"`
	Desc string `json:"descricao,omitempty"`
}

type SourcesResponse struct {
	Timestamp time.Time           `json:"timestamp"`
	Sources   map[string][]Source `json:"sources"`
}

type CacheClearResponse struct {
	Message    string    `json:"message"`
	BeforeSize int       `json:"beforeSize"`
	AfterSize  int       `json:"afterSize"`
	Timestamp  time.Time `json:"timestamp"`
}

type NPSResponse struct {
	Score          int      `json:"score"`
	Classification string   `json:"classification"`
	Reasons        []string `json:"reasons,omitempty"`
	Feedback       string   `json:"feedback,omitempty"`
	SubmittedAt    string   `json:"submittedAt"`
}

type NPSStore struct {
	filePath  string
	responses []NPSResponse
	mutex     sync.RWMutex
}

func NewNPSStore(filePath string) (*NPSStore, error) {
	store := &NPSStore{
		filePath:  filePath,
		responses: []NPSResponse{},
	}

	if err := store.load(); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *NPSStore) load() error {
	dir := filepath.Dir(s.filePath)
	if dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	file, err := os.Open(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			s.responses = []NPSResponse{}
			return nil
		}
		return err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	var data []NPSResponse
	if err := decoder.Decode(&data); err != nil {
		if err == io.EOF {
			s.responses = []NPSResponse{}
			return nil
		}
		return err
	}

	s.responses = data
	return nil
}

func (s *NPSStore) saveLocked() error {
	if dir := filepath.Dir(s.filePath); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	if len(s.responses) == 0 {
		emptyJSON := []byte("[]")
		return os.WriteFile(s.filePath, emptyJSON, 0o644)
	}

	payload, err := json.MarshalIndent(s.responses, "", "  ")
	if err != nil {
		return err
	}

	tempPath := s.filePath + ".tmp"
	if err := os.WriteFile(tempPath, payload, 0o644); err != nil {
		return err
	}

	return os.Rename(tempPath, s.filePath)
}

func (s *NPSStore) Add(entry NPSResponse) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.responses = append(s.responses, entry)
	return s.saveLocked()
}

func (s *NPSStore) List() []NPSResponse {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	copied := make([]NPSResponse, len(s.responses))
	copy(copied, s.responses)
	return copied
}

func classifyNPS(score int) string {
	if score <= 6 {
		return "detrator"
	}
	if score <= 8 {
		return "neutro"
	}
	return "promotor"
}

func sanitizeReasons(reasons []string) []string {
	if len(reasons) == 0 {
		return nil
	}

	cleaned := make([]string, 0, len(reasons))
	seen := make(map[string]struct{}, len(reasons))

	for _, reason := range reasons {
		trimmed := strings.TrimSpace(reason)
		if trimmed == "" {
			continue
		}

		if _, exists := seen[trimmed]; exists {
			continue
		}

		cleaned = append(cleaned, trimmed)
		seen[trimmed] = struct{}{}

		if len(cleaned) >= 5 {
			break
		}
	}

	if len(cleaned) == 0 {
		return nil
	}

	return cleaned
}

type GeminiRequest struct {
	Contents         []GeminiContent         `json:"contents"`
	Tools            []GeminiTool            `json:"tools,omitempty"`
	GenerationConfig *GeminiGenerationConfig `json:"generationConfig,omitempty"`
}

type GeminiTool struct {
	GoogleSearch *GeminiGoogleSearch `json:"googleSearch,omitempty"`
}

type GeminiGoogleSearch struct {
	// Configuração para busca na web
}

type GeminiGenerationConfig struct {
	Temperature float64 `json:"temperature,omitempty"`
	TopK        int     `json:"topK,omitempty"`
	TopP        float64 `json:"topP,omitempty"`
}

type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

const SYSTEM_INSTRUCTIONS = `Você é um chatbot político neutro e informativo para o público brasileiro.
Princípios:
- Seja factual e forneça informações detalhadas sobre o tema perguntado.
- Explique o contexto, histórico e detalhes relevantes da pergunta.
- Não faça persuasão política personalizada. Não promova ou desincentive votos.
- Se houver desinformação potencial, aponte com respeito e ofereça verificação.

CAPACIDADES ESPECIAIS:
- Este sistema POSSUI capacidade de gerar gráficos hexagonais automaticamente para análise de perfis políticos.
- Quando o usuário solicitar um gráfico, análise ou perfil de um político (usando palavras como "gráfico", "mostre", "análise", "perfil", "pontos fortes/fracos"), o sistema gerará automaticamente um gráfico hexagonal interativo com a análise.
- NÃO diga que você não pode gerar gráficos. Em vez disso, responda de forma informativa e aguarde - o gráfico será gerado automaticamente pelo sistema.

Formato:
- Responda em português claro e detalhado.
- Forneça contexto histórico e informações completas sobre o tema.
- Se a pergunta for sobre análise/perfil de um político com solicitação de gráfico, forneça informações contextuais e deixe claro que o gráfico será apresentado logo em seguida.

IMPORTANTE - Links de fontes oficiais:
- Inclua links de fontes oficiais APENAS quando:
  * A pergunta for sobre processos legislativos específicos, tramitação de projetos, leis ou decretos em análise
  * A pergunta for sobre dados eleitorais específicos, resultados de eleições ou informações do TSE
  * A pergunta for sobre parlamentares específicos, seus projetos ou atuação detalhada na Câmara/Senado
  * A pergunta solicitar explicitamente fontes ou sites oficiais
  * For necessário verificar informações em tempo real ou dados atualizados que exigem consulta direta
  * A pergunta for sobre status atual de processos ou tramitações específicas
- NÃO inclua links de fontes oficiais em perguntas:
  * Teóricas ou conceituais (ex: "o que é reforma tributária?", "como funciona o sistema eleitoral?")
  * Educacionais ou explicativas sobre temas gerais (ex: "explique sobre democracia", "o que é federalismo?")
  * Que já foram respondidas completamente sem necessidade de consulta adicional
  * Conversacionais ou casuais
  * Sobre história política ou eventos passados já documentados
- Quando incluir fontes, use APENAS os sites relevantes ao tema específico da pergunta. Não liste todos os sites sempre.
- Não termine automaticamente com a frase "Para informações mais detalhadas..." se a resposta já foi completa e não há necessidade de consulta adicional.`

const (
	npsStoreFilePath  = "data/nps-responses.json"
	maxNPSPayloadSize = 64 * 1024
)

var (
	cache        *Cache
	geminiAPIKey string
	geminiURL    = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
	npsStore     *NPSStore
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Arquivo .env não encontrado, usando variáveis de ambiente do sistema")
	}

	geminiAPIKey = os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		log.Fatal("GEMINI_API_KEY não definida. Defina no arquivo .env")
	}

	cache = NewCache(5 * time.Minute)
	npsStore, err = NewNPSStore(npsStoreFilePath)
	if err != nil {
		log.Fatalf("não foi possível preparar o armazenamento NPS: %v", err)
	}
	r := mux.NewRouter()
	r.Use(corsMiddleware)

	api := r.PathPrefix("/api").Subrouter()
	api.Use(jsonMiddleware)
	api.HandleFunc("/chat", handleChat).Methods("POST")
	api.HandleFunc("/health", handleHealth).Methods("GET")
	api.HandleFunc("/sources", handleSources).Methods("GET")
	api.HandleFunc("/cache/clear", handleCacheClear).Methods("POST")
	api.HandleFunc("/nps/responses", handleNPSSubmit).Methods("POST")
	api.HandleFunc("/nps/responses", handleNPSList).Methods("GET")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./public/")))
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Servidor rodando em http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func jsonMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

func generateCacheKey(message string, context []ChatContext) string {
	ctxStr := ""
	if len(context) > 0 {
		ctxBytes, _ := json.Marshal(context)
		ctxStr = string(ctxBytes)
	}
	return fmt.Sprintf("%s_%s", message, ctxStr)
}

// Estruturas para dados em tempo real
type RealTimeResult struct {
	Fonte string      `json:"fonte"`
	Tipo  string      `json:"tipo"`
	Dados interface{} `json:"dados,omitempty"`
	Nota  string      `json:"nota,omitempty"`
	URL   string      `json:"url,omitempty"`
}

type RealTimeData struct {
	LastUpdate string           `json:"lastUpdate"`
	Timestamp  string           `json:"timestamp"`
	Resultados []RealTimeResult `json:"resultados"`
	Total      int              `json:"total"`
	Observacao string           `json:"observacao"`
}

func searchRealTimeInfo(query string) bool {
	realTimeKeywords := []string{
		"eleições", "resultados", "votação", "candidatos", "tse",
		"tramitação", "projetos", "projeto", "proposição", "proposições",
		"leis", "lei", "decreto", "decretos", "sanção", "sancionado", "sancionou",
		"câmara", "senado", "deputado", "deputados", "senador", "senadores",
		"atual", "recente", "hoje", "agora", "último", "última", "últimos",
		"plenário", "comissão", "sessão", "reunião", "aprovação", "aprovado",
		"orçamento", "pib", "inflação", "economia", "política", "governo",
		"presidente", "ministro", "ministério", "pasta",
	}

	queryLower := strings.ToLower(query)
	for _, keyword := range realTimeKeywords {
		if strings.Contains(queryLower, keyword) {
			return true
		}
	}
	return false
}

func handleNPSSubmit(w http.ResponseWriter, r *http.Request) {
	if npsStore == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "armazenamento de pesquisas indisponível")
		return
	}

	defer r.Body.Close()

	reader := io.LimitReader(r.Body, maxNPSPayloadSize)
	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()

	var payload struct {
		Score          *int     `json:"score"`
		Classification string   `json:"classification"`
		Reasons        []string `json:"reasons"`
		Feedback       string   `json:"feedback"`
		SubmittedAt    string   `json:"submittedAt"`
	}

	if err := decoder.Decode(&payload); err != nil {
		writeJSONError(w, http.StatusBadRequest, "não foi possível interpretar a resposta NPS enviada")
		return
	}

	if payload.Score == nil {
		writeJSONError(w, http.StatusBadRequest, "a nota NPS é obrigatória")
		return
	}

	score := *payload.Score
	if score < 0 || score > 10 {
		writeJSONError(w, http.StatusBadRequest, "a nota deve estar entre 0 e 10")
		return
	}

	submittedAt := time.Now().UTC()
	if payload.SubmittedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, payload.SubmittedAt); err == nil {
			submittedAt = parsed.UTC()
		}
	}

	classification := strings.TrimSpace(strings.ToLower(payload.Classification))
	expectedClassification := classifyNPS(score)
	if classification == "" || classification != expectedClassification {
		classification = expectedClassification
	}

	reasons := sanitizeReasons(payload.Reasons)
	feedback := strings.TrimSpace(payload.Feedback)

	entry := NPSResponse{
		Score:          score,
		Classification: classification,
		Reasons:        reasons,
		Feedback:       feedback,
		SubmittedAt:    submittedAt.Format(time.RFC3339),
	}

	if err := npsStore.Add(entry); err != nil {
		log.Printf("erro ao salvar resposta NPS: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "não foi possível salvar a resposta no momento")
		return
	}

	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(entry); err != nil {
		log.Printf("erro ao codificar resposta NPS: %v", err)
	}
}

func handleNPSList(w http.ResponseWriter, r *http.Request) {
	if npsStore == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "armazenamento de pesquisas indisponível")
		return
	}

	responses := npsStore.List()
	if responses == nil {
		responses = []NPSResponse{}
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string][]NPSResponse{"responses": responses}); err != nil {
		log.Printf("erro ao codificar lista NPS: %v", err)
	}
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Printf("erro ao enviar resposta de erro: %v", err)
	}
}

// Busca dados da Câmara dos Deputados
func buscarDadosCamara(query string) (*RealTimeResult, error) {
	lowerQuery := strings.ToLower(query)

	if strings.Contains(lowerQuery, "projeto") || strings.Contains(lowerQuery, "tramitação") || strings.Contains(lowerQuery, "proposição") {
		currentYear := time.Now().Year()
		url := fmt.Sprintf("https://dadosabertos.camara.leg.br/api/v2/proposicoes?ano=%d&itens=10&ordem=ASC&ordenarPor=id", currentYear)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return nil, err
			}

			var data struct {
				Dados []map[string]interface{} `json:"dados"`
			}
			if err := json.Unmarshal(body, &data); err == nil && len(data.Dados) > 0 {
				// Limita a 5 itens
				var limitedData []map[string]interface{}
				if len(data.Dados) > 5 {
					limitedData = data.Dados[:5]
				} else {
					limitedData = data.Dados
				}

				return &RealTimeResult{
					Fonte: "Câmara dos Deputados",
					Tipo:  "proposições",
					Dados: limitedData,
					URL:   "https://www.camara.leg.br/",
				}, nil
			}
		}
	}

	if strings.Contains(lowerQuery, "deputado") {
		url := "https://dadosabertos.camara.leg.br/api/v2/deputados?itens=10&ordem=ASC&ordenarPor=nome"

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return nil, err
			}

			var data struct {
				Dados []map[string]interface{} `json:"dados"`
			}
			if err := json.Unmarshal(body, &data); err == nil && len(data.Dados) > 0 {
				var limitedData []map[string]interface{}
				if len(data.Dados) > 5 {
					limitedData = data.Dados[:5]
				} else {
					limitedData = data.Dados
				}

				return &RealTimeResult{
					Fonte: "Câmara dos Deputados",
					Tipo:  "deputados",
					Dados: limitedData,
					URL:   "https://www.camara.leg.br/",
				}, nil
			}
		}
	}

	return nil, nil
}

// Busca dados do Senado Federal
func buscarDadosSenado(query string) (*RealTimeResult, error) {
	lowerQuery := strings.ToLower(query)

	if strings.Contains(lowerQuery, "senado") || strings.Contains(lowerQuery, "senador") {
		url := "https://legis.senado.leg.br/dadosabertos/senador/lista/atual"

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return nil, err
			}

			var data struct {
				ListaParlamentarEmExercicio struct {
					Parlamentares []map[string]interface{} `json:"Parlamentar"`
				} `json:"ListaParlamentarEmExercicio"`
			}
			if err := json.Unmarshal(body, &data); err == nil {
				var limitedData []map[string]interface{}
				if len(data.ListaParlamentarEmExercicio.Parlamentares) > 10 {
					limitedData = data.ListaParlamentarEmExercicio.Parlamentares[:10]
				} else {
					limitedData = data.ListaParlamentarEmExercicio.Parlamentares
				}

				return &RealTimeResult{
					Fonte: "Senado Federal",
					Tipo:  "senadores",
					Dados: limitedData,
					URL:   "https://www25.senado.leg.br/",
				}, nil
			}
		}
	}

	return nil, nil
}

// Busca dados em tempo real de todas as fontes
func fetchRealTimeData(query string) *RealTimeData {
	lowerQuery := strings.ToLower(query)
	resultados := []RealTimeResult{}

	// Busca dados da Câmara
	if resultado, err := buscarDadosCamara(query); err == nil && resultado != nil {
		resultados = append(resultados, *resultado)
	}

	// Busca dados do Senado
	if resultado, err := buscarDadosSenado(query); err == nil && resultado != nil {
		resultados = append(resultados, *resultado)
	}

	// TSE - informações eleitorais
	if strings.Contains(lowerQuery, "eleições") || strings.Contains(lowerQuery, "tse") ||
		strings.Contains(lowerQuery, "candidato") || strings.Contains(lowerQuery, "votação") {
		resultados = append(resultados, RealTimeResult{
			Fonte: "TSE - Tribunal Superior Eleitoral",
			Tipo:  "informações eleitorais",
			Nota:  "Para dados eleitorais atualizados, consulte: https://www.tse.jus.br/",
			URL:   "https://www.tse.jus.br/",
		})
	}

	// Planalto - legislação
	if strings.Contains(lowerQuery, "lei") || strings.Contains(lowerQuery, "decreto") ||
		strings.Contains(lowerQuery, "sanção") || strings.Contains(lowerQuery, "sancionado") {
		currentYear := time.Now().Year()
		var atoRange string
		// Atualiza o range de anos dinamicamente baseado no ano atual
		if currentYear >= 2025 {
			atoRange = "2025-2030"
		} else if currentYear >= 2019 {
			atoRange = "2019-2024"
		} else {
			atoRange = "2011-2018"
		}

		resultados = append(resultados, RealTimeResult{
			Fonte: "Planalto",
			Tipo:  "legislação",
			Nota:  fmt.Sprintf("Para leis e decretos de %d, consulte: https://www.planalto.gov.br/ccivil_03/_ato%s/%d/", currentYear, atoRange, currentYear),
			URL:   "https://www.planalto.gov.br/",
		})
	}

	observacao := "Consulte os sites oficiais para informações mais detalhadas"
	if len(resultados) > 0 {
		observacao = "Dados buscados em tempo real de fontes oficiais"
	}

	return &RealTimeData{
		LastUpdate: time.Now().Format(time.RFC3339),
		Timestamp:  time.Now().Format("02 de January de 2006 às 15:04"),
		Resultados: resultados,
		Total:      len(resultados),
		Observacao: observacao,
	}
}

func callGeminiAPI(contents []GeminiContent) (*GeminiResponse, error) {
	// Habilita busca na web (grounding) para acesso a dados em tempo real
	tools := []GeminiTool{
		{
			GoogleSearch: &GeminiGoogleSearch{},
		},
	}

	geminiReq := GeminiRequest{
		Contents: contents,
		Tools:    tools,
		GenerationConfig: &GeminiGenerationConfig{
			Temperature: 0.7,
			TopK:        40,
			TopP:        0.95,
		},
	}

	jsonData, err := json.Marshal(geminiReq)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar requisição: %w", err)
	}

	url := fmt.Sprintf("%s?key=%s", geminiURL, geminiAPIKey)
	resp, err := http.Post(url, "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("erro ao fazer requisição HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorBody string
		if resp.Body != nil {
			buf := make([]byte, 1024)
			n, _ := resp.Body.Read(buf)
			errorBody = string(buf[:n])
		}
		return nil, fmt.Errorf("erro da API Gemini (status %d): %s", resp.StatusCode, errorBody)
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	return &geminiResp, nil
}

func handleChat(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Erro ao decodificar JSON"}`, http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, `{"error": "Campo 'message' é obrigatório"}`, http.StatusBadRequest)
		return
	}

	cacheKey := generateCacheKey(req.Message, req.Context)
	if cachedResp, found := cache.Get(cacheKey); found {
		cachedResp.Cached = true
		json.NewEncoder(w).Encode(cachedResp)
		return
	}

	needsRealTime := searchRealTimeInfo(req.Message)

	// Gera instruções do sistema com data atual dinâmica
	currentYear := time.Now().Year()
	currentDate := time.Now().Format("02 de January de 2006")

	// Constrói instruções dinâmicas com data atual
	dynamicInstructions := fmt.Sprintf(`Você é um chatbot político neutro e informativo para o público brasileiro.

DATA ATUAL: A data atual é %s (ano %d). Use esta data como referência ao responder sobre eventos recentes, atuais ou futuros.

IMPORTANTE - BUSCA NA WEB:
- Você TEM acesso ao Google Search (ferramenta de busca na web) habilitada.
- SEMPRE use o Google Search para buscar informações atualizadas quando a pergunta for sobre:
  * Eventos recentes (últimos meses ou semanas)
  * Notícias atuais, processos judiciais em andamento, decisões recentes
  * Informações que possam ter mudado recentemente
  * Dados que precisam ser verificados e atualizados
- Use o Google Search automaticamente quando detectar que a informação pode estar desatualizada.
- Priorize informações encontradas na web sobre informações do seu conhecimento pré-treinado quando se tratar de eventos recentes.

Princípios:
- Seja factual e forneça informações detalhadas sobre o tema perguntado.
- Explique o contexto, histórico e detalhes relevantes da pergunta.
- Não faça persuasão política personalizada. Não promova ou desincentive votos.
- Se houver desinformação potencial, aponte com respeito e ofereça verificação.
- Use a data atual para contextualizar eventos e informações temporais.
- BUSQUE informações atualizadas na web quando necessário, especialmente para eventos recentes.

CAPACIDADES ESPECIAIS:
- Este sistema POSSUI capacidade de gerar gráficos hexagonais automaticamente para análise de perfis políticos.
- Quando o usuário solicitar um gráfico, análise ou perfil de um político (usando palavras como "gráfico", "mostre", "análise", "perfil", "pontos fortes/fracos"), o sistema gerará automaticamente um gráfico hexagonal interativo com a análise.
- NÃO diga que você não pode gerar gráficos. Em vez disso, responda de forma informativa e aguarde - o gráfico será gerado automaticamente pelo sistema.

Formato:
- Responda em português claro e detalhado.
- Forneça contexto histórico e informações completas sobre o tema.
- Se a pergunta for sobre análise/perfil de um político com solicitação de gráfico, forneça informações contextuais e deixe claro que o gráfico será apresentado logo em seguida.
- Quando mencionar datas, use o ano atual (%d) como referência quando apropriado.
- SEMPRE busque na web informações sobre eventos recentes, notícias atuais ou informações que podem ter mudado.

%s`, currentDate, currentYear, currentYear, SYSTEM_INSTRUCTIONS[strings.Index(SYSTEM_INSTRUCTIONS, "IMPORTANTE - Links de fontes oficiais:"):])

	contents := []GeminiContent{}
	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: fmt.Sprintf("INSTRUÇÕES DO SISTEMA:\n%s", dynamicInstructions)}},
	})
	contents = append(contents, GeminiContent{
		Role:  "model",
		Parts: []GeminiPart{{Text: "Entendido. Vou seguir essas instruções e usar informações atualizadas."}},
	})

	for _, ctx := range req.Context {
		// Suporta ambos os formatos: 'text' e 'content'
		content := ctx.Content
		if content == "" {
			content = ctx.Text
		}
		contents = append(contents, GeminiContent{
			Role:  ctx.Role,
			Parts: []GeminiPart{{Text: content}},
		})
	}

	// Adiciona informações em tempo real se disponíveis
	enhancedMessage := req.Message
	if needsRealTime {
		log.Printf("[TEMPO REAL] Buscando dados atualizados para: %s...", truncateString(req.Message, 50))
		realTimeData := fetchRealTimeData(req.Message)

		if realTimeData != nil && len(realTimeData.Resultados) > 0 {
			var realTimeContext bytes.Buffer
			realTimeContext.WriteString("\n\n[INFORMAÇÕES EM TEMPO REAL - Buscadas agora]\n")
			realTimeContext.WriteString(fmt.Sprintf("Última atualização: %s\n\n", realTimeData.Timestamp))

			for i, resultado := range realTimeData.Resultados {
				realTimeContext.WriteString(fmt.Sprintf("\n%d. %s - %s\n", i+1, resultado.Fonte, resultado.Tipo))

				if resultado.Dados != nil {
					// Tenta serializar dados de forma resumida
					if dadosBytes, err := json.Marshal(resultado.Dados); err == nil {
						var dadosArray []map[string]interface{}
						if err := json.Unmarshal(dadosBytes, &dadosArray); err == nil {
							for j, item := range dadosArray {
								if j >= 3 {
									break
								}
								if nome, ok := item["nome"].(string); ok && nome != "" {
									if sigla, ok := item["sigla"].(string); ok && sigla != "" {
										realTimeContext.WriteString(fmt.Sprintf("   - %s (%s)\n", nome, sigla))
									} else {
										realTimeContext.WriteString(fmt.Sprintf("   - %s\n", nome))
									}
								} else if siglaTipo, ok := item["siglaTipo"].(string); ok && siglaTipo != "" {
									if numero, ok := item["numero"].(float64); ok {
										realTimeContext.WriteString(fmt.Sprintf("   - %s %.0f\n", siglaTipo, numero))
									} else {
										realTimeContext.WriteString(fmt.Sprintf("   - %s\n", siglaTipo))
									}
								}
							}
						}
					}
				}

				if resultado.Nota != "" {
					realTimeContext.WriteString(fmt.Sprintf("   Nota: %s\n", resultado.Nota))
				}
				if resultado.URL != "" {
					realTimeContext.WriteString(fmt.Sprintf("   URL: %s\n", resultado.URL))
				}
			}

			if realTimeData.Observacao != "" {
				realTimeContext.WriteString(fmt.Sprintf("\nObservação: %s\n", realTimeData.Observacao))
			}

			realTimeContext.WriteString("\nUse essas informações em tempo real para complementar sua resposta quando relevante.\n")
			enhancedMessage = req.Message + realTimeContext.String()
		}
	}

	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: enhancedMessage}},
	})

	geminiResp, err := callGeminiAPI(contents)
	if err != nil {
		log.Printf("Erro na API Gemini: %v", err)
		http.Error(w, fmt.Sprintf(`{"error": "Erro na API Gemini", "detail": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	var reply string
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		reply = geminiResp.Candidates[0].Content.Parts[0].Text
	} else {
		reply = "Não consegui gerar uma resposta."
	}

	timestamp := time.Now().Format("02 de January de 2006 às 15:04")
	chatResp := &ChatResponse{
		Reply:     reply,
		Timestamp: timestamp,
		RealTime:  needsRealTime,
	}

	if !needsRealTime {
		cache.Set(cacheKey, chatResp)
	}

	log.Printf("[%s] Pergunta: %s...", timestamp, truncateString(req.Message, 100))
	log.Printf("[%s] Resposta: %s...", timestamp, truncateString(reply, 100))

	json.NewEncoder(w).Encode(chatResp)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Cache: CacheInfo{
			Size:   cache.Size(),
			MaxAge: 5 * time.Minute,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func handleSources(w http.ResponseWriter, r *http.Request) {
	sources := map[string][]Source{
		"oficiais": {
			{Nome: "Tribunal Superior Eleitoral (TSE)", URL: "https://www.tse.jus.br/", Desc: "Dados eleitorais, candidatos e resultados"},
			{Nome: "Câmara dos Deputados", URL: "https://www.camara.leg.br/", Desc: "Projetos de lei, tramitação e deputados"},
			{Nome: "Senado Federal", URL: "https://www25.senado.leg.br/", Desc: "Proposições, senadores e tramitação"},
			{Nome: "Presidência da República", URL: "https://www.planalto.gov.br/", Desc: "Leis, decretos e atos normativos"},
			{Nome: "Conselho Nacional de Justiça (CNJ)", URL: "https://www.cnj.jus.br/", Desc: "Normas judiciais e jurisprudência"},
		},
		"apis": {
			{Nome: "Dados Abertos - Câmara", URL: "https://dadosabertos.camara.leg.br/", Desc: "API para dados da Câmara dos Deputados"},
			{Nome: "Dados Abertos - Senado", URL: "https://legis.senado.leg.br/dadosabertos/", Desc: "API para dados do Senado Federal"},
		},
		"verificacao": {
			{Nome: "Agência Lupa", URL: "https://piaui.folha.uol.com.br/lupa/", Desc: "Verificação de fatos e checagem"},
			{Nome: "Aos Fatos", URL: "https://www.aosfatos.org/", Desc: "Verificação de informações"},
		},
	}

	resp := SourcesResponse{
		Timestamp: time.Now(),
		Sources:   sources,
	}
	json.NewEncoder(w).Encode(resp)
}

func handleCacheClear(w http.ResponseWriter, r *http.Request) {
	beforeSize := cache.Size()
	cache.Clear()

	resp := CacheClearResponse{
		Message:    "Cache limpo com sucesso",
		BeforeSize: beforeSize,
		AfterSize:  cache.Size(),
		Timestamp:  time.Now(),
	}
	json.NewEncoder(w).Encode(resp)
}
