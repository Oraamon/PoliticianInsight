package main

import (
	"context"
	"log"
	"sync"
	"time"

	"chat-bot/internal/config"
	"chat-bot/internal/services"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// NPSStoreFirestore armazena respostas NPS no Firestore
type NPSStoreFirestore struct {
	firestoreService *services.FirestoreService
	collection       string
	mutex            sync.RWMutex
	ctx              context.Context
}

// NewNPSStoreFirestore cria uma nova instância do store usando Firestore
func NewNPSStoreFirestore(ctx context.Context, cfg *config.Config) (*NPSStoreFirestore, error) {
	// Inicializar o serviço Firestore usando a nova estrutura
	firestoreService, err := services.InitializeFirestore(cfg)
	if err != nil {
		return nil, err
	}

	collection := cfg.FirestoreCollection
	if collection == "" {
		collection = "nps_responses"
	}

	store := &NPSStoreFirestore{
		firestoreService: firestoreService,
		collection:       collection,
		ctx:              ctx,
	}

	return store, nil
}

// Add adiciona uma nova resposta NPS ao Firestore
func (s *NPSStoreFirestore) Add(entry NPSResponse) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Adiciona timestamp de criação se não existir
	docData := map[string]interface{}{
		"score":          entry.Score,
		"classification": entry.Classification,
		"reasons":        entry.Reasons,
		"feedback":       entry.Feedback,
		"submittedAt":    entry.SubmittedAt,
		"createdAt":      time.Now().UTC().Format(time.RFC3339),
	}

	client := s.firestoreService.GetClient()
	_, _, err := client.Collection(s.collection).Add(s.ctx, docData)
	if err != nil {
		log.Printf("erro ao adicionar resposta NPS ao Firestore: %v", err)
		return err
	}

	log.Printf("resposta NPS salva no Firestore: score=%d, classification=%s", entry.Score, entry.Classification)
	return nil
}

// List retorna todas as respostas NPS do Firestore
func (s *NPSStoreFirestore) List() []NPSResponse {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	client := s.firestoreService.GetClient()
	var responses []NPSResponse
	iter := client.Collection(s.collection).OrderBy("submittedAt", firestore.Desc).Documents(s.ctx)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("erro ao ler documento do Firestore: %v", err)
			continue
		}

		var data map[string]interface{}
		if err := doc.DataTo(&data); err != nil {
			log.Printf("erro ao converter documento do Firestore: %v", err)
			continue
		}

		// Converte score de forma segura
		var score int
		switch v := data["score"].(type) {
		case int64:
			score = int(v)
		case int:
			score = v
		case float64:
			score = int(v)
		default:
			log.Printf("tipo de score inválido: %T", v)
			continue
		}

		response := NPSResponse{
			Score:          score,
			Classification: getString(data, "classification"),
			Feedback:       getString(data, "feedback"),
			SubmittedAt:    getString(data, "submittedAt"),
		}

		// Converte reasons se existir
		if reasons, ok := data["reasons"].([]interface{}); ok {
			response.Reasons = make([]string, 0, len(reasons))
			for _, r := range reasons {
				if str, ok := r.(string); ok {
					response.Reasons = append(response.Reasons, str)
				}
			}
		}

		responses = append(responses, response)
	}

	return responses
}

// Close fecha a conexão com o Firestore
func (s *NPSStoreFirestore) Close() error {
	if s.firestoreService != nil {
		return s.firestoreService.Close()
	}
	return nil
}

// getString extrai uma string de forma segura do mapa
func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// NPSStoreInterface define a interface comum para stores de NPS
type NPSStoreInterface interface {
	Add(entry NPSResponse) error
	List() []NPSResponse
}
