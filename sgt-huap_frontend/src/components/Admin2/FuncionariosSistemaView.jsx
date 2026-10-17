import React, { useEffect, useRef, useState } from 'react';
import { SGT_DATA, DASHBOARD_ICON_THEMES } from './data'; // Ajusta la ruta según tu estructura
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';
import { usePagination, PaginationControls, ListEmptyState, LoadingState } from '../Style/ListControls';
import { getServicios } from '../../services/servicioService';
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, TablaDesktop, BuscadorDesktop, PersonaDesktop } from '../Desktop/ui';
import { PaginacionDesktop } from '../Desktop/gestion/PaginacionDesktop';
import { AvisoMantenedorDesktop, RolesServicioDesktop } from '../Desktop/admin/PiezasMantenedoresDesktop';

const AVATAR_THEME = DASHBOARD_ICON_THEMES.green;

// Desktop (R18): filas por página de la tabla y colores del avatar, los mismos
// de "Personal del servicio": jefatura, urgenciólogo o médico.
const POR_PAGINA_DESKTOP = 50;
const AVATAR_DESKTOP = {
  jefatura: ['#E9D9C2', '#6E4E1F'],
  urgenciologo: ['#D5E3EE', '#2B4E6B'],
  medico: ['#E8E2EE', '#4E3A6F'],
};
const coloresAvatarSistema = (u) => {
  // Solo cuenta la jefatura asignada (con rol de servicio), no el acceso de
  // administrador que el backend informa en todos los servicios.
  const esJefatura = (u.servicios || []).some((s) => s.idRolServicio != null && /JEF/i.test(s.rolServicioNombre || ''));
  if (esJefatura) return AVATAR_DESKTOP.jefatura;
  if (/urgenci/i.test(u.profesion || '')) return AVATAR_DESKTOP.urgenciologo;
  return AVATAR_DESKTOP.medico;
};

const FuncionarioSistemaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

  // Estados de datos
  const [funcionarios, setFuncionarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados de Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServicio, setSelectedServicio] = useState(''); // Vacío significa "Todos"

  // 1. Cargar la lista de servicios para el filtro (Solo al montar)
  useEffect(() => {
    const cargarServicios = async () => {
      const resServ = await getServicios();
      if (resServ.success) {
        let dataServicios = [];
        if (Array.isArray(resServ.data)) {
          dataServicios = resServ.data;
        } else if (resServ.data && Array.isArray(resServ.data.servicios)) {
          dataServicios = resServ.data.servicios;
        } else if (typeof resServ.data === 'object' && resServ.data !== null) {
          dataServicios = Object.values(resServ.data);
        }
        setServicios(dataServicios);
      }
    };
    cargarServicios();
  }, []);

  // 2. Cargar funcionarios (Se ejecuta al montar y cada vez que cambia el filtro de servicio)
  useEffect(() => {
    const cargarFuncionarios = async () => {
      setLoading(true);

      // Aprovechamos tu método: si hay servicio seleccionado se envía, si no, va null para traer TODOS
      const servicioIdParam = selectedServicio ? Number(selectedServicio) : null;
      const response = await getFuncionariosSummary(servicioIdParam);

      if (response.success) {
        setFuncionarios(Array.isArray(response.data) ? response.data : []);
      } else {
        setMensaje({ tipo: 'error', texto: response.error || 'Error al cargar los funcionarios.' });
      }
      setLoading(false);
    };

    cargarFuncionarios();
  }, [selectedServicio]);

  // 3. Filtrado por barra de búsqueda (Nombre o RUT)
  const funcionariosFiltrados = funcionarios.filter(u => {
    const nombreCompleto = `${u.nombre || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.toLowerCase();
    const rut = (u.rutCompleto || u.rut || '').toLowerCase();
    const termino = searchQuery.toLowerCase();
    return nombreCompleto.includes(termino) || rut.includes(termino);
  });

  // 4. Paginación (en desktop, la tabla de a POR_PAGINA_DESKTOP)
  const pg = usePagination(funcionariosFiltrados, esDesktop ? POR_PAGINA_DESKTOP : 10);
  const tablaRef = useRef(null);

  // Reiniciar a la página 1 al cambiar de servicio
  useEffect(() => { pg.setPage(1); }, [selectedServicio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estilos base reutilizables
  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 14, color: PA.ink, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box'
  };

  // Desktop (R18): vista raíz del menú (sin volver). El mismo personal, el
  // mismo buscador (nombre o RUT), el mismo filtro por servicio (que recarga
  // desde el backend) y la misma paginación, en una tabla densa de a 50.
  if (esDesktop) {
    const servicioSel = servicios.find((srv) => String(srv.idServicio || srv.id) === String(selectedServicio));
    const ambito = servicioSel ? (servicioSel.nombreServicio || servicioSel.nombre) : 'todos los servicios';
    const n = funcionariosFiltrados.length;
    const subtitulo = loading
      ? 'Cargando registros del sistema...'
      : searchQuery
        ? `${n} de ${funcionarios.length} funcionarios · ${ambito}`
        : `${n} ${n === 1 ? 'funcionario' : 'funcionarios'} · ${ambito}`;
    // Al cambiar de página la tabla vuelve arriba.
    const cambiarPagina = (p) => {
      pg.setPage(p);
      const envoltura = tablaRef.current?.querySelector('.sgt-d-tabla-envoltura');
      if (envoltura) envoltura.scrollTop = 0;
    };
    return (
      <>
        <EncabezadoDesktop titulo="Personal del Sistema" subtitulo="Funcionarios registrados en el SGT, con sus servicios y su rol en cada uno." />
        <PaginaDesktop ancho="amplio" llena>
          {mensaje.texto && (
            <AvisoMantenedorDesktop tono="alerta" icono="alert" onCerrar={() => setMensaje({ tipo: '', texto: '' })}>{mensaje.texto}</AvisoMantenedorDesktop>
          )}
          <PanelDesktop
            llena
            titulo="Personal registrado"
            subtitulo={subtitulo}
            icono="user-gear"
            iconoColor="var(--success)"
            iconoFondo="var(--success-soft)"
            sinPadding
            acciones={(
              <div className="sgt-d-toolbar" style={{ flexWrap: 'nowrap' }}>
                <BuscadorDesktop
                  value={searchQuery}
                  onChange={(v) => { setSearchQuery(v); pg.setPage(1); }}
                  placeholder="Buscar por nombre, apellidos o RUT..."
                  ariaLabel="Buscar por nombre, apellidos o RUT"
                  style={{ width: 280 }}
                />
                <select
                  className="sgt-d-select"
                  aria-label="Filtrar por servicio"
                  style={{ width: 220 }}
                  value={selectedServicio}
                  onChange={(e) => setSelectedServicio(e.target.value)}
                >
                  <option value="">Todos los Servicios (Global)</option>
                  {servicios.map((srv, index) => {
                    const srvId = srv.idServicio || srv.id || `s_${index}`;
                    const srvNombre = srv.nombreServicio || srv.nombre || 'Servicio';
                    return <option key={srvId} value={srvId}>{srvNombre}</option>;
                  })}
                </select>
              </div>
            )}
          >
            {/* display: contents: el contenedor no genera caja y la tabla sigue
                siendo hija flexible del cuerpo del panel. */}
            <div ref={tablaRef} style={{ display: 'contents' }}>
              <TablaDesktop
                ariaLabel="Personal registrado en el sistema"
                cargando={loading}
                filas={loading ? [] : pg.pageItems}
                claveFila={(u, i) => u.idFuncionario || `fg_${i}`}
                vacio="No se encontraron funcionarios con los filtros aplicados."
                columnas={[
                  {
                    id: 'funcionario', titulo: 'Funcionario', ancho: '27%',
                    render: (u) => {
                      const [fondo, tinta] = coloresAvatarSistema(u);
                      return (
                        <PersonaDesktop
                          nombre={`${u.nombre || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.replace(/\s+/g, ' ').trim()}
                          iniciales={`${(u.nombre || 'U').charAt(0)}${(u.apellidoPaterno || '').charAt(0)}`.toUpperCase()}
                          fondo={fondo}
                          tinta={tinta}
                        />
                      );
                    },
                  },
                  { id: 'rut', titulo: 'RUT', ancho: 118, render: (u) => <span className="sgt-da-mant-num sgt-da-mant-nowrap">{u.rutCompleto || u.rut}</span> },
                  { id: 'profesion', titulo: 'Profesión', ancho: '19%', render: (u) => u.profesion || 'No Especificada' },
                  { id: 'servicios', titulo: 'Servicios y rol', render: (u) => <RolesServicioDesktop servicios={u.servicios} /> },
                ]}
              />
            </div>
            {!loading && (
              <PaginacionDesktop
                pagina={pg.page}
                totalPaginas={pg.totalPages}
                total={n}
                porPagina={POR_PAGINA_DESKTOP}
                onCambiar={cambiarPagina}
                unidad="funcionarios"
              />
            )}
          </PanelDesktop>
        </PaginaDesktop>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease', overflow: 'hidden' }}>

      {/* Cabecera */}
      <TopHeader
        title="Personal del Sistema"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      {/* Barra de Filtros (Buscador + Selector de Servicio) */}
      <div style={{ padding: '16px 16px 8px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff', borderBottom: `1px solid ${PA.line2}` }}>
        
        {/* Buscador de Texto */}
        <div style={{ position: 'relative' }}>
          <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 12, top: 14, pointerEvents: 'none' }}/>
          <input 
            type="text" 
            placeholder="Buscar por nombre, apellidos o RUT..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); pg.setPage(1); }}
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>

        {/* Filtro por Servicio */}
        <div style={{ position: 'relative' }}>
          <select 
            style={{ ...inputStyle, appearance: 'none', paddingRight: 38 }}
            value={selectedServicio} 
            onChange={(e) => setSelectedServicio(e.target.value)}
          >
            <option value="">Todos los Servicios (Global)</option>
            {servicios.map((srv, index) => {
              const srvId = srv.idServicio || srv.id || `s_${index}`;
              const srvNombre = srv.nombreServicio || srv.nombre || 'Servicio';
              return <option key={srvId} value={srvId}>{srvNombre}</option>;
            })}
          </select>
          <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 14, pointerEvents: 'none' }}/>
        </div>
      </div>

      {/* Contenedor Principal de la Lista */}
      <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {mensaje.texto && (
          <div style={{ padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
            {mensaje.texto}
          </div>
        )}

        {loading ? (
          <LoadingState label="Cargando registros del sistema..." />
        ) : pg.pageItems.length > 0 ? (
          pg.pageItems.map((u, i) => (
            <div key={u.idFuncionario || `fg_${i}`} className="sgt-list-row" style={{
              background: '#fff', border: 'none', borderRadius: 16,
              padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: '0 2px 10px rgba(15,23,42,0.06)'
            }}>

              {/* Fila Superior: Info Personal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: AVATAR_THEME.grad, color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0,
                  boxShadow: `0 6px 14px ${AVATAR_THEME.glow}, inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.18)`,
                }}>
                  {(u.nombre || 'U').charAt(0)}{(u.apellidoPaterno || '').charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.nombre} {u.apellidoPaterno} {u.apellidoMaterno}
                  </div>
                  <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 1 }}>
                    {u.profesion || 'No Especificada'} · <span style={{ fontSize: 11 }}>{u.rutCompleto || u.rut}</span>
                  </div>
                </div>
              </div>

              {/* Fila Inferior: Lista de Servicios Vinculados (Mapeo de la lista interna del DTO) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: `1px solid ${PA.line2}`, paddingTop: 8 }}>
                {u.servicios && u.servicios.length > 0 ? (
                  u.servicios.map((rel, idx) => (
                    <div key={rel.idServicio || idx} style={{
                      padding: '4px 8px', borderRadius: 6, background: PA.surface2,
                      border: `1px solid ${PA.line}`, display: 'flex', flexDirection: 'column', gap: 1
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: PA.ink }}>
                        {rel.nombreServicio}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: PA.primary }}>
                        • {rel.rolServicioNombre || 'Personal'}
                      </span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: PA.ink3, style: 'italic', fontWeight: 600 }}>
                    Sin servicios asignados actualmente
                  </span>
                )}
              </div>

            </div>
          ))
        ) : (
          <ListEmptyState
            icon="search" theme="slate"
            title="Sin resultados"
            message="No se encontraron funcionarios con los filtros aplicados."
          />
        )}
      </div>

      {/* Barra Fija de Paginación */}
      {pg.totalPages > 1 && (
        <div style={{ padding: '10px 16px', background: '#fff', borderTop: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 700 }}>
            {funcionariosFiltrados.length} totales
          </div>
          <PaginationControls page={pg.page} totalPages={pg.totalPages} onChange={pg.setPage} />
        </div>
      )}

    </div>
  );
};

export default FuncionarioSistemaView;