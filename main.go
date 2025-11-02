package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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

type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
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
- Sempre termine sugerindo consultar sites oficiais para informações mais detalhadas.
Formato:
- Responda em português claro e detalhado.
- Forneça contexto histórico e informações completas sobre o tema.
- Sempre termine com: "Para informações mais detalhadas e atualizadas, recomendo consultar os sites oficiais: [lista de sites relevantes]"
- Inclua links de fontes oficiais quando apropriado (TSE, Planalto, Câmara, Senado, CNJ).`

var (
	cache        *Cache
	geminiAPIKey string
	geminiURL    = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
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
	r := mux.NewRouter()
	r.Use(corsMiddleware)

	api := r.PathPrefix("/api").Subrouter()
	api.Use(jsonMiddleware)
	api.HandleFunc("/chat", handleChat).Methods("POST")
	api.HandleFunc("/health", handleHealth).Methods("GET")
	api.HandleFunc("/sources", handleSources).Methods("GET")
	api.HandleFunc("/cache/clear", handleCacheClear).Methods("POST")

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

func searchRealTimeInfo(query string) bool {
	realTimeKeywords := []string{
		"eleições", "resultados", "votação", "candidatos", "tse",
		"tramitação", "projetos", "leis", "câmara", "senado",
		"atual", "recente", "hoje", "agora", "último",
	}

	queryLower := strings.ToLower(query)
	for _, keyword := range realTimeKeywords {
		if strings.Contains(queryLower, keyword) {
			return true
		}
	}
	return false
}

func callGeminiAPI(contents []GeminiContent) (*GeminiResponse, error) {
	geminiReq := GeminiRequest{Contents: contents}

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

	contents := []GeminiContent{}
	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: fmt.Sprintf("INSTRUÇÕES DO SISTEMA:\n%s", SYSTEM_INSTRUCTIONS)}},
	})
	contents = append(contents, GeminiContent{
		Role:  "model",
		Parts: []GeminiPart{{Text: "Entendido. Vou seguir essas instruções e usar informações atualizadas."}},
	})

	for _, ctx := range req.Context {
		contents = append(contents, GeminiContent{
			Role:  ctx.Role,
			Parts: []GeminiPart{{Text: ctx.Content}},
		})
	}

	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: req.Message}},
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
