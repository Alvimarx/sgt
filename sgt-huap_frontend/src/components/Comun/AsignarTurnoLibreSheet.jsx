import React, { useEffect, useMemo, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTBadge, SGTIcon, Sheet } from '../Style/UIPrimitives';
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { asignarTurnoLibre, reasignarTurno, desasignarTurno } from '../../services/turnosService';
import { formatShiftLabel } from './ShiftDetail';

const MAX_SEARCH_LENGTH = 60;

const sanitizeQuery = (raw) => String(raw || '').replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);

const getNombreCompleto = (user) => {
  const nombre = user?.nombre || user?.primerNombre || '';
  const apellidoPaterno = user?.apellidoPaterno || user?.primerApellido || user?.apelPat || '';
  const apellidoMaterno = user?.apellidoMaterno || user?.segundoApellido || user?.apelMat || '';

  return `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.replace(/\s+/g, ' ').trim();
};

const getInitials = (nombre = '', apellido = '') => {
  const first = String(nombre).trim().charAt(0);
  const second = String(apellido).trim().charAt(0);
  return `${first}${second}`.toUpperCase() || 'U';
};

const normalizeFuncionario = (user) => {
  const nombre = user?.nombre || user?.primerNombre || '';
  const apellido = user?.apellidoPaterno || user?.primerApellido || user?.apelPat || '';
  const nombreCompleto = getNombreCompleto(user) || user?.nombreCompleto || 'Funcionario';

  return {
    id: user?.idFuncionario ?? user?.id ?? null,
    nombre: nombreCompleto,
    nombreBase: nombre,
    apellidoBase: apellido,
    rut: user?.rutCompleto || user?.rut || '',
    iniciales: user?.iniciales || getInitials(nombre, apellido),
    rol: user?.rol || user?.profesion || 'Funcionario',
    raw: user,
  };
};

const ConfirmDialog = ({
  tipoAccion,
  funcionario,
  shift,
  onConfirm,
  onCancel,
  guardando,
}) => {
  const PA = SGT_DATA.PALETTE;

  const textos = {
    ASIGNAR: {
      titulo: 'Confirmar asignación',
      descripcion: (
        <>
          ¿Deseas asignar a <strong style={{ color: PA.ink }}>{funcionario?.nombre}</strong> al turno{' '}
          <strong style={{ color: PA.ink }}>{formatShiftLabel(shift)}</strong>?
        </>
      ),
      boton: 'Confirmar',
      color: PA.primary,
    },
    REASIGNAR: {
      titulo: 'Confirmar reasignación',
      descripcion: (
        <>
          ¿Deseas reemplazar a <strong style={{ color: PA.ink }}>{shift?.nombreFuncionario || 'funcionario actual'}</strong>{' '}
          por <strong style={{ color: PA.ink }}>{funcionario?.nombre}</strong> en el turno{' '}
          <strong style={{ color: PA.ink }}>{formatShiftLabel(shift)}</strong>?
        </>
      ),
      boton: 'Reasignar',
      color: PA.primary,
    },
    DESASIGNAR: {
      titulo: 'Confirmar liberación',
      descripcion: (
        <>
          ¿Deseas quitar a <strong style={{ color: PA.ink }}>{shift?.nombreFuncionario || 'funcionario actual'}</strong>{' '}
          del turno <strong style={{ color: PA.ink }}>{formatShiftLabel(shift)}</strong>?
          <br />
          El turno quedará como cupo libre.
        </>
      ),
      boton: 'Quitar funcionario',
      color: '#B42318',
    },
  };

  const config = textos[tipoAccion] || textos.ASIGNAR;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: PA.ink,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {config.titulo}
        </div>

        <p
          style={{
            fontSize: 14,
            color: PA.ink2,
            fontWeight: 500,
            marginBottom: 20,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {config.descripcion}
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={guardando}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${PA.line}`,
              background: '#fff',
              fontSize: 15,
              fontWeight: 700,
              color: PA.ink2,
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.7 : 1,
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={guardando}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: config.color,
              fontSize: 15,
              fontWeight: 800,
              color: '#fff',
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.7 : 1,
            }}
          >
            {guardando ? 'Guardando...' : config.boton}
          </button>
        </div>
      </div>
    </div>
  );
};

const AsignarTurnoLibreSheet = ({
  open,
  shift,
  adminUserId,
  servicioId,
  onClose,
  onAssigned,
}) => {
  const PA = SGT_DATA.PALETTE;

  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [motivo, setMotivo] = useState('');

  const turnoAsignado = Boolean(shift?.idFuncionario);
  const turnoLibre = !turnoAsignado;

  const tituloSheet = turnoAsignado ? 'Editar asignación de turno' : 'Asignar turno libre';
  const textoBotonPrincipal = turnoAsignado ? 'Reasignar turno' : 'Asignar turno';

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    setLoading(true);
    setError('');
    setQuery('');
    setSelectedId(null);
    setMotivo('');
    setConfirmingAction(null);

    getFuncionariosSummary(servicioId).then((result) => {
      if (!mounted) return;

      if (result.success) {
        const lista = Array.isArray(result.data) ? result.data : [];
        setFuncionarios(lista.map(normalizeFuncionario).filter((item) => item.id != null));
      } else {
        setFuncionarios([]);
        setError(result.error || 'No se pudo cargar el personal del servicio activo.');
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [open, shift?.id, servicioId]);

  const handleSearchChange = (e) => {
    setQuery(sanitizeQuery(e.target.value));
    if (selectedId) setSelectedId(null);
  };

  const funcionariosFiltrados = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return funcionarios
      .filter((item) => String(item.id) !== String(shift?.idFuncionario))
      .filter((item) => {
        if (!cleanQuery) return true;

        const nombre = String(item.nombre || '').toLowerCase();
        const rut = String(item.rut || '').toLowerCase();

        return nombre.includes(cleanQuery) || rut.includes(cleanQuery);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }, [funcionarios, query, shift?.idFuncionario]);

  const seleccionado = useMemo(
    () => funcionarios.find((item) => String(item.id) === String(selectedId)) || null,
    [funcionarios, selectedId]
  );

  const handleSubmitAsignacion = async () => {
    if (!shift?.id || !selectedId || !adminUserId) return;

    setConfirmingAction(null);
    setSaving(true);
    setError('');

    const payload = {
      idTurno: shift.id,
      idNuevoMedico: Number(selectedId),
      idAdministrador: Number(adminUserId),
      motivo: motivo.trim(),
    };

    const result = turnoAsignado
      ? await reasignarTurno(payload)
      : await asignarTurnoLibre(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'No se pudo modificar la asignación del turno.');
      return;
    }

    onAssigned?.(result.data);
    onClose?.();
  };

  const handleSubmitDesasignar = async () => {
    if (!shift?.id || !adminUserId) return;

    setConfirmingAction(null);
    setSaving(true);
    setError('');

    const result = await desasignarTurno({
      idTurno: shift.id,
      idAdministrador: Number(adminUserId),
      motivo: motivo.trim(),
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'No se pudo quitar el funcionario del turno.');
      return;
    }

    onAssigned?.(result.data);
    onClose?.();
  };

  const abrirConfirmacionAsignacion = () => {
    if (!seleccionado) return;
    setConfirmingAction(turnoAsignado ? 'REASIGNAR' : 'ASIGNAR');
  };

  const abrirConfirmacionDesasignar = () => {
    if (!turnoAsignado) return;
    setConfirmingAction('DESASIGNAR');
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={() => {
          if (!saving) onClose?.();
        }}
        title={tituloSheet}
        maxHeight="90%"
      >
        {!shift ? null : (
          <div
            style={{
              padding: '0 16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              height: '100%',
            }}
          >
            <div
              style={{
                background: turnoAsignado ? '#F8FAFC' : PA.primarySoft,
                border: `1px solid ${PA.line2}`,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <SGTBadge tone={turnoLibre ? 'libre' : 'neutral'} size="xs">
                  {turnoLibre ? 'Cupo libre' : 'Turno asignado'}
                </SGTBadge>

                <span style={{ fontSize: 12, fontWeight: 800, color: PA.ink2 }}>
                  Gestión de asignación
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 900, color: PA.ink }}>
                {formatShiftLabel(shift)}
              </div>

              {turnoAsignado && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '9px 10px',
                    borderRadius: 12,
                    background: '#fff',
                    border: `1px solid ${PA.line2}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <SGTIcon name="user" size={15} color={PA.ink2} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>
                      Funcionario actual
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: PA.ink,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {shift.nombreFuncionario || 'Sin nombre'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="search-funcionario"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 900,
                  color: PA.ink2,
                  marginBottom: 6,
                }}
              >
                {turnoAsignado ? 'Buscar nuevo funcionario' : 'Buscar funcionario'}
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${PA.line2}`,
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: '#fff',
                }}
              >
                <SGTIcon name="search" size={16} color={PA.ink3} />
                <input
                  id="search-funcionario"
                  value={query}
                  onChange={handleSearchChange}
                  disabled={saving || loading}
                  placeholder="Nombre o RUT..."
                  maxLength={MAX_SEARCH_LENGTH}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: PA.ink,
                    background: 'transparent',
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#FFF4F5',
                  color: '#8C3F44',
                  border: '1px solid #F3D2D5',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: PA.ink3,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Resultados ({funcionariosFiltrados.length})
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {loading ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: PA.ink3, fontSize: 13, fontWeight: 700 }}>
                    Cargando personal...
                  </div>
                ) : funcionariosFiltrados.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: PA.ink3, fontSize: 13, fontWeight: 700 }}>
                    No hay resultados para tu búsqueda.
                  </div>
                ) : (
                  funcionariosFiltrados.map((funcionario) => {
                    const isSelected = String(funcionario.id) === String(selectedId);

                    return (
                      <button
                        key={funcionario.id}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : funcionario.id)}
                        disabled={saving}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: `1px solid ${isSelected ? PA.primary : PA.line2}`,
                          background: isSelected ? PA.primarySoft : '#fff',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        <SGTAvatar person={{ iniciales: funcionario.iniciales, rol: funcionario.rol }} size={34} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 900,
                              color: PA.ink,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {funcionario.nombre}
                          </div>

                          <div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 700, color: PA.ink3 }}>
                            {funcionario.rol} {funcionario.rut && `· ${funcionario.rut}`}
                          </div>
                        </div>

                        <SGTIcon
                          name={isSelected ? 'check-circle' : 'circle'}
                          size={18}
                          color={isSelected ? PA.primary : PA.line2}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${PA.line2}`, paddingTop: 16, marginTop: 'auto' }}>
              <label
                htmlFor="motivo-asignacion"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 900,
                  color: PA.ink2,
                  marginBottom: 6,
                }}
              >
                Observación (opcional)
              </label>

              <textarea
                id="motivo-asignacion"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, 180))}
                disabled={saving}
                rows={2}
                placeholder="Ej: Ajuste manual por administración..."
                style={{
                  width: '100%',
                  resize: 'none',
                  border: `1px solid ${PA.line2}`,
                  borderRadius: 14,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  background: '#fff',
                }}
              />

              {turnoAsignado && (
                <button
                  type="button"
                  onClick={abrirConfirmacionDesasignar}
                  disabled={saving}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    borderRadius: 14,
                    border: '1px solid #FDA29B',
                    background: '#FFF4F5',
                    color: '#B42318',
                    fontSize: 14,
                    fontWeight: 900,
                    padding: '12px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <SGTIcon name="trash" size={15} color="#B42318" />
                  Quitar funcionario y dejar vacante
                </button>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    border: `1px solid ${PA.line2}`,
                    background: '#fff',
                    color: PA.ink2,
                    fontSize: 14,
                    fontWeight: 800,
                    padding: '12px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={abrirConfirmacionAsignacion}
                  disabled={saving || !seleccionado}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    border: 'none',
                    background: saving || !seleccionado ? PA.ink3 : PA.primary,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 900,
                    padding: '12px',
                    cursor: saving || !seleccionado ? 'not-allowed' : 'pointer',
                    opacity: saving || !seleccionado ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : textoBotonPrincipal}
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {confirmingAction === 'ASIGNAR' && seleccionado && (
        <ConfirmDialog
          tipoAccion="ASIGNAR"
          funcionario={seleccionado}
          shift={shift}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={handleSubmitAsignacion}
          guardando={saving}
        />
      )}

      {confirmingAction === 'REASIGNAR' && seleccionado && (
        <ConfirmDialog
          tipoAccion="REASIGNAR"
          funcionario={seleccionado}
          shift={shift}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={handleSubmitAsignacion}
          guardando={saving}
        />
      )}

      {confirmingAction === 'DESASIGNAR' && (
        <ConfirmDialog
          tipoAccion="DESASIGNAR"
          shift={shift}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={handleSubmitDesasignar}
          guardando={saving}
        />
      )}
    </>
  );
};

export default AsignarTurnoLibreSheet;