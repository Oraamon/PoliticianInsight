package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"chat-bot/internal/config"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/db"
	"google.golang.org/api/option"
)

// FirebaseService representa o serviço Firebase
type FirebaseService struct {
	app    *firebase.App
	auth   *auth.Client
	db     *db.Client
	config *config.Config
}

// ServiceAccount representa as credenciais da conta de serviço do Firebase
type ServiceAccount struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

// InitializeFirebase inicializa o Firebase Admin SDK
func InitializeFirebase(cfg *config.Config) (*firebase.App, error) {
	if cfg.FirebaseProjectID == "" {
		return nil, fmt.Errorf("FIREBASE_PROJECT_ID não configurado no env.yaml")
	}

	if cfg.FirebaseClientEmail == "" || cfg.FirebasePrivateKey == "" {
		return nil, fmt.Errorf("FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY são obrigatórios no env.yaml")
	}

	// Extrair ProjectID do email da service account para garantir consistência
	var projectID string
	emailParts := strings.Split(cfg.FirebaseClientEmail, "@")
	if len(emailParts) == 2 {
		domainParts := strings.Split(emailParts[1], ".")
		if len(domainParts) > 0 {
			projectID = domainParts[0]
		}
	}

	// Usar o ProjectID do email se disponível, senão usar o configurado
	if projectID == "" {
		projectID = cfg.FirebaseProjectID
	}

	// Configurar credenciais usando marshaling JSON adequado (necessário para o SDK do Firebase)
	serviceAccount := ServiceAccount{
		Type:                    "service_account",
		ProjectID:               projectID,
		PrivateKeyID:            "",
		PrivateKey:              strings.ReplaceAll(cfg.FirebasePrivateKey, "\\n", "\n"),
		ClientEmail:             cfg.FirebaseClientEmail,
		ClientID:                cfg.FirebaseClientID,
		AuthURI:                 cfg.FirebaseAuthURI,
		TokenURI:                cfg.FirebaseTokenURI,
		AuthProviderX509CertURL: cfg.FirebaseAuthProviderX509CertURL,
		ClientX509CertURL:       cfg.FirebaseClientX509CertURL,
	}

	credsJSON, err := json.Marshal(serviceAccount)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar credenciais JSON: %w", err)
	}

	creds := option.WithCredentialsJSON(credsJSON)

	// Inicializar Firebase usando o ProjectID correto
	app, err := firebase.NewApp(context.Background(), &firebase.Config{
		DatabaseURL: fmt.Sprintf("https://%s-default-rtdb.firebaseio.com", projectID),
		ProjectID:   projectID,
	}, creds)
	if err != nil {
		return nil, fmt.Errorf("erro ao inicializar Firebase: %w", err)
	}

	return app, nil
}

// InitializeFirestore inicializa o Firestore
func InitializeFirestore(cfg *config.Config) (*FirestoreService, error) {
	app, err := InitializeFirebase(cfg)
	if err != nil {
		return nil, err
	}

	// Inicializar Firestore
	firestoreClient, err := app.Firestore(context.Background())
	if err != nil {
		return nil, fmt.Errorf("erro ao inicializar Firestore: %w", err)
	}

	// Inicializar Auth
	authClient, err := app.Auth(context.Background())
	if err != nil {
		return nil, fmt.Errorf("erro ao inicializar Auth: %w", err)
	}

	// Inicializar Realtime Database (opcional)
	var dbClient *db.Client
	if cfg.FirebaseProjectID != "" {
		dbClient, err = app.Database(context.Background())
		if err != nil {
			return nil, fmt.Errorf("erro ao inicializar Database: %w", err)
		}
	}

	return &FirestoreService{
		client: firestoreClient,
		auth:   authClient,
		db:     dbClient,
		config: cfg,
	}, nil
}

// FirestoreService representa o serviço Firestore
type FirestoreService struct {
	client *firestore.Client
	auth   *auth.Client
	db     *db.Client
	config *config.Config
}

// Close fecha as conexões
func (fs *FirestoreService) Close() error {
	if fs.client != nil {
		return fs.client.Close()
	}
	return nil
}

// GetClient retorna o cliente Firestore
func (fs *FirestoreService) GetClient() *firestore.Client {
	return fs.client
}

// GetAuth retorna o cliente Auth
func (fs *FirestoreService) GetAuth() *auth.Client {
	return fs.auth
}

// GetDB retorna o cliente Database
func (fs *FirestoreService) GetDB() *db.Client {
	return fs.db
}

// TestConnection testa a conexão com o Firebase
func (fs *FirestoreService) TestConnection(ctx context.Context) error {
	// Testar Firestore
	_, err := fs.client.Collection("_test_connection").Doc("test").Get(ctx)
	if err != nil && !strings.Contains(err.Error(), "not found") {
		return fmt.Errorf("erro ao testar Firestore: %w", err)
	}

	// Testar Realtime Database se configurado
	if fs.db != nil {
		testRef := fs.db.NewRef("_test_connection")
		if err := testRef.Set(ctx, map[string]interface{}{
			"timestamp": time.Now().Unix(),
		}); err != nil {
			return fmt.Errorf("erro ao testar Database: %w", err)
		}

		// Limpar teste
		if err := testRef.Delete(ctx); err != nil {
			return fmt.Errorf("erro ao limpar teste do Database: %w", err)
		}
	}

	return nil
}
