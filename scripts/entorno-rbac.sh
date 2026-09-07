#!/usr/bin/env bash
# Credenciales e identificadores de la suite RBAC de Playwright.
#
# `tests/rbac/helpers.ts` los exige por entorno y falla en seco si falta uno
# («Falta la variable de entorno RBAC_FULL_ADMIN_EMAIL»). No estaban en ningún
# fichero del repositorio: vivían en la sesión de quien lanzaba la suite a
# mano, así que `scripts/verificar_portal.sh` NO PODÍA ejecutarla aunque
# quisiera — que es parte de por qué el «único veredicto» del portal no
# ejecutaba ni una prueba del panel.
#
# NO contiene ninguna contraseña. La única que hace falta es la de la siembra
# de desarrollo, que se lee de `SEED_DEV_PASSWORD` del `.env` del API (el mismo
# valor con el que `scripts/seed_portal_audit.py` creó estas siete cuentas).
# Contra un entorno que no sea el de desarrollo, exporta tú las variables antes
# de llamar a este guion y no se tocan.
#
#   source scripts/entorno-rbac.sh && pnpm test:rbac
#
set -u

API_DIR="${API_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../gqm-api" 2>/dev/null && pwd)}"

if [ -z "${SEED_DEV_PASSWORD:-}" ] && [ -f "$API_DIR/.env" ]; then
  SEED_DEV_PASSWORD=$(grep -m1 '^SEED_DEV_PASSWORD=' "$API_DIR/.env" | cut -d= -f2- | tr -d '"'"'"'')
fi

if [ -z "${SEED_DEV_PASSWORD:-}" ]; then
  echo "entorno-rbac: no encuentro SEED_DEV_PASSWORD (ni en el entorno ni en $API_DIR/.env)" >&2
  echo "  exporta SEED_DEV_PASSWORD, o API_DIR=/ruta/al/gqm-api" >&2
  return 1 2>/dev/null || exit 1
fi

# Las siete cuentas de `scripts/seed_portal_audit.py`: los cuatro roles del
# nucleo mas los tres que anadio la auditoria de portal para tener «el otro
# lado» contra el que probar — un segundo subcontratista, un tecnico suyo, y un
# tecnico SIN subcontratista (ID_Subcontractor NULL).
export RBAC_FULL_ADMIN_EMAIL="admin-dev@senavia-test.com"
export RBAC_GQM_MEMBER_EMAIL="member-dev@senavia-test.com"
export RBAC_SUBCONTRACTOR_EMAIL="sub-dev@senavia-test.com"
export RBAC_TECHNICAL_EMAIL="tech-dev@senavia-test.com"
export RBAC_SUB_B_EMAIL="sub-b-dev@senavia-test.com"
export RBAC_TECH_DE_SUB_B_EMAIL="tech-b-dev@senavia-test.com"
export RBAC_TECH_INDEPENDIENTE_EMAIL="tech-indep-dev@senavia-test.com"

for _rol in FULL_ADMIN GQM_MEMBER SUBCONTRACTOR TECHNICAL SUB_B TECH_DE_SUB_B TECH_INDEPENDIENTE; do
  export "RBAC_${_rol}_PASSWORD=$SEED_DEV_PASSWORD"
done
unset _rol

export RBAC_SUB_ID="${RBAC_SUB_ID:-SUBC60001}"
export RBAC_SUB_B_ID="${RBAC_SUB_B_ID:-SUBC60002}"
export RBAC_JOB_ID="${RBAC_JOB_ID:-QID-I60001}"
export RBAC_JOB_B_ID="${RBAC_JOB_B_ID:-PTL-I60001}"
export RBAC_JOB_ID_TASKS="${RBAC_JOB_ID_TASKS:-QID-I60029}"
export RBAC_TECHNICAL_ID="${RBAC_TECHNICAL_ID:-TEC60001}"   # tecnico de SUBC60001
export RBAC_TEC_B_ID="${RBAC_TEC_B_ID:-TEC60002}"           # tecnico de SUBC60002

# ── Comprobacion del propio wrapper ─────────────────────────────────────────
# Enumera las RBAC_* que la suite lee de verdad y avisa de las que falten. Este
# fichero nacio incompleto —le faltaban RBAC_TECHNICAL_ID y RBAC_TEC_B_ID— y el
# sintoma fue dos pruebas en rojo por «falta la variable», que se parece
# muchisimo a dos pruebas en rojo por un fallo del producto. Contar no vale: se
# enumeran los nombres para que el mensaje diga cual.
_dir_pruebas="$(dirname "${BASH_SOURCE[0]}")/../tests/rbac"
if [ -d "$_dir_pruebas" ]; then
  _faltan=""
  for _v in $(grep -rhoE 'RBAC_[A-Z_]+' "$_dir_pruebas" | sort -u); do
    [ "$_v" = "RBAC_STATE_DIR" ] && continue   # lo pone quien lanza la suite
    [ -z "${!_v:-}" ] && _faltan="$_faltan $_v"
  done
  if [ -n "$_faltan" ]; then
    echo "entorno-rbac: la suite lee variables que este guion no exporta:$_faltan" >&2
    return 1 2>/dev/null || exit 1
  fi
  unset _faltan _v
fi
unset _dir_pruebas
