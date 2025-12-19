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
COPY baraba.nimble ./
COPY baraba_shared/ ./baraba_shared/

# Install dependencies
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ ./src/

# Build the application
RUN nim c -d:ssl -d:release --threads:on -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libssl \
    postgresql-client

# Create app user
RUN addgroup -g 1001 -S baraba && \
    adduser -u 1001 -S baraba -G baraba

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/baraba ./bin/baraba

# Change ownership
RUN chown -R baraba:baraba /app

# Switch to app user
USER baraba

# Expose port
EXPOSE 5000

# Run the application
CMD ["./bin/baraba"]