# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

# Copy pom.xml first for dependency caching
COPY pom.xml .

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install fonts for PDF processing (Cyrillic support)
RUN apk add --no-cache \
    fontconfig \
    ttf-dejavu \
    && fc-cache -f

# Create non-root user
RUN addgroup -g 1000 scanner && \
    adduser -u 1000 -G scanner -D scanner

# Create directories
RUN mkdir -p /tmp/scanner-uploads && \
    chown -R scanner:scanner /tmp/scanner-uploads

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar
RUN chown scanner:scanner app.jar

USER scanner

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# JVM options for container
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
