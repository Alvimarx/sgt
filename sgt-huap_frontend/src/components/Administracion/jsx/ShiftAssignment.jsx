// Componente: ShiftAssignment
// Descripción: Interfaz moderna para asignar turnos a un médico con diseño mejorado
import React, { useState } from 'react'

export default function ShiftAssignment({ doctor }){
  const [shifts, setShifts] = useState([])
  const [form, setForm] = useState({fecha:'', inicio:'08:00', fin:'16:00', tipo:'normal', recurrente:false, diaSemana:'monday', esRotativa:false})

  function addShift(e){
    e.preventDefault()
    setShifts(s=>[...s, {...form, id: Date.now()}])
  }

  function removeShift(id){
    setShifts(s=>s.filter(x=>x.id!==id))
  }

  return (
    <div className="shift-assignment-container">
      <div className="shift-form-card">
        <div className="shift-form-header">
          <svg className="shift-form-title-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="currentColor"/>
          </svg>
          <h3 className="shift-form-title">Asignar turnos — {doctor.nombre}</h3>
        </div>

        <form onSubmit={addShift}>
          <div className="shift-form-grid">
            <div className="shift-form-group">
              <label className="shift-form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="currentColor"/>
                </svg>
                Fecha
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={e=>setForm({...form,fecha:e.target.value})}
                className="shift-form-input"
                required
              />
            </div>

            <div className="shift-form-group">
              <label className="shift-form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor"/>
                  <path d="M12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
                </svg>
                Horario
              </label>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <input
                  type="time"
                  value={form.inicio}
                  onChange={e=>setForm({...form,inicio:e.target.value})}
                  className="shift-form-input"
                  style={{flex: 1}}
                  required
                />
                <span style={{alignSelf: 'center', color: '#64748b'}}>a</span>
                <input
                  type="time"
                  value={form.fin}
                  onChange={e=>setForm({...form,fin:e.target.value})}
                  className="shift-form-input"
                  style={{flex: 1}}
                  required
                />
              </div>
            </div>

            <div className="shift-form-group">
              <label className="shift-form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L22 9.27L16.77 14.14L18.18 21.02L12 17.77L5.82 21.02L7.23 14.14L2 9.27L10.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
                Tipo de turno
              </label>
              <select
                value={form.tipo}
                onChange={e=>setForm({...form,tipo:e.target.value})}
                className="shift-form-select"
              >
                <option value="normal">Normal</option>
                <option value="urgencia">Urgencia</option>
                <option value="guardia">Guardia</option>
              </select>
            </div>

            {form.recurrente && (
              <div className="shift-form-group">
                <label className="shift-form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 10L12 15L17 10H7Z" fill="currentColor"/>
                  </svg>
                  Día de la semana
                </label>
                <select
                  value={form.diaSemana}
                  onChange={e=>setForm({...form,diaSemana:e.target.value})}
                  className="shift-form-select"
                >
                  <option value="monday">Lunes</option>
                  <option value="tuesday">Martes</option>
                  <option value="wednesday">Miércoles</option>
                  <option value="thursday">Jueves</option>
                  <option value="friday">Viernes</option>
                </select>
              </div>
            )}
          </div>

          <div className="shift-checkbox-group">
            <label className="shift-checkbox-item">
              <input
                type="checkbox"
                checked={form.recurrente}
                onChange={e=>setForm({...form,recurrente:e.target.checked})}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="currentColor"/>
              </svg>
              Recurrente
            </label>
            <label className="shift-checkbox-item">
              <input
                type="checkbox"
                checked={form.esRotativa}
                onChange={e=>setForm({...form,esRotativa:e.target.checked})}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="currentColor"/>
              </svg>
              Rotativa
            </label>
          </div>

          <button type="submit" className="shift-submit-button" title="Asignar turno al médico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
            </svg>
            Asignar turno
          </button>
        </form>
      </div>

      <div className="shift-list-card">
        <div className="shift-list-header">
          <svg className="shift-list-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="currentColor"/>
          </svg>
          <h4 className="shift-list-title">Turnos asignados</h4>
        </div>

        {shifts.length === 0 ? (
          <div className="shift-empty-state">
            <span className="shift-empty-state-icon">📋</span>
            No hay turnos asignados aún
          </div>
        ) : (
          <div className="shift-list">
            {shifts.map(s=> (
              <div key={s.id} className="shift-item">
                <div className="shift-item-info">
                  <div className="shift-item-date">
                    {s.recurrente ? `Recurrente (${s.diaSemana})` : s.fecha}
                  </div>
                  <div className="shift-item-details">
                    <span className="shift-item-time">{s.inicio} - {s.fin}</span>
                    <span className="shift-item-type">{s.tipo}</span>
                    {s.esRotativa && <span className="shift-item-rotative">Rotativa</span>}
                  </div>
                </div>
                <button onClick={()=>removeShift(s.id)} className="shift-remove-button" title="Remover turno asignado">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="currentColor"/>
                  </svg>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
