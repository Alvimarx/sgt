# Etapa 1: Construcción (Maven con Java 21)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (Java 21 Alpine)
# SEC (L-08): JRE en vez de JDK — el runtime no necesita compilador ni herramientas de
# desarrollo (javac, jdb, jstack), que solo amplían la superficie útil a un atacante
# post-explotación.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# SEC-008: correr como usuario sin privilegios, no como root.
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]