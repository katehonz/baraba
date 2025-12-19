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
COPY vat_service.nimble ./
COPY ../baraba_shared/ ./baraba_shared/

# Install dependencies
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ ./src/

# Build the application
RUN nim c -d:ssl -d:release -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/vat_service src/vat_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libssl \
    postgresql-client

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