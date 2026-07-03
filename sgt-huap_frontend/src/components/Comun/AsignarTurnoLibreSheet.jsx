import React, { useEffect, useMemo, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTAvatar, SGTBadge, SGTIcon, Sheet } from '../Style/UIPrimitives';
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { asignarTurnoLibre } from '../../services/turnosService';
import { formatShiftLabel } from './ShiftDetail';

const MAX_SEARCH_LENGTH = 60;

const sanitizeQuery = (raw) => String(raw || '').replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);
const getNombreCompleto = (user) => `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim();

const getInitials = (nombre = '', apellido = '') => {
  const first = String(nombre).trim().charAt(0);
  const second = String(apellido).trim().charAt(0);
  return `${first}${second}`.toUpperCase() || 'U';
};

const normalizeFuncionario = (user) => {
  const nombre = user?.nombre || user?.primerNombre || '';
  const apellido = user?.apellidoPaterno || user?.primerApellido || '';
  const nombreCompleto = getNombreCompleto(user) || user?.nombreCompleto || 'Funcionario';

  return {
    id: user?.idFuncionario ?? null,
    nombre: nombreCompleto,
    nombreBase: nombre,
    apellidoBase: apellido,
    rut: user?.rutCompleto || '',
    iniciales: user?.iniciales || getInitials(nombre, apellido),
    raw: user,
  };
};

const ConfirmDialog = ({ funcionario, shift, onConfirm, onCancel, guardando }) => {
  const PA = SGT_DATA.PALETTE;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
      background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        width: '100%', maxWidth: '360px', background: '#fff', borderRadius: '20px',
        padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: PA.ink, marginBottom: 12, textAlign: 'center' }}>
          Confirmar asignación
        </div>
        <p style={{ fontSize: 14, color: PA.ink2, fontWeight: 500, marginBottom: 20, lineHeight: 1.5, textAlign: 'center' }}>
          ¿Deseas asignar a <strong style={{ color: PA.ink }}>{funcionario?.nombre}</strong> al turno{' '}
          <strong style={{ color: PA.ink }}>{formatShiftLabel(shift)}</strong>?
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={guardando}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${PA.line}`,
              background: '#fff', fontSize: 15, fontWeight: 700, color: PA.ink2,
              cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={guardando}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: PA.primary, fontSize: 15, fontWeight: 800, color: '#fff',
              cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1
            }}
          >
            {guardando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AsignarTurnoLibreSheet = ({ open, shift, adminUserId, servicioId, onClose, onAssigned }) => {
  const PA = SGT_DATA.PALETTE;
  
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [motivo, setMotivo] = useState('');

  // Limpiar estado al cerrar o cambiar turno
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    
    setLoading(true);
    setError('');
    setQuery('');
    setSelectedId(null);
    setMotivo('');
    setConfirming(false);

    getFuncionariosSummary(servicioId).then((result) => {
      if (!mounted) return;
      if (result.success) {
        const lista = Array.isArray(result.data) ? result.data : [];
        setFuncionarios(lista.map(normalizeFuncionario).filter(item => item.id != null));
      } else {
        setFuncionarios([]);
        setError(result.error || 'No se pudo cargar el personal del servicio activo.');
      }
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [open, shift?.id, servicioId]);

  // Manejo seguro del input de búsqueda (limpia la selección si el usuario vuelve a buscar)
  const handleSearchChange = (e) => {
    setQuery(sanitizeQuery(e.target.value));
    if (selectedId) setSelectedId(null); 
  };

  const funcionariosFiltrados = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return funcionarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    return funcionarios
      .filter(item => {
        const nombre = String(item.nombre || '').toLowerCase();
        const rut = String(item.rut || '').toLowerCase();
        return nombre.includes(cleanQuery) || rut.includes(cleanQuery);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }, [funcionarios, query]);

  const seleccionado = useMemo(
    () => funcionarios.find((item) => String(item.id) === String(selectedId)) || null,
    [funcionarios, selectedId]
  );

  const handleSubmit = async () => {
    if (!shift?.id || !selectedId || !adminUserId) return;
    
    setConfirming(false);
    setSaving(true);
    setError('');

    console.log(selectedId);

    const result = await asignarTurnoLibre({
      idTurno: shift.id,
      idNuevoMedico: Number(selectedId),
      idAdministrador: Number(adminUserId),
      motivo: motivo.trim(),
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'No se pudo asignar el turno.');
      return;
    }

    onAssigned?.(result.data);
    onClose?.();
  };

  return (
    <>
      <Sheet open={open} onClose={() => { if (!saving) onClose?.(); }} title="Asignar turno libre" maxHeight="90%">
        {!shift ? null : (
          <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            
            {/* Cabecera del turno */}
            <div style={{ background: PA.primarySoft, border: `1px solid ${PA.line2}`, borderRadius: 16, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SGTBadge tone="libre" size="xs">Cupo libre</SGTBadge>
                <span style={{ fontSize: 12, fontWeight: 800, color: PA.ink2 }}>Asignación de personal</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: PA.ink }}>{formatShiftLabel(shift)}</div>
            </div>

            {/* Buscador */}
            <div>
              <label htmlFor="search-funcionario" style={{ display: 'block', fontSize: 12, fontWeight: 900, color: PA.ink2, marginBottom: 6 }}>
                Buscar funcionario
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${PA.line2}`, borderRadius: 14, padding: '10px 12px', background: '#fff' }}>
                <SGTIcon name="search" size={16} color={PA.ink3} />
                <input
                  id="search-funcionario"
                  value={query}
                  onChange={handleSearchChange}
                  disabled={saving || loading}
                  placeholder="Nombre o RUT..."
                  maxLength={MAX_SEARCH_LENGTH}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13.5, fontWeight: 700, color: PA.ink, background: 'transparent' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FFF4F5', color: '#8C3F44', border: '1px solid #F3D2D5', fontSize: 12.5, fontWeight: 700 }}>
                {error}
              </div>
            )}

            {/* Lista de resultados (con flex-grow para ocupar el espacio disponible correctamente) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', marginBottom: 8 }}>
                Resultados ({funcionariosFiltrados.length})
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
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
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderRadius: 14, border: `1px solid ${isSelected ? PA.primary : PA.line2}`,
                          background: isSelected ? PA.primarySoft : '#fff', cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <SGTAvatar person={{ iniciales: funcionario.iniciales, rol: funcionario.rol }} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 900, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {funcionario.nombre}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 700, color: PA.ink3 }}>
                            {funcionario.rol} {funcionario.rut && `· ${funcionario.rut}`}
                          </div>
                        </div>
                        <SGTIcon name={isSelected ? 'check-circle' : 'circle'} size={18} color={isSelected ? PA.primary : PA.line2} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Observación y Acciones (Fijas al fondo) */}
            <div style={{ borderTop: `1px solid ${PA.line2}`, paddingTop: 16, marginTop: 'auto' }}>
              <label htmlFor="motivo-asignacion" style={{ display: 'block', fontSize: 12, fontWeight: 900, color: PA.ink2, marginBottom: 6 }}>
                Observación (Opcional)
              </label>
              <textarea
                id="motivo-asignacion"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, 180))}
                disabled={saving || !seleccionado}
                rows={2}
                placeholder={seleccionado ? "Ej: Solicitado por contingencia..." : "Selecciona un funcionario primero"}
                style={{ width: '100%', resize: 'none', border: `1px solid ${PA.line2}`, borderRadius: 14, padding: '10px 12px', fontSize: 13, fontWeight: 600, outline: 'none', background: seleccionado ? '#fff' : '#f8f9fa', opacity: seleccionado ? 1 : 0.6 }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    flex: 1, borderRadius: 14, border: `1px solid ${PA.line2}`, background: '#fff', color: PA.ink2,
                    fontSize: 14, fontWeight: 800, padding: '12px', cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={saving || !seleccionado}
                  style={{
                    flex: 1, borderRadius: 14, border: 'none', background: saving || !seleccionado ? PA.ink3 : PA.primary,
                    color: '#fff', fontSize: 14, fontWeight: 900, padding: '12px', 
                    cursor: saving || !seleccionado ? 'not-allowed' : 'pointer', opacity: saving || !seleccionado ? 0.7 : 1
                  }}
                >
                  {saving ? 'Asignando...' : 'Asignar turno'}
                </button>
              </div>
            </div>

          </div>
        )}
      </Sheet>

      {confirming && seleccionado && (
        <ConfirmDialog
          funcionario={seleccionado}
          shift={shift}
          onCancel={() => setConfirming(false)}
          onConfirm={handleSubmit}
          guardando={saving}
        />
      )}
    </>
  );
};

export default AsignarTurnoLibreSheet;