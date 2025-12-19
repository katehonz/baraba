FROM nimlang/nim:2.2.6-alpine as builder

# Install system dependencies
RUN apk add --no-cache \
    git \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy nimble files
COPY scanner_service.nimble ./
COPY ../baraba_shared/ ./baraba_shared/

# Install dependencies
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ ./src/

# Build the application
RUN nim c -d:ssl -d:release -o:bin/scanner_service src/scanner_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache libssl

# Create app user
RUN addgroup -g 1001 -S scanner && \
    adduser -u 1001 -S scanner -G scanner

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/scanner_service ./bin/scanner_service

# Change ownership
RUN chown -R scanner:scanner /app

# Switch to app user
USER scanner

# Expose port
EXPOSE 5001

# Run the application
CMD ["./bin/scanner_service"]