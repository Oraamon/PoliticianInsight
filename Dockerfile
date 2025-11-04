FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

FROM golang:1.23-alpine AS backend-builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./

RUN go mod download

COPY . .

# Build incluindo todos os arquivos .go necessários
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chatbot ./main.go ./nps_store_firestore.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=backend-builder /app/chatbot .

COPY --from=frontend-builder /app/frontend/dist ./public

# Copiar env.yaml se existir (opcional, pode ser montado via volume)
COPY env.yaml* ./

EXPOSE 3000

CMD ["./chatbot"]

