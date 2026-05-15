package com.pingeso.HUAP.Security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${app.jwt.secret:***JWT_SECRET_PURGADO***}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:86400000}") // 24 horas por defecto
    private long jwtExpirationMs;

    private final int PRE_AUTH_EXPIRATION = 5 * 60 * 1000;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Genera el token final con todo el contexto de trabajo. V2
     */
    public String generateToken(Long id, String rut, String rol, Long servicioId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(Long.toString(id))
                .claim("rut", rut)
                .claim("rol", rol)
                .claim("servicioId", servicioId)
                .claim("tipo", "FINAL") // <--- El marcador de seguridad
                .setIssuedAt(new Date())
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, jwtSecret)
                .compact();
    }

   /**
     * Genera un token temporal solo para seleccionar servicio. V2
     */
    public String generatePreAuthToken(Long idFuncionario) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + PRE_AUTH_EXPIRATION);

        return Jwts.builder()
                .subject(Long.toString(idFuncionario))
                .claim("tipo", "PRE_AUTH") // <--- El marcador de seguridad
                .issuedAt(new Date())
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extrae el ID del token de pre-auth validando su tipo. V2
     */
    public Long getUserIdFromPreAuthToken(String token) {
        Claims claims = Jwts.parser()           
            .verifyWith(getSigningKey())    
            .build()
            .parseSignedClaims(token)        
            .getPayload();                   

        String tipo = (String) claims.get("tipo");
        
        if (!"PRE_AUTH".equals(tipo)) {
            throw new RuntimeException("El token proporcionado no es de pre-autorización");
        }

        return Long.parseLong(claims.getSubject());
    }

    /**
     * Genera un token JWT para un usuario
     * legacy
    public String generateToken(Long userId, String rut, String rol, Long servicioId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("rut", rut)
                .claim("rol", rol)
                .claim("servicioId", servicioId)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }
    */


    /**
     * Obtiene el userId del token JWT
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Long.parseLong(claims.getSubject());
    }

    /**
     * Obtiene el RUT del token JWT
     */
    public String getRutFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("rut", String.class);
    }

    /**
     * Obtiene el rol del token JWT
     */
    public String getRolFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("rol", String.class);
    }

    /**
     * Obtiene el servicioId del token JWT
     */
    public Long getServicioIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Object servicioId = claims.get("servicioId");
        if (servicioId == null) return null;
        return Long.parseLong(servicioId.toString());
    }

    /**
     * Valida el token JWT
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException ex) {
            logger.error("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            logger.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            logger.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            logger.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            logger.error("JWT claims string is empty");
        }
        return false;
    }
}
