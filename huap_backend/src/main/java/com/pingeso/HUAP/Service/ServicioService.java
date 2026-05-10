package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.ServicioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ServicioService {

    private final ServicioRepository servicioRepository;

    public ServicioService(ServicioRepository servicioRepository) {
        this.servicioRepository = servicioRepository;
    }

    public List<ServicioEntity> obtenerTodos() {
        return servicioRepository.findAll();
    }

    public Optional<ServicioEntity> obtenerPorId(Long idServicio) {
        return servicioRepository.findById(idServicio);
    }

    public Optional<ServicioEntity> obtenerPorNombre(String nombre) {
        return servicioRepository.findByNombre(nombre);
    }

    public ServicioEntity crearServicio(ServicioEntity servicio) {
        if (servicioRepository.existsByNombre(servicio.getNombre())) {
            throw new IllegalArgumentException("Ya existe un servicio con ese nombre.");
        }

        return servicioRepository.save(servicio);
    }

    public ServicioEntity actualizarServicio(Long idServicio, ServicioEntity servicioActualizado) {
        ServicioEntity servicioExistente = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new IllegalArgumentException("No existe un servicio con el ID indicado."));

        if (!servicioExistente.getNombre().equals(servicioActualizado.getNombre())
                && servicioRepository.existsByNombre(servicioActualizado.getNombre())) {
            throw new IllegalArgumentException("Ya existe otro servicio con ese nombre.");
        }

        servicioExistente.setNombre(servicioActualizado.getNombre());

        return servicioRepository.save(servicioExistente);
    }

    public void eliminarServicio(Long idServicio) {
        if (!servicioRepository.existsById(idServicio)) {
            throw new IllegalArgumentException("No existe un servicio con el ID indicado.");
        }

        servicioRepository.deleteById(idServicio);
    }
}