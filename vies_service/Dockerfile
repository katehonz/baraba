FROM nimlang/nim:2.2.2-alpine-regular as builder

# Install system dependencies
RUN apk add --no-cache \
    git \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy nimble files and vendor
COPY vies_service/vies_service.nimble ./

# Copy source code and vendor
COPY vies_service/src/ ./src/
COPY src/vendor/ ./vendor/

# Copy baraba_shared
COPY baraba_shared/ ./baraba_shared/

# Install nimble dependencies (including JWT)
RUN nimble install -y https://github.com/katehonz/jwt-nim-baraba

# Build the application (using vendor jester/httpbeast)
RUN nim c -d:ssl -d:release -p:vendor/httpbeast/src -p:vendor/jester -p:baraba_shared/src -o:bin/vies_service src/vies_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache libssl3 libcrypto3

# Create app user
RUN addgroup -g 1001 -S vies && \
    adduser -u 1001 -S vies -G vies

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/vies_service ./bin/vies_service

# Change ownership
RUN chown -R vies:vies /app

# Switch to app user
USER vies

# Expose port
EXPOSE 5003

# Run the application
CMD ["./bin/vies_service"]