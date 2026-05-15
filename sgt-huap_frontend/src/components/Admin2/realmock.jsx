import React, { useState } from 'react';

// Mockup del Panel de Administración - Vista Responsiva (PC / Móvil)
const AdminPanelMockup = () => {
  // Simulamos la paleta de colores del sistema
  const PA = {
    primary: '#2C5282',
    primarySoft: '#EBF8FF',
    accent: '#ED8936',
    accentSoft: '#FFFAF0',
    ink: '#1A202C',
    ink2: '#4A5568',
    ink3: '#A0AEC0',
    bg: '#F7FAFC',
    surface: '#FFFFFF',
    line: '#E2E8F0',
    success: '#48BB78',
  };

  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navegación del Admin
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'servicios', label: 'Servicios', icon: '🏥' },
    { id: 'rotativas', label: 'Rotativas', icon: '🔄' },
    { id: 'configuracion', label: 'Ajustes Generales', icon: '⚙️' },
  ];

  // Componente interno para tarjetas
  const Card = ({ children, title, action }) => (
    <div style={{
      background: PA.surface,
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${PA.line}`,
      marginBottom: 20
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {title && <h3 style={{ margin: 0, color: PA.ink, fontSize: 16, fontWeight: 800 }}>{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );

  return (
    <div className="admin-layout" style={{ background: PA.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        /* Reset básico y layout principal */
        .admin-layout { display: flex; flex-direction: column; }
        .sidebar { display: none; }
        .main-content { flex: 1; display: flex; flex-direction: column; width: 100%; }
        
        /* Ocultar scrollbar pero permitir scroll */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Media Query para PC / Tablets grandes */
        @media (min-width: 768px) {
          .admin-layout { flex-direction: row; }
          .sidebar { 
            display: flex; flex-direction: column; width: 260px; 
            border-right: 1px solid ${PA.line}; background: ${PA.surface};
            height: 100vh; position: sticky; top: 0;
          }
          .mobile-header { display: none !important; }
          .main-content { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
        }

        /* Utilidades responsivas de grilla */
        .grid-cards { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1024px) {
          .grid-cards { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      {/* HEADER MÓVIL */}
      <div className="mobile-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: PA.surface, borderBottom: `1px solid ${PA.line}`
      }}>
        <div style={{ fontWeight: 800, color: PA.primary, fontSize: 18 }}>AdminPanel</div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', fontSize: 24, padding: 0 }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* SIDEBAR (PC) o MENÚ DESPLEGABLE (Móvil) */}
      <div className={`sidebar ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`} style={{
        ...(isMobileMenuOpen && {
          display: 'flex', flexDirection: 'column', position: 'absolute', top: 60, left: 0,
          right: 0, background: PA.surface, zIndex: 100, borderBottom: `1px solid ${PA.line}`, paddingBottom: 20
        })
      }}>
        <div style={{ padding: '32px 24px', fontWeight: 900, color: PA.primary, fontSize: 22, letterSpacing: -0.5 }} className="hide-on-mobile">
          SGT Admin
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
          {menuItems.map(item => (
            <div
              key={item.id}
              onClick={() => { setActiveSection(item.id); setIsMobileMenuOpen(false); }}
              style={{
                padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                background: activeSection === item.id ? PA.primarySoft : 'transparent',
                color: activeSection === item.id ? PA.primary : PA.ink2,
                fontWeight: activeSection === item.id ? 800 : 600,
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="main-content" style={{ padding: isMobileMenuOpen ? '20px' : '20px' }}>
        
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: PA.ink, margin: '0 0 8px 0' }}>
            {menuItems.find(i => i.id === activeSection)?.label}
          </h1>
          <p style={{ color: PA.ink3, margin: 0, fontSize: 14 }}>
            Bienvenido al panel de control del sistema de turnos.
          </p>
        </header>

        {/* --- VISTA: DASHBOARD --- */}
        {activeSection === 'dashboard' && (
          <div>
            <div className="grid-cards">
              <Card>
                <div style={{ color: PA.ink3, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Turnos Activos</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: PA.primary, marginTop: 8 }}>142</div>
              </Card>
              <Card>
                <div style={{ color: PA.ink3, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Solicitudes Pendientes</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: PA.accent, marginTop: 8 }}>8</div>
              </Card>
              <Card>
                <div style={{ color: PA.ink3, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Personal Activo</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: PA.ink, marginTop: 8 }}>56</div>
              </Card>
            </div>
          </div>
        )}

        {/* --- VISTA: SERVICIOS --- */}
        {activeSection === 'servicios' && (
          <div>
            <Card title="Servicios Médicos" action={
              <button style={{
                background: PA.primary, color: '#fff', border: 'none', 
                padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
              }}>+ Nuevo Servicio</button>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Urgencias', 'Pediatría', 'Unidad de Cuidados Intensivos (UCI)'].map((srv, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: 16, background: PA.bg, borderRadius: 12, border: `1px solid ${PA.line}` 
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: PA.ink, fontSize: 15 }}>{srv}</div>
                      <div style={{ color: PA.ink3, fontSize: 12, marginTop: 4 }}>12 profesionales asignados</div>
                    </div>
                    <button style={{ background: PA.surface, border: `1px solid ${PA.line}`, padding: '6px 12px', borderRadius: 6, fontWeight: 600, color: PA.ink2, cursor: 'pointer' }}>
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* --- VISTA: ROTATIVAS --- */}
        {activeSection === 'rotativas' && (
          <div>
            <Card title="Generador de Rotativas" action={
              <button style={{
                background: PA.accent, color: '#fff', border: 'none', 
                padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
              }}>Generar Mes</button>
            }>
              <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 20 }}>
                Configura los parámetros para asignar turnos de forma automática basándose en reglas y disponibilidad.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: PA.ink3, marginBottom: 8 }}>Mes Objetivo</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PA.line}`, background: PA.surface }}>
                    <option>Diciembre 2026</option>
                    <option>Enero 2027</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: PA.ink3, marginBottom: 8 }}>Servicio</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PA.line}`, background: PA.surface }}>
                    <option>Urgencias (Equipo A)</option>
                    <option>Pediatría (Equipo B)</option>
                  </select>
                </div>
              </div>
              
              <div style={{ padding: 16, background: PA.primarySoft, borderRadius: 8, color: PA.primary, fontSize: 13, fontWeight: 600 }}>
                💡 El algoritmo respetará el máximo de horas (objetivo mensual) y los días libres solicitados por el equipo.
              </div>
            </Card>
          </div>
        )}

        {/* --- VISTA: CONFIGURACIÓN GENERAL --- */}
        {activeSection === 'configuracion' && (
          <div>
            <Card title="Ajustes del Sistema">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { title: 'Gestión de Usuarios y Roles', desc: 'Añadir médicos, jefes de turno y administradores.' },
                  { title: 'Tipos de Turnos', desc: 'Configurar horarios (Ej: Día 08:00-20:00, Noche 20:00-08:00).' },
                  { title: 'Reglas de Negocio', desc: 'Horas máximas por profesional, descansos obligatorios.' }
                ].map((conf, idx) => (
                  <div key={idx} style={{ paddingBottom: 16, borderBottom: idx !== 2 ? `1px solid ${PA.line}` : 'none' }}>
                    <div style={{ fontWeight: 800, color: PA.ink, fontSize: 15 }}>{conf.title}</div>
                    <div style={{ color: PA.ink2, fontSize: 13, marginTop: 4 }}>{conf.desc}</div>
                    <button style={{ marginTop: 10, background: 'none', border: 'none', color: PA.primary, fontWeight: 700, padding: 0, cursor: 'pointer' }}>
                      Configurar →
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanelMockup;