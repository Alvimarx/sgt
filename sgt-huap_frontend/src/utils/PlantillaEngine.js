// Constantes
const TURNO_CREADO_ID = "TURNO_CREADO";
const DIAS_NOMBRES = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

export const COLORES_DIAS = [
  "#F5276C", "#F5B027", "#27F5B0", "#276CF5", "#8FED24", "#FFFF00", "#FF00FF"
];

const parseDayIndex = (token) => {
  if (!token || typeof token !== 'string') return -1;
  for (let i = 0; i < DIAS_NOMBRES.length; i++) {
    if (token.startsWith(DIAS_NOMBRES[i])) return i;
  }
  return -1;
};

// --- MOTOR DE PINTADO (Cálculo de la Matriz Teórica) ---
// (Esta función se mantiene igual, es correcta)
export const calcularMatrizPlantilla = (lineas) => {
  let maxSemanas = 1;

  lineas.forEach(linea => {
    if (!linea.dias) return;
    linea.dias.forEach(turno => {
      if (turno && turno.tipoTurno && turno.tipoTurno.matrizPatron) {
        try {
          const patron = JSON.parse(turno.tipoTurno.matrizPatron);
          if (patron.matriz && patron.matriz.length > maxSemanas) {
            maxSemanas = patron.matriz.length;
          }
        } catch (e) {}
      }
    });
  });

  const resultado = lineas.map(linea => {
    const semanasCalculadas = [];
    for (let i = 0; i < maxSemanas; i++) {
      semanasCalculadas.push(Array(7).fill(null));
    }
    return { nombre: linea.nombre, id: linea.id, semanas: semanasCalculadas };
  });

  lineas.forEach((lineaConfig, lineaIndex) => {
    if (!lineaConfig.dias) return;

    let actores = [];
    lineaConfig.dias.forEach((turno, index) => {
      if (turno) {
        actores.push({ 
          turno: turno, 
          diaConfigurado: index, 
          prioCat: turno.tipoTurno?.categoria?.prioridad || 0,
          prioInt: turno.tipoTurno?.prioridadInterna || 0
        });
      }
    });

    actores.sort((a, b) => {
      if (a.prioCat !== b.prioCat) return b.prioCat - a.prioCat;
      return b.prioInt - a.prioInt;
    });

    actores.forEach(actor => {
      try {
        const patronObj = JSON.parse(actor.turno.tipoTurno.matrizPatron);
        const matrizPatron = patronObj.matriz;

        for (let w = 0; w < maxSemanas; w++) {
          const patronSemana = matrizPatron[w % matrizPatron.length];

          patronSemana.forEach((instruccion, diaDestinoIndex) => {
            if (instruccion === null) return;

            if (instruccion === TURNO_CREADO_ID) {
              resultado[lineaIndex].semanas[w][diaDestinoIndex] = {
                ...actor.turno,
                diaOriginal: actor.diaConfigurado
              };
            } else {
              const diaOrigenIndex = parseDayIndex(instruccion);
              if (diaOrigenIndex !== -1) {
                const turnoVictima = lineaConfig.dias[diaOrigenIndex];
                if (turnoVictima) {
                  resultado[lineaIndex].semanas[w][diaDestinoIndex] = {
                    ...turnoVictima,
                    diaOriginal: diaOrigenIndex
                  };
                } else {
                  resultado[lineaIndex].semanas[w][diaDestinoIndex] = null;
                }
              }
            }
          });
        }
      } catch (e) { }
    });
  });
  
  return { maxSemanas, lineas: resultado };
};

// --- GENERADOR DE CALENDARIO REAL (CORREGIDO) ---
export const generarTurnosReales = (plantillaLineas, fechaInicioStr, fechaFinStr) => {
  const matrizResuelta = calcularMatrizPlantilla(plantillaLineas);
  const maxSemanas = matrizResuelta.maxSemanas;
  
  const turnosParaCrear = [];
  
  // Fechas con hora fija para evitar problemas de zona horaria
  const fechaInicio = new Date(fechaInicioStr + 'T12:00:00');
  const fechaFin = new Date(fechaFinStr + 'T12:00:00');

  // --- CORRECCIÓN: ALINEACIÓN A SEMANA CALENDARIO ---
  // 1. Encontrar el Lunes de la semana donde cae fechaInicio
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay(); 
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuste al Lunes
    return new Date(date.setDate(diff));
  }
  
  // Esta es nuestra "Fecha Cero" para contar semanas.
  // Si fechaInicio es Miércoles, el ancla es el Lunes previo.
  const fechaAnclaCiclo = getMonday(fechaInicio);
  // Normalizamos a medianoche para cálculos precisos de días
  fechaAnclaCiclo.setHours(0,0,0,0);

  let currentDate = new Date(fechaInicio);

  while (currentDate <= fechaFin) {
    // A. Día de la semana (0=Lunes ... 6=Domingo)
    let jsDay = currentDate.getDay(); 
    let diaSemanaIndex = jsDay === 0 ? 6 : jsDay - 1;

    // B. Calcular Semana del Ciclo alineada al Lunes
    // Calculamos diferencia de días contra el Lunes ancla
    const currentMidnight = new Date(currentDate);
    currentMidnight.setHours(0,0,0,0);
    
    const diffTime = currentMidnight - fechaAnclaCiclo;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Como diffDays se cuenta desde un lunes, la división entera por 7
    // nos da exactamente el índice de la semana calendario (0, 1, 2...).
    const semanaGlobalIndex = Math.floor(diffDays / 7);
    
    // Rotamos con el ciclo máximo
    const semanaCicloIndex = semanaGlobalIndex % maxSemanas;

    // C. Buscar en la Matriz Resuelta
    matrizResuelta.lineas.forEach(linea => {
        if (linea.semanas[semanaCicloIndex]) {
            const turnoBloque = linea.semanas[semanaCicloIndex][diaSemanaIndex];

            if (turnoBloque) {
                // ¡Existe turno!
                turnosParaCrear.push({
                    fecha: new Date(currentDate),
                    turnoBase: turnoBloque, 
                    nombreLinea: linea.nombre
                });
            }
        }
    });

    // Avanzar un día
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return turnosParaCrear;
};