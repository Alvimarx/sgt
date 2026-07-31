import React, { useEffect, useState } from 'react';
import { SGT_DATA, DASHBOARD_ICON_THEMES } from './data'; // Ajusta la ruta según tu estructura
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';

const AVATAR_THEME = DASHBOARD_ICON_THEMES.green;
import { getServicios } from '../../services/servicioService';
import { getFuncionariosSummary } from '../../services/funcionarioService';

const FuncionarioSistemaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;

  // Estados de datos
  const [funcionarios, setFuncionarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados de Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServicio, setSelectedServicio] = useState(''); // Vacío significa "Todos"

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Cantidad de funcionarios por página

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
      setCurrentPage(1); // Reiniciar a la página 1 al cambiar de servicio

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

  // 4. Lógica Matemática de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const funcionariosPaginados = funcionariosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(funcionariosFiltrados.length / itemsPerPage);

  // Cambiar de página de forma segura
  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Estilos base reutilizables
  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 14, color: PA.ink, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
      
      {/* Cabecera */}
      <TopHeader
        title="Panel Global de Personal"
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
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: PA.ink3, fontWeight: 600 }}>
            Cargando registros del sistema...
          </div>
        ) : funcionariosPaginados.length > 0 ? (
          funcionariosPaginados.map((u, i) => (
            <div key={u.idFuncionario || `fg_${i}`} style={{
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
          <div style={{ textAlign: 'center', padding: '40px 16px', color: PA.ink3, fontWeight: 600 }}>
            No se encontraron funcionarios con los filtros aplicados.
          </div>
        )}
      </div>

      {/* Barra Fija de Paginación */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
          <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 700 }}>
            Pág. {currentPage} de {totalPages} ({funcionariosFiltrados.length} totales)
          </div>
          
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => paginate(currentPage - 1)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: `1px solid ${PA.line}`,
                background: currentPage === 1 ? '#F1F5F9' : '#fff',
                color: currentPage === 1 ? PA.line : PA.ink,
                fontWeight: 700, fontSize: 12, cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Anterior
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => paginate(currentPage + 1)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: `1px solid ${PA.line}`,
                background: currentPage === totalPages ? '#F1F5F9' : '#fff',
                color: currentPage === totalPages ? PA.line : PA.ink,
                fontWeight: 700, fontSize: 12, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FuncionarioSistemaView;