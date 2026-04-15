import React, { useEffect, useState } from 'react';
// Importamos la lógica desde el archivo separado
import { calcularMatrizPlantilla, COLORES_DIAS } from '../../../utils/PlantillaEngine';
import '../css/PlantillaPreview.css';

const DIAS = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

export default function PlantillaPreview({ lineas }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const resultado = calcularMatrizPlantilla(lineas);
    setData(resultado);
  }, [lineas]);

  if (!data || data.lineas.length === 0) return null;

  return (
    <div className="plantilla-preview">
      <div className="pp-header">
        <h3>Previsualización del Ciclo ({data.maxSemanas} Semanas)</h3>
        <div className="pp-legend">
          <span>Día Origen:</span>
          {DIAS.map((d, i) => (
            <span key={d} className="pp-legend-item" style={{ backgroundColor: COLORES_DIAS[i] }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="pp-scroll-container">
        <table className="pp-table">
          <thead>
            <tr>
              <th className="pp-sticky-col">Semana / Bloque horario</th>
              {DIAS.map(dia => (
                <th key={dia}>{dia}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Bucle Principal: Semanas (Vertical) */}
            {Array.from({ length: data.maxSemanas }).map((_, sIndex) => (
              <React.Fragment key={sIndex}>

                {/* Bucle Secundario: Líneas dentro de la semana */}
                {data.lineas.map((linea, lIndex) => {
                  const semanaData = linea.semanas[sIndex];
                  const isLastLineOfWeek = lIndex === data.lineas.length - 1;

                  // Cálculo de fondo progresivo
                  const lightness = Math.max(85, 100 - (lIndex * 12));
                  const rowBackgroundColor = `hsl(220, 14%, ${lightness}%)`;

                  return (
                    <tr
                      key={`${sIndex}-${linea.id}`}
                      style={{ backgroundColor: rowBackgroundColor }}
                    >
                      <td
                        className="pp-sticky-col"
                        style={{ backgroundColor: rowBackgroundColor }}
                      >
                        <div className="pp-row-meta">
                          <span className="pp-week-badge">S{sIndex + 1}</span>
                          <span className="pp-line-name">
                            {linea.nombre || `Bloque horario ${lIndex + 1}`}
                          </span>
                        </div>
                      </td>

                      {semanaData.map((turno, dIndex) => (
                        <td key={dIndex}>
                          {turno ? (
                            <div
                              className="pp-turno-block"
                              style={{
                                backgroundColor: COLORES_DIAS[turno.diaOriginal],
                                border: turno.esDuplicado ? '2px solid #000' : 'none',
                                borderStyle: turno.esMovido ? 'dashed' : (turno.esDuplicado ? 'solid' : 'none'),
                                borderWidth: turno.esMovido ? '2px' : (turno.esDuplicado ? '3px' : '0'),
                                borderColor: '#1e293b',
                                boxShadow: turno.esDuplicado ? 'inset 0 0 0 1px white' : '0 2px 4px rgba(0,0,0,0.2)',
                                color: '#000',
                                fontWeight: '800'
                              }}
                              title={`${turno.nombre} (${turno.horaInicio?.substring(0, 5)} - ${turno.horaFin?.substring(0, 5)})`}
                            >
                              {/* CAMBIO: 4 LETRAS AHORA */}
                              {turno.tipoTurno?.nombre ? turno.tipoTurno.nombre.substring(0, 4).toUpperCase() : "TRN"}
                            </div>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {/* Fila Espaciadora entre semanas */}
                {sIndex < data.maxSemanas - 1 && (
                  <tr className="pp-week-spacer">
                    <td colSpan={8}></td>
                  </tr>
                )}

              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}