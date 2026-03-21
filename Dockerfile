# Build stage
FROM maven:3-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
COPY core/pom.xml core/
COPY auth/pom.xml auth/
COPY transactions/pom.xml transactions/
COPY insights/pom.xml insights/
COPY ml/pom.xml ml/
COPY api-gateway/pom.xml api-gateway/

# Download dependencies
RUN mvn dependency:go-offline -B -q || true

COPY . .
# Build, then copy the Spring Boot *fat* JAR only (exclude *-plain.jar or glob picks wrong file).
RUN mvn package -pl api-gateway -am -DskipTests -B -q && \
    JAR_PATH=$(ls /app/api-gateway/target/*.jar | grep -v -- '-plain.jar$') && \
    test -f "$JAR_PATH" && cp "$JAR_PATH" /app/app.jar

# Runtime stage with Tesseract for receipt OCR
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

WORKDIR /app
COPY --from=builder /app/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
