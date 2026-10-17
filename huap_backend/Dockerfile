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

# P-01: la hora del hospital. Sin esto la JVM corre en UTC y, de 21:00 a 24:00 en horario de
# verano (de 20:00 a 24:00 en invierno), «hoy», «futuros», R14 y las vigencias se corren un día.
# Java trae su propia base de zonas horarias: no hace falta instalar tzdata en Alpine.
ENV TZ=America/Santiago

# SEC-008: correr como usuario sin privilegios, no como root.
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]