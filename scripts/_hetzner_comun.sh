# ==============================================================
# Piezas comunes de los scripts de la VM de Hetzner. No se ejecuta solo:
# lo cargan desplegar_frontend_hetzner.sh y desplegar_backend_hetzner.sh,
# que antes definen RAIZ (raíz del repo).
#
# Variables:
#   SSH_HOST    alias o usuario@host de la VM   (por defecto efeso)
#   DIR_REMOTO  carpeta del repo en la VM       (por defecto /opt/sgt)
# ==============================================================

SSH_HOST="${SSH_HOST:-efeso}"
DIR_REMOTO="${DIR_REMOTO:-/opt/sgt}"

# GitHub manda: lo que se despliega tiene que estar subido y ser igual a la
# rama de GitHub que sigue la rama local. Deja esa rama en RAMA_GH.
# Uso: exigir_subido <ruta>...   (pathspecs de git; acepta exclusiones ':!ruta')
exigir_subido() {
  local upstream
  if ! upstream=$(git -C "$RAIZ" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null); then
    echo "✗ La rama $(git -C "$RAIZ" branch --show-current) no sigue ninguna rama de GitHub." >&2
    exit 1
  fi
  git -C "$RAIZ" fetch -q origin
  # Una carpeta que solo está atrasada respecto de GitHub, sin commits ni cambios
  # propios (como ~/Projects/SGT-ramas/despliegue), se pone al día sola.
  if [[ -z "$(git -C "$RAIZ" status --porcelain --untracked-files=no)" ]] \
     && [[ "$(git -C "$RAIZ" rev-list --count "$upstream..HEAD")" == 0 ]] \
     && [[ "$(git -C "$RAIZ" rev-list --count "HEAD..$upstream")" != 0 ]]; then
    echo "→ Trayendo lo último de $upstream"
    git -C "$RAIZ" merge -q --ff-only "$upstream"
  fi
  if ! git -C "$RAIZ" diff --quiet "$upstream" HEAD -- "$@"; then
    echo "✗ Lo que se va a desplegar no es igual a $upstream:" >&2
    git -C "$RAIZ" diff --stat "$upstream" HEAD -- "$@" >&2
    echo "  Sube primero esos cambios a GitHub (o trae los de GitHub) y vuelve a correr el script." >&2
    exit 1
  fi
  if [[ -n "$(git -C "$RAIZ" status --porcelain -- "$@")" ]]; then
    echo "⚠ Hay cambios sin commit: se despliega el último commit, no el árbol de trabajo." >&2
  fi
  RAMA_GH="${upstream#origin/}"
}

# Pone el checkout de la VM en la rama de GitHub (compose, configuración de
# Apache, scripts y SQL). No construye nada allá. Si el checkout tiene cambios
# locales en archivos versionados, no lo toca y se detiene.
actualizar_checkout_vm() {
  echo "→ Poniendo al día el checkout de la VM ($DIR_REMOTO) con origin/$RAMA_GH"
  ssh "$SSH_HOST" bash -s -- "$DIR_REMOTO" "$RAMA_GH" <<'REMOTO'
set -euo pipefail
cd "$1"
rama="$2"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "✗ El checkout de la VM tiene cambios locales; no lo toco:" >&2
  git status --short --untracked-files=no >&2
  exit 1
fi
antes=$(git log -1 --format='%h')
git fetch -q origin "$rama"
if [[ "$(git branch --show-current)" != "$rama" ]]; then
  git checkout -q "$rama" 2>/dev/null || git checkout -q -b "$rama" --track "origin/$rama"
fi
git merge -q --ff-only "origin/$rama"
echo "  VM: $antes → $(git log -1 --format='%h %s')"
REMOTO
}
