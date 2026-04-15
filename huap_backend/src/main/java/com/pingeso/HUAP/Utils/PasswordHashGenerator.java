package com.pingeso.HUAP.Utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utilidad para generar contraseñas hasheadas con BCrypt
 * Usar para crear contraseñas de usuarios manualmente
 * 
 * Ejecutar: java PasswordHashGenerator.java "miPassword"
 */
public class PasswordHashGenerator {
    
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Uso: java PasswordHashGenerator <password>");
            System.out.println("Ejemplo: java PasswordHashGenerator huap2025");
            return;
        }

        String password = args[0];
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashedPassword = encoder.encode(password);

        System.out.println("═══════════════════════════════════════════════");
        System.out.println("Password Hash Generator - Sistema HUAP");
        System.out.println("═══════════════════════════════════════════════");
        System.out.println("Password original: " + password);
        System.out.println("Password hasheada: " + hashedPassword);
        System.out.println("═══════════════════════════════════════════════");
        System.out.println("\nSQL para actualizar en BD:");
        System.out.println("UPDATE personal SET clave = '" + hashedPassword + "' WHERE rut = 'TU_RUT_AQUI';");
        System.out.println("═══════════════════════════════════════════════");
    }
}
