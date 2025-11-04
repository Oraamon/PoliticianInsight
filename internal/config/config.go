package config

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config representa as configurações da aplicação
type Config struct {
	// Gemini
	GeminiAPIKey string `yaml:"GEMINI_API_KEY"`

	// Server
	Port string `yaml:"PORT"`

	// Firebase/Firestore
	FirebaseProjectID               string `yaml:"FIREBASE_PROJECT_ID"`
	FirebasePrivateKey              string `yaml:"FIREBASE_PRIVATE_KEY"`
	FirebaseClientEmail             string `yaml:"FIREBASE_CLIENT_EMAIL"`
	FirebaseClientID                string `yaml:"FIREBASE_CLIENT_ID"`
	FirebaseAuthURI                 string `yaml:"FIREBASE_AUTH_URI"`
	FirebaseTokenURI                string `yaml:"FIREBASE_TOKEN_URI"`
	FirebaseAuthProviderX509CertURL string `yaml:"FIREBASE_AUTH_PROVIDER_X509_CERT_URL"`
	FirebaseClientX509CertURL       string `yaml:"FIREBASE_CLIENT_X509_CERT_URL"`
	FirestoreCollection             string `yaml:"FIRESTORE_COLLECTION"`

	// Compatibilidade com variáveis antigas
	FirestoreProjectID string `yaml:"FIRESTORE_PROJECT_ID"`
}

// Load carrega as configurações do arquivo env.yaml ou variáveis de ambiente
func Load() (*Config, error) {
	cfg := &Config{
		Port:                            "3000",
		FirebaseAuthURI:                 "https://accounts.google.com/o/oauth2/auth",
		FirebaseTokenURI:                "https://oauth2.googleapis.com/token",
		FirebaseAuthProviderX509CertURL: "https://www.googleapis.com/oauth2/v1/certs",
		FirestoreCollection:             "nps_responses",
	}

	// Tentar ler env.yaml (tentar múltiplos caminhos)
	yamlPaths := []string{"env.yaml", "/root/env.yaml"}
	var yamlPath string
	var data []byte
	var err error

	for _, path := range yamlPaths {
		if _, statErr := os.Stat(path); statErr == nil {
			yamlPath = path
			data, err = os.ReadFile(path)
			if err == nil {
				break
			}
		}
	}

	if yamlPath != "" && err == nil {
		// Arquivo encontrado, fazer parse do YAML
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("erro ao fazer parse do env.yaml: %w", err)
		}
	} else {
		// Arquivo não encontrado, usar variáveis de ambiente (Cloud Run)
		cfg.GeminiAPIKey = os.Getenv("GEMINI_API_KEY")
		cfg.Port = os.Getenv("PORT")
		cfg.FirebaseProjectID = os.Getenv("FIREBASE_PROJECT_ID")
		cfg.FirestoreProjectID = os.Getenv("FIRESTORE_PROJECT_ID")
		cfg.FirebasePrivateKey = os.Getenv("FIREBASE_PRIVATE_KEY")
		cfg.FirebaseClientEmail = os.Getenv("FIREBASE_CLIENT_EMAIL")
		cfg.FirebaseClientID = os.Getenv("FIREBASE_CLIENT_ID")
		cfg.FirebaseAuthURI = os.Getenv("FIREBASE_AUTH_URI")
		cfg.FirebaseTokenURI = os.Getenv("FIREBASE_TOKEN_URI")
		cfg.FirebaseAuthProviderX509CertURL = os.Getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL")
		cfg.FirebaseClientX509CertURL = os.Getenv("FIREBASE_CLIENT_X509_CERT_URL")
		cfg.FirestoreCollection = os.Getenv("FIRESTORE_COLLECTION")

		// Valores padrão se não estiverem definidos
		if cfg.Port == "" {
			cfg.Port = "8080" // Padrão do Cloud Run
		}
		if cfg.FirebaseAuthURI == "" {
			cfg.FirebaseAuthURI = "https://accounts.google.com/o/oauth2/auth"
		}
		if cfg.FirebaseTokenURI == "" {
			cfg.FirebaseTokenURI = "https://oauth2.googleapis.com/token"
		}
		if cfg.FirebaseAuthProviderX509CertURL == "" {
			cfg.FirebaseAuthProviderX509CertURL = "https://www.googleapis.com/oauth2/v1/certs"
		}
		if cfg.FirestoreCollection == "" {
			cfg.FirestoreCollection = "nps_responses"
		}
	}

	// Compatibilidade: se FIREBASE_PROJECT_ID não estiver definido, usar FIRESTORE_PROJECT_ID
	if cfg.FirebaseProjectID == "" && cfg.FirestoreProjectID != "" {
		cfg.FirebaseProjectID = cfg.FirestoreProjectID
	}

	// Validar e corrigir ProjectID baseado no ClientEmail se necessário
	if cfg.FirebaseClientEmail != "" {
		// Extrair ProjectID do email da service account (formato: xxx@PROJECT_ID.iam.gserviceaccount.com)
		emailParts := strings.Split(cfg.FirebaseClientEmail, "@")
		if len(emailParts) == 2 {
			domainParts := strings.Split(emailParts[1], ".")
			if len(domainParts) > 0 {
				projectIDFromEmail := domainParts[0]
				// Se FIREBASE_PROJECT_ID não corresponde ao email, usar o do email
				if cfg.FirebaseProjectID != "" && cfg.FirebaseProjectID != projectIDFromEmail {
					// Se há conflito, priorizar o do email (mais confiável)
					cfg.FirebaseProjectID = projectIDFromEmail
				} else if cfg.FirebaseProjectID == "" {
					cfg.FirebaseProjectID = projectIDFromEmail
				}
			}
		}
	}

	// Se ainda não tem ProjectID, tentar usar FIRESTORE_PROJECT_ID
	if cfg.FirebaseProjectID == "" && cfg.FirestoreProjectID != "" {
		cfg.FirebaseProjectID = cfg.FirestoreProjectID
	}

	// Processar private key (remover escapes de \n)
	if cfg.FirebasePrivateKey != "" {
		cfg.FirebasePrivateKey = strings.ReplaceAll(cfg.FirebasePrivateKey, "\\n", "\n")
	}

	// PORT sempre deve ser lido da variável de ambiente se disponível (Cloud Run)
	if portEnv := os.Getenv("PORT"); portEnv != "" {
		cfg.Port = portEnv
	}

	return cfg, nil
}
