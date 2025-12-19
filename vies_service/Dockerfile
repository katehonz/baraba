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
COPY vies_service.nimble ./

# Install dependencies
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ ./src/

# Build the application
RUN nim c -d:ssl -d:release -o:bin/vies_service src/vies_service.nim

# Final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache libssl

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