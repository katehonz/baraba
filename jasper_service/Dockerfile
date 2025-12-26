# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install fonts for PDF generation (including Cyrillic support)
RUN apk add --no-cache fontconfig ttf-dejavu ttf-liberation font-noto

# Create non-root user
RUN addgroup -g 1001 -S jasper && \
    adduser -u 1001 -S jasper -G jasper

# Copy the built JAR
COPY --from=builder /app/target/*.jar app.jar

# Create reports directory
RUN mkdir -p /app/reports && chown -R jasper:jasper /app

USER jasper

EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5005/api/reports/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
