package com.pingeso.HUAP.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FuncionarioService {

    private static final Logger logger = LoggerFactory.getLogger(FuncionarioService.class);

    private final PasswordEncoder passwordEncoder;

    private final FuncionarioRepository funcionarioRepository;

    public FuncionarioEntity authenticateWithPassword(String rut, String password){

        if (rut == null || rut.isBlank()) throw new IllegalArgumentException("El argumento rut es obligatorio");

        if (password == null || password.isBlank()) throw new IllegalArgumentException("El argumento password es obligatorio");


        String rutSinDv = rut.length() > 1 ? rut.substring(0, rut.length() - 1) : rut;

        // Buscar al usuario con el rut
        FuncionarioEntity usuario = funcionarioRepository.findByRut(rutSinDv);

        // Esto es traido directo de la version legacy, evaluar si se mantiene
        if (usuario == null){
            usuario = funcionarioRepository.findByRut(rut);
        }
        
        if (usuario == null){
            logger.warn("No se encontró registro para el RUT: {}", rut);
            throw new RuntimeException("No se encontró registro para el RUT provisto");
        }


        //Logica de AUTENTICACIÓN
        if (usuario.getEstado() == 1){
            if (passwordEncoder.matches(password, usuario.getClave())){
                return usuario;
            }
        }

        logger.warn("Contraseña incorrecta o sin perfiles activos para RUT: {}", rut);
        return null;
    }
    
}
