FROM nimlang/nim:2.2.6-alpine as builder

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
COPY identity_service.nimble ./
COPY ../baraba_shared/ ./baraba_shared/

# Install dependencies
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ ./src/

# Build the application
RUN nim c -d:ssl -d:release -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/identity_service src/identity_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libssl \
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