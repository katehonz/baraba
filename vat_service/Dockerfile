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
COPY vat_service/vat_service.nimble ./
COPY baraba_shared/ ./baraba_shared/

# Install only packages not in vendor
RUN nimble install -y json_serialization checksums db_connector https://github.com/katehonz/jwt-nim-baraba

# Copy source code and vendor
COPY vat_service/src/ ./src/
COPY src/vendor/ ./vendor/

# Build the application
RUN nim c -d:ssl -d:release -p:baraba_shared/src -p:vendor/httpbeast/src -p:vendor/jester -p:baraba_shared/vendor/orm-baraba/src -p:baraba_shared/vendor/lowdb_baraba -o:bin/vat_service src/vat_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libssl3 \
    libcrypto3 \
    postgresql-client \
    pcre

# Create app user
RUN addgroup -g 1001 -S vat && \
    adduser -u 1001 -S vat -G vat

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/vat_service ./bin/vat_service

# Change ownership
RUN chown -R vat:vat /app

# Switch to app user
USER vat

# Expose port
EXPOSE 5004

# Run the application
CMD ["./bin/vat_service"]