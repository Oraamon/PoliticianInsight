FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chatbot main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=backend-builder /app/chatbot .

COPY --from=frontend-builder /app/frontend/dist ./public

RUN touch .env

EXPOSE 3000

CMD ["./chatbot"]

