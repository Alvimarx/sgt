# BITÁCORA — SGT-HUAP

## 2026-08-18 · Sesión remota claude.ai/code
- Usuario clonó el repo desde GitLab y lo subió a github.com/Alvimarx/sgt (`main` con la
  historia completa, force-push sobre el squash "Clon"). Rama de trabajo:
  `claude/gitlab-repo-clone-mmcq8a`, alineada a ese main.
- **Fase 1 (comprensión) completada** → ver `BRIEF.md`.
- Pedido del usuario: desplegar el sistema. La BD debe vivir en (A) la VM Hetzner que ya
  corre otro sistema en Docker, o (B) un servicio con capa gratuita. Quiere pros/cons,
  análisis completo y plan.
- Hallazgo clave: las BDs "reales" de dev están en IP privada 10.6.15.193 → desde la nube
  hay que hostear `gestionturnos` + stand-in `innhosp` propios.
- Este contenedor remoto NO tiene Docker daemon (solo cliente) → validación local limitada
  a compilación/unit tests; el stack completo se prueba en la VM.
- Nota de proceso: `.pilot/` se VERSIONA en esta rama (el contenedor es efímero; git es la
  única persistencia), desviación consciente del default del skill.
- Deuda anotada: `node_modules/`+`.idea/` versionados; README de BaseDatosMySQL nombra
  `datos_gestionturnos.sql` inexistente (real: `poblado_urgencias_gestionturnos.sql`).

## Checkpoint F0 — PENDIENTE decisión del usuario
1. Opción A (todo en VM Hetzner) vs B (DBaaS free tier). Recomendación: A.
2. Specs de la VM (modelo/RAM/CPU/disco libre) y qué corre el otro sistema
   (¿nginx/traefik/caddy en 80/443?).
3. ¿Datos demo o datos reales de personal? (impacta dónde pueden vivir y el seed).
4. ¿Dominio/subdominio disponible para HTTPS?
