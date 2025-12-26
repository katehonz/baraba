FROM nimlang/nim:2.2.2-alpine-regular as builder

# Install system dependencies
RUN apk add --no-cache \
    git \
    postgresql-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy nimble files
COPY identity_service/identity_service.nimble ./
COPY baraba_shared/ ./baraba_shared/

# Install only packages not in vendor
RUN nimble install -y json_serialization checksums db_connector https://github.com/katehonz/jwt-nim-baraba

# Copy source code and vendor
COPY identity_service/src/ ./src/
COPY src/vendor/ ./vendor/

# Build the application
RUN nim c -d:ssl -d:release -p:baraba_shared/src -p:vendor/httpbeast/src -p:vendor/jester -p:baraba_shared/vendor/orm-baraba/src -p:baraba_shared/vendor/lowdb_baraba -o:bin/identity_service src/identity_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libssl3 \
    libcrypto3 \
    postgresql-client

# Create app user
RUN addgroup -g 1001 -S identity && \
    adduser -u 1001 -S identity -G identity

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/identity_service ./bin/identity_service

# Change ownership
RUN chown -R identity:identity /app

# Switch to app user
USER identity

# Expose port
EXPOSE 5002

# Run the application
CMD ["./bin/identity_service"]