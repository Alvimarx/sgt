import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useAuth } from '../../context/AuthContext';
import { plantillasService, tiposTurnoService, formatHora, shiftHora, formatDesplazamientoHoras } from '../../services/rotativasService';
import { getPuestosPorServicio } from '../../services/puestosService';
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { planificacionService } from '../../services/planificacionService';
import { feriadosService } from '../../services/feriadosService';
import { reglasServicioService } from '../../services/reglasServicioService';
// Modo desktop (R18): presentación ancha. La lógica de esta vista es una sola;
// cada componente bifurca solo el dibujo con `esDesktop`.
import { Trash2, ChevronLeft, ChevronRight, CalendarCheck2, FolderOpen } from 'lucide-react';
import { useLayout } from '../../layout/layout';
import { PanelLateral, SGTIcon as IconoKit } from '../Style/UIPrimitives';
import { AvisoDesktop, BotonDesktop, BuscadorDesktop, CampoDesktop, ChipDesktop, EncabezadoDesktop, EstadoVacioDesktop, PaginaDesktop, PanelDesktop } from '../Desktop/ui';
import MoldeDesktop, { MoldeCargandoDesktop } from '../Desktop/planificacion/MoldeDesktop';
import { ConfirmacionPlan, FormularioPanel, GrillaSemanas } from '../Desktop/planificacion/piezas';
import { DIAS_LARGOS, MESES_LARGOS, claseAvatar, crearTonoTipo, fechaCorta, fechaHora, formatoNumero, inicialesDeNombre, mayusculaInicial, normalizar } from '../Desktop/planificacion/formato';

/* ─── Helpers de fecha ─────────────────────────────────────────────────────── */
const MONTHS_LONG=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEK_DAYS_LBL=['Lu','Ma','Mi','Ju','Vi','Sá','Do'];
const DIA_NOMBRE=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function parseLocalDate(str){ if(!str)return null; const[y,m,d]=String(str).split('-').map(Number); return new Date(y,m-1,d); }
function toDateStr(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function buildMonthGrid(seedDateStr){
  const seed=parseLocalDate(seedDateStr);
  const year=seed.getFullYear(), month=seed.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  const jsDay=first.getDay(), offset=jsDay===0?6:jsDay-1;
  const start=new Date(year,month,1-offset);
  const totalCells=Math.ceil((offset+last.getDate())/7)*7;
  const weeks=[];
  for(let w=0;w<totalCells/7;w++){ const row=[]; for(let d=0;d<7;d++){ const dt=new Date(start); dt.setDate(start.getDate()+w*7+d); row.push({date:dt,inMonth:dt.getMonth()===month}); } weeks.push(row); }
  return{weeks,year,month};
}

/* ─── Helpers de tipos / horarios / colores ────────────────────────────────── */
const HUES=[250,150,30,85,320,200,45,170,110,300];

/** Construye un mapa idTipoTurno → color estable según el orden de los tipos. */
function makeTipoColor(tipos){
  const idx={}; (tipos||[]).forEach((t,i)=>{ idx[t.idTipoTurno]=i; });
  return (idTipo)=>{ const i=idx[idTipo]??0; const h=HUES[i%HUES.length]; return {bg:`oklch(0.94 0.045 ${h})`,soft:`oklch(0.97 0.025 ${h})`,ink:`oklch(0.36 0.10 ${h})`,bar:`oklch(0.62 0.13 ${h})`}; };
}

const horaAMin=(h)=>{ const [hh,mm]=formatHora(h).split(':').map(Number); return (hh||0)*60+(mm||0); };
/** [inicioMin, duraciónMin] de un tipo de turno (maneja cruce de medianoche). */
function tipoIntervalo(t){ const s=horaAMin(t.horaInicio); const e=horaAMin(t.horaTermino); let dur=(e-s+1440)%1440; if(dur===0)dur=1440; return [s,dur]; }
const rangoHoras=(t)=>`${formatHora(t.horaInicio)}–${formatHora(t.horaTermino)}`;

/** Intervalos absolutos (minutos en la línea relativa) de toda la secuencia de una instancia. */
function intervalosInstancia(inst){
  const out=[];
  (inst.secuencia||[]).forEach((tipos,diaIndex)=>{ tipos.forEach(t=>{ const [s,dur]=tipoIntervalo(t); const base=diaIndex*1440+s; out.push([base,base+dur]); }); });
  return out;
}
/** Instancia en conflicto (mismo funcionario, horario solapado) o null. */
function findDobleAsignacion(instancias,instanceId,funcionarioId){
  const obj=instancias.find(i=>i.id===instanceId); if(!obj)return null;
  const objInts=intervalosInstancia(obj);
  const otros=instancias.filter(i=>i.id!==instanceId && i.idFuncionario!=null && Number(i.idFuncionario)===Number(funcionarioId));
  for(const o of otros){ const oInts=intervalosInstancia(o); if(objInts.some(([as,ae])=>oInts.some(([bs,be])=>as<be&&bs<ae)))return o; }
  return null;
}

/** Secuencia porDia [{idTipoTurno,nombre,horaInicio,horaTermino}...] desde PlantillaDTO.secuenciaDias. */
function buildSecuencia(plantilla){
  const total=(plantilla.semanas||0)*7;
  const porDia=Array.from({length:total},()=>[]);
  (plantilla.secuenciaDias||[]).forEach(d=>{
    const idx=d?.diaIndex; const t=d?.turno;
    if(idx!=null && idx>=0 && idx<total && t && t.idTipoTurno!=null){
      porDia[idx].push({ idTipoTurno:t.idTipoTurno, nombre:t.nombre, horaInicio:t.horaInicio, horaTermino:t.horaTermino });
    }
  });
  return porDia;
}

const nombreFunc=(f)=>f?`${f.nombre} ${f.apellidoPaterno||''}`.trim():'';
const inicialesDe=(f)=>{ if(!f)return '?'; const a=(f.nombre||'')[0]||''; const b=(f.apellidoPaterno||'')[0]||''; return (a+b).toUpperCase()||'?'; };

/* ─── SGTIcon ──────────────────────────────────────────────────────────────── */
function SGTIcon({name,size=18,color='currentColor',strokeWidth=2}){
  const c={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth,strokeLinecap:'round',strokeLinejoin:'round'};
  switch(name){
    case 'home':          return <svg {...c}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'chevron-left':  return <svg {...c}><path d="M15 18l-6-6 6-6"/></svg>;
    case 'chevron-right': return <svg {...c}><path d="M9 18l6-6-6-6"/></svg>;
    case 'chevron-down':  return <svg {...c}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-up':    return <svg {...c}><path d="M18 15l-6-6-6 6"/></svg>;
    case 'close':         return <svg {...c}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'bell':          return <svg {...c}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    case 'user':          return <svg {...c}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'users':         return <svg {...c}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'clock':         return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case 'plus':          return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check':         return <svg {...c}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'check-circle':  return <svg {...c}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
    case 'alert':         return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
    case 'calendar':      return <svg {...c}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case 'arrow-right':   return <svg {...c}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case 'more':          return <svg {...c}><circle cx="12" cy="12" r="1" fill={color}/><circle cx="19" cy="12" r="1" fill={color}/><circle cx="5" cy="12" r="1" fill={color}/></svg>;
    case 'trash':         return <svg {...c}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    default: return null;
  }
}

/* ─── SGTBadge ─────────────────────────────────────────────────────────────── */
function SGTBadge({children,tone='neutral',size='sm',style={}}){
  const tones={neutral:{bg:'var(--line2)',ink:'var(--ink2)'},primary:{bg:'var(--primary-soft)',ink:'var(--primary)'},warn:{bg:'var(--warn-soft)',ink:'var(--warn)'},success:{bg:'var(--success-soft)',ink:'var(--success)'}};
  const t=tones[tone]||tones.neutral;
  const sz=size==='xs'?{fs:10,pad:'2px 6px'}:{fs:11,pad:'3px 8px'};
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,background:t.bg,color:t.ink,padding:sz.pad,borderRadius:999,fontSize:sz.fs,fontWeight:700,letterSpacing:0.2,textTransform:'uppercase',whiteSpace:'nowrap',...style}}>{children}</span>;
}

/* ─── SGTAvatar (color estable por iniciales) ──────────────────────────────── */
function SGTAvatar({person,size=28,style={}}){
  const h=HUES[((person?.iniciales||'?').charCodeAt(0)||63)%HUES.length];
  return <div style={{width:size,height:size,borderRadius:999,background:`oklch(0.92 0.05 ${h})`,color:`oklch(0.34 0.10 ${h})`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*0.38,letterSpacing:0.3,flexShrink:0,...style}}>{person?.iniciales}</div>;
}

/* ─── TopHeader ────────────────────────────────────────────────────────────── */
function TopHeader({title,subtitle,rightSlot,leftSlot,dense}){
  return(
    <div style={{padding:dense?'14px 16px 10px':'16px 18px 12px',background:'#fff',borderBottom:'1px solid var(--line2)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
      {leftSlot}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:19,fontWeight:800,color:'var(--ink)',lineHeight:1.15,letterSpacing:-0.2}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:'var(--ink3)',marginTop:2,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtitle}</div>}
      </div>
      {rightSlot}
    </div>
  );
}

/* ─── Sheet ────────────────────────────────────────────────────────────────── */
function Sheet({open,onClose,children,title,maxHeight='85%',anchoDesktop='md'}){
  const{esDesktop}=useLayout();
  if(!open)return null;
  // Desktop (R18): panel lateral desde la derecha (Escape y clic afuera cierran).
  if(esDesktop)return <PanelLateral onClose={onClose} title={title} ancho={anchoDesktop}>{children}</PanelLateral>;
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.35)',animation:'sgtFade .2s ease'}}/>
      <div style={{position:'relative',background:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight,width:'100%',maxWidth:480,display:'flex',flexDirection:'column',boxShadow:'0 -12px 40px rgba(15,23,42,0.16)',animation:'sgtSlideUp .28s cubic-bezier(.2,.9,.2,1)'}}>
        <div style={{display:'flex',justifyContent:'center',paddingTop:10}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
        {title&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px 8px'}}>
            <div style={{fontSize:17,fontWeight:800,color:'var(--ink)'}}>{title}</div>
            <button onClick={onClose} style={{background:'var(--line2)',border:'none',borderRadius:999,width:30,height:30,display:'grid',placeItems:'center',cursor:'pointer'}}><SGTIcon name="close" size={16} color="var(--ink2)"/></button>
          </div>
        )}
        <div style={{overflow:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  );
}

/* ─── KPIBar ─────────────────────────────────────────────────────────────────
   Cuenta turnos del molde (suma de la secuencia de cada instancia), no instancias. */
function KPIBar({instancias,dense=false}){
  const totalTurnos=instancias.reduce((a,i)=>a+(i.secuencia||[]).reduce((s,d)=>s+d.length,0),0);
  // turnos cubiertos = los de instancias con funcionario asignado
  const cubiertos=instancias.reduce((a,i)=>a+(i.idFuncionario?(i.secuencia||[]).reduce((s,d)=>s+d.length,0):0),0);
  const pend=totalTurnos-cubiertos;
  const pad=dense?'7px 9px':'9px 11px';
  const item=(bg,ink,icon,n,label)=>(
    <div style={{flex:1,background:'var(--surface2)',borderRadius:10,padding:pad,display:'flex',alignItems:'center',gap:8}}>
      <div style={{width:26,height:26,borderRadius:8,background:bg,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={icon} size={14} color={ink}/></div>
      <div style={{minWidth:0}}><div style={{fontSize:15,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div><div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:2}}>{label}</div></div>
    </div>
  );
  return(
    <div style={{display:'flex',gap:6}}>
      {item('var(--primary-soft)','var(--primary)','calendar',totalTurnos,'Turnos')}
      {item('var(--warn-soft)','var(--warn)','clock',pend,'Vacantes')}
      {item('var(--success-soft)','var(--success)','check-circle',cubiertos,'Cubiertos')}
    </div>
  );
}

/* ─── PuestoTag ────────────────────────────────────────────────────────────────── */
function PuestoTag({inst,size='sm'}){
  if(!inst||!inst.nombrePuesto)return null;
  const fs=size==='xs'?9.5:10.5;
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:fs,fontWeight:900,letterSpacing:0.2,padding:'1px 6px',borderRadius:99,background:'var(--primary-soft)',color:'var(--primary)',whiteSpace:'nowrap'}}><SGTIcon name="home" size={fs-1} color="var(--primary)"/>{inst.nombrePuesto}</span>;
}

/* ─── PuestoSelector ───────────────────────────────────────────────────────────── */
function PuestoSelector({puestos,value,onChange}){
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  return(
    <div>
      <span style={lbl}>Asociar a puesto / unidad</span>
      {puestos.length===0?(
        <div style={{fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay puestos en este servicio.</div>
      ):(
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {puestos.map(p=>{ const sel=String(p.idPuesto)===String(value); return(
            <button key={p.idPuesto} onClick={()=>onChange(String(p.idPuesto))} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 13px',borderRadius:99,cursor:'pointer',fontFamily:'inherit',background:sel?'var(--primary)':'#fff',border:`1.5px solid ${sel?'var(--primary)':'var(--line)'}`,color:sel?'#fff':'var(--ink)',fontSize:13,fontWeight:800}}>
              <SGTIcon name="home" size={13} color={sel?'#fff':'var(--ink3)'}/>{p.nombre}
            </button>
          );})}
        </div>
      )}
    </div>
  );
}

/* ─── Cobertura del día (agrupa por tipo de turno real) ────────────────────── */
function buildDayCoverage(entradasDelDia){
  // entradasDelDia: [{inst, tipo}]
  const byTipo={};
  entradasDelDia.forEach(({inst,tipo})=>{
    const key=tipo.idTipoTurno;
    if(!byTipo[key])byTipo[key]={tipo,asignadas:[],pendientes:[]};
    if(inst.idFuncionario)byTipo[key].asignadas.push(inst); else byTipo[key].pendientes.push(inst);
  });
  return Object.values(byTipo);
}

/* ─── Estado de planificación (sobre datos reales) ─────────────────────────── */
function usePlanificacionState({plantillas,funcionarios,puestos}){
  const[instancias,setInstancias]=useState([]);
  const counter=useRef(0);

  const reset=()=>{ setInstancias([]); counter.current=0; };

  const instanciaDesdePlantilla=(plantilla,extra={})=>{
    counter.current+=1; const n=counter.current;
    return {
      id:`inst-${n}`, label:`R${n}`,
      idRotativa:plantilla.idRotativa, nombreRotativa:plantilla.nombre,
      semanas:plantilla.semanas, secuencia:buildSecuencia(plantilla),
      idFuncionario:null, nombreFuncionario:null, iniciales:null, profesion:null,
      idPuesto:null, nombrePuesto:null, ...extra,
    };
  };

  const inject=({idRotativa,idPuesto})=>{
    const plantilla=plantillas.find(p=>p.idRotativa===Number(idRotativa)); if(!plantilla)return null;
    const puesto=idPuesto?puestos.find(p=>p.idPuesto===Number(idPuesto)):null;
    const nueva=instanciaDesdePlantilla(plantilla,{idPuesto:puesto?.idPuesto||null,nombrePuesto:puesto?.nombre||null});
    setInstancias(prev=>[...prev,nueva]);
    return nueva;
  };

  const assign=(instanceId,idFuncionario)=>{
    const f=funcionarios.find(x=>x.idFuncionario===Number(idFuncionario)); if(!f)return;
    setInstancias(prev=>prev.map(i=>i.id===instanceId?{...i,idFuncionario:f.idFuncionario,nombreFuncionario:nombreFunc(f),iniciales:inicialesDe(f),profesion:f.profesion||null}:i));
  };

  const unassign=(instanceId)=>setInstancias(prev=>prev.map(i=>i.id===instanceId?{...i,idFuncionario:null,nombreFuncionario:null,iniciales:null,profesion:null}:i));

  const removeInstancia=(instanceId)=>setInstancias(prev=>prev.filter(i=>i.id!==instanceId));

  // Carga un molde del backend (asignaciones) uniendo con las plantillas (para la secuencia).
  const loadMolde=(planificacion)=>{
    counter.current=0;
    const nuevas=(planificacion.asignaciones||[]).map(a=>{
      const plantilla=plantillas.find(p=>p.idRotativa===a.idRotativa);
      counter.current+=1; const n=counter.current;
      return {
        id:`inst-${n}`, label:`R${n}`,
        idRotativa:a.idRotativa, nombreRotativa:a.nombreRotativa||plantilla?.nombre||'Rotativa',
        semanas:plantilla?.semanas||0, secuencia:plantilla?buildSecuencia(plantilla):[],
        idFuncionario:a.idFuncionario||null, nombreFuncionario:a.nombreFuncionario||null,
        iniciales:a.nombreFuncionario?a.nombreFuncionario.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join(''):null,
        profesion:null, idPuesto:a.idPuesto||null, nombrePuesto:a.nombrePuesto||null,
      };
    });
    setInstancias(nuevas);
  };

  // Asignaciones para enviar al backend.
  const toAsignaciones=()=>instancias.map(i=>({ idRotativa:i.idRotativa, idFuncionario:i.idFuncionario||null, idPuesto:i.idPuesto||null }));

  const daysIndex=useMemo(()=>{
    const m={};
    instancias.forEach(inst=>{ (inst.secuencia||[]).forEach((tipos,diaIndex)=>{ tipos.forEach(tipo=>{ (m[diaIndex]??=[]).push({inst,tipo}); }); }); });
    return m;
  },[instancias]);
  const maxSemanas=useMemo(()=>instancias.reduce((mx,i)=>Math.max(mx,i.semanas||0),0),[instancias]);

  return{instancias,inject,assign,unassign,removeInstancia,reset,loadMolde,toAsignaciones,daysIndex,maxSemanas};
}

/* ─── InyectarSheet ──────────────────────────────────────────────────────────── */
function InyectarSheet({open,onClose,onInject,plantillas,puestos}){
  const{esDesktop}=useLayout();
  const[idRotativa,setIdRotativa]=useState('');
  const[idPuesto,setIdPuesto]=useState('');
  const[err,setErr]=useState('');
  if(!open)return null;

  const handle=()=>{ if(!idRotativa)return setErr('Selecciona una rotativa.'); if(!idPuesto)return setErr('Selecciona el puesto.'); setErr(''); onInject({idRotativa:Number(idRotativa),idPuesto:Number(idPuesto)}); setIdRotativa(''); setIdPuesto(''); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  // Desktop (R18): mismo formulario en el panel lateral, acciones abajo.
  if(esDesktop){
    return(
      <Sheet open={open} onClose={onClose} title="Agregar rotativa" anchoDesktop={560}>
        <FormularioPanel pie={(
          <>
            <BotonDesktop variante="secundario" onClick={onClose}>Cancelar</BotonDesktop>
            <BotonDesktop variante="primario" icono="plus" onClick={handle}>Agregar al molde</BotonDesktop>
          </>
        )}>
          <p className="sgt-dp-texto">La rotativa quedará <strong>pendiente de asignación</strong> y asociada al puesto que elijas.</p>
          {err&&<AvisoDesktop tono="aviso"><span role="alert">{err}</span></AvisoDesktop>}
          <section className="sgt-dp-seccion" aria-label="Rotativa">
            <div className="sgt-d-seccion-titulo">Rotativa</div>
            {plantillas.length===0?(
              <div className="sgt-dp-opciones__vacio">No hay rotativas en este servicio. Créalas en «Rotativas».</div>
            ):(
              <div className="sgt-dp-opciones">
                {plantillas.map(p=>{ const sel=String(p.idRotativa)===idRotativa; const turnos=buildSecuencia(p).reduce((s,d)=>s+d.length,0); return(
                  <button key={p.idRotativa} type="button" className="sgt-dp-opcion" aria-pressed={sel} onClick={()=>setIdRotativa(String(p.idRotativa))}>
                    <span className="sgt-dp-radio" aria-hidden="true">{sel&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</span>
                    <span className="sgt-dp-opcion__texto"><span className="sgt-dp-opcion__titulo">{p.nombre}</span><span className="sgt-dp-opcion__detalle">{p.semanas} semanas · {turnos} turnos</span></span>
                    <span/>
                  </button>
                );})}
              </div>
            )}
          </section>
          <section className="sgt-dp-seccion" aria-label="Puesto o unidad">
            <div className="sgt-d-seccion-titulo">Asociar a puesto / unidad</div>
            {puestos.length===0?(
              <div className="sgt-dp-opciones__vacio">No hay puestos en este servicio.</div>
            ):(
              <div className="sgt-dp-pildoras">
                {puestos.map(p=>{ const sel=String(p.idPuesto)===String(idPuesto); return(
                  <button key={p.idPuesto} type="button" className="sgt-dp-pildora" aria-pressed={sel} onClick={()=>setIdPuesto(String(p.idPuesto))}>
                    {sel&&<SGTIcon name="check" size={11} color="#fff" strokeWidth={3}/>}{p.nombre}
                  </button>
                );})}
              </div>
            )}
          </section>
        </FormularioPanel>
      </Sheet>
    );
  }

  return(
    <Sheet open={open} onClose={onClose} title="Agregar rotativa" maxHeight="90%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>La rotativa quedará <strong style={{color:'var(--ink)'}}>pendiente de asignación</strong> y asociada al puesto que elijas.</div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Rotativa</span>
          {plantillas.length===0?(
            <div style={{fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay rotativas en este servicio. Créalas en «Rotativas».</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {plantillas.map(p=>{ const selected=String(p.idRotativa)===idRotativa; const turnos=buildSecuencia(p).reduce((s,d)=>s+d.length,0); return(
                <button key={p.idRotativa} onClick={()=>setIdRotativa(String(p.idRotativa))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?'var(--primary-soft)':'#fff',border:`1.5px solid ${selected?'var(--primary)':'var(--line)'}`,borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{p.nombre}</div><div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,marginTop:1}}>{p.semanas} semanas · {turnos} turnos</div></div>
                  <div style={{width:18,height:18,borderRadius:99,border:`2px solid ${selected?'var(--primary)':'var(--line)'}`,background:selected?'var(--primary)':'transparent',display:'grid',placeItems:'center',flexShrink:0}}>{selected&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</div>
                </button>
              );})}
            </div>
          )}
        </div>
        <PuestoSelector puestos={puestos} value={idPuesto} onChange={setIdPuesto}/>
        <button onClick={handle} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="plus" size={16} color="#fff"/> Agregar al molde
        </button>
      </div>
    </Sheet>
  );
}

/* ─── AsignarFuncionarioSheet ────────────────────────────────────────────────── */
function AsignarFuncionarioSheet({open,onClose,onAssign,instancia,onUnassign,onRemove,instancias=[],funcionarios=[]}){
  const{esDesktop}=useLayout();
  const[idFuncionario,setIdFuncionario]=useState(instancia?.idFuncionario?String(instancia.idFuncionario):'');
  const[err,setErr]=useState('');
  // Desktop: filtro de la lista de funcionarios (solo presentación).
  const[busqueda,setBusqueda]=useState('');

  useEffect(()=>{ setIdFuncionario(instancia?.idFuncionario?String(instancia.idFuncionario):''); setErr(''); },[instancia]);
  useEffect(()=>{ setBusqueda(''); },[instancia?.id]);

  if(!open||!instancia)return null;
  const totalTurnos=(instancia.secuencia||[]).reduce((s,d)=>s+d.length,0);

  const handle=()=>{
    if(!idFuncionario)return setErr('Selecciona un funcionario.');
    const conflicto=findDobleAsignacion(instancias,instancia.id,Number(idFuncionario));
    if(conflicto){ const f=funcionarios.find(x=>x.idFuncionario===Number(idFuncionario)); return setErr(`${f?nombreFunc(f):'Esta persona'} ya cubre ${conflicto.label} · ${conflicto.nombreRotativa}, que se superpone en horario.`); }
    setErr(''); onAssign(instancia.id,Number(idFuncionario));
  };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  // Desktop (R18): resumen de la instancia, búsqueda y lista con RUT; acciones abajo.
  if(esDesktop){
    const q=normalizar(busqueda.trim());
    const lista=q?funcionarios.filter(f=>normalizar(`${nombreFunc(f)} ${f.rutCompleto||''} ${f.profesion||''}`).includes(q)):funcionarios;
    const actual=instancia.idFuncionario?funcionarios.find(f=>f.idFuncionario===Number(instancia.idFuncionario)):null;
    const nombreActual=actual?nombreFunc(actual):instancia.nombreFuncionario;
    return(
      <Sheet open={open} onClose={onClose} title={`Asignar a ${instancia.label}`} anchoDesktop={560}>
        <FormularioPanel className="sgt-dp-form--fijo" pie={(
          <>
            <BotonDesktop variante="peligro" className="sgt-dp-acciones__izq" onClick={()=>{ onRemove(instancia.id); onClose(); }} title="Quitar rotativa del molde">
              <Trash2 size={13} strokeWidth={2.2} aria-hidden="true"/>Quitar del molde
            </BotonDesktop>
            {instancia.idFuncionario&&<BotonDesktop variante="secundario" onClick={()=>{ onUnassign(instancia.id); onClose(); }} title="Dejar esta rotativa sin funcionario">Vaciar</BotonDesktop>}
            <BotonDesktop variante="secundario" onClick={onClose}>Cancelar</BotonDesktop>
            <BotonDesktop variante="primario" icono="check" onClick={handle}>{instancia.idFuncionario?'Reasignar':'Asignar'}</BotonDesktop>
          </>
        )}>
          <div className="sgt-dp-resumen">
            <div className="sgt-dp-resumen__linea"><span className="sgt-dp-r">{instancia.label}</span><span className="sgt-dp-resumen__titulo">{instancia.nombreRotativa}</span></div>
            <div className="sgt-dp-resumen__detalle">{instancia.semanas} semanas · {totalTurnos} turnos por ciclo{instancia.nombrePuesto?` · ${instancia.nombrePuesto}`:''}</div>
            <div className="sgt-dp-resumen__actual">
              {instancia.idFuncionario?(
                <span className={`sgt-dp-avatar ${claseAvatar(instancia.nombrePuesto)}`} aria-hidden="true">{inicialesDeNombre(nombreActual)}</span>
              ):(
                <span className="sgt-dp-avatar sgt-dp-avatar--vacante" aria-hidden="true"><IconoKit name="plus" size={12} strokeWidth={2.8}/></span>
              )}
              <div style={{minWidth:0}}>
                <div className="sgt-d-seccion-titulo" style={{margin:0}}>Funcionario actual</div>
                <div className="sgt-dp-resumen__actual-nombre">{instancia.idFuncionario?nombreActual:'Vacante: sin funcionario'}</div>
              </div>
              {actual?.rutCompleto&&<span className="sgt-dp-opcion__meta" style={{marginLeft:'auto'}}>{actual.rutCompleto}</span>}
            </div>
          </div>
          {err&&<AvisoDesktop tono="aviso"><span role="alert">{err}</span></AvisoDesktop>}
          <BuscadorDesktop value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, RUT o profesión…" ariaLabel="Buscar funcionario" autoComplete="off"/>
          <section className="sgt-dp-seccion sgt-dp-seccion--llena" aria-label="Funcionarios del servicio">
            <div className="sgt-dp-seccion__cabecera">
              <span className="sgt-d-seccion-titulo">Funcionarios ({lista.length})</span>
              {idFuncionario&&String(idFuncionario)!==String(instancia.idFuncionario||'')&&<ChipDesktop tono="primario">1 seleccionado</ChipDesktop>}
            </div>
            <div className="sgt-dp-opciones sgt-dp-opciones--lista">
              {funcionarios.length===0?(
                <div className="sgt-dp-opciones__vacio">No hay funcionarios en este servicio.</div>
              ):lista.length===0?(
                <div className="sgt-dp-opciones__vacio">Nadie coincide con «{busqueda.trim()}».</div>
              ):lista.map(f=>{ const sel=String(f.idFuncionario)===idFuncionario; return(
                <button key={f.idFuncionario} type="button" className="sgt-dp-opcion sgt-dp-opcion--persona" aria-pressed={sel} onClick={()=>setIdFuncionario(String(f.idFuncionario))}>
                  <span className="sgt-dp-radio" aria-hidden="true">{sel&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</span>
                  <span className="sgt-dp-avatar" aria-hidden="true">{inicialesDe(f)}</span>
                  <span className="sgt-dp-opcion__texto"><span className="sgt-dp-opcion__titulo">{nombreFunc(f)}</span>{f.profesion&&<span className="sgt-dp-opcion__detalle">{f.profesion}</span>}</span>
                  <span className="sgt-dp-opcion__meta">{f.rutCompleto}</span>
                </button>
              );})}
            </div>
          </section>
        </FormularioPanel>
      </Sheet>
    );
  }

  return(
    <Sheet open={open} onClose={onClose} title={`Asignar a ${instancia.label}`} maxHeight="90%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'var(--surface2)',borderRadius:14,padding:14}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:10.5,fontWeight:900,color:'#fff',background:'var(--primary)',padding:'2px 7px',borderRadius:99}}>{instancia.label}</span><span style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{instancia.nombreRotativa}</span></div>
          <div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>{instancia.semanas} semanas · {totalTurnos} turnos<PuestoTag inst={instancia} size="xs"/></div>
        </div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Funcionario</span>
          {funcionarios.length===0?(
            <div style={{fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay funcionarios en este servicio.</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflow:'auto'}}>
              {funcionarios.map(f=>{ const selected=String(f.idFuncionario)===idFuncionario; const person={iniciales:inicialesDe(f)}; return(
                <button key={f.idFuncionario} onClick={()=>setIdFuncionario(String(f.idFuncionario))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?'var(--primary-soft)':'#fff',border:`1.5px solid ${selected?'var(--primary)':'var(--line)'}`,borderRadius:10,padding:'8px 10px',display:'flex',alignItems:'center',gap:10}}>
                  <SGTAvatar person={person} size={32}/>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:'var(--ink)'}}>{nombreFunc(f)}</div>{f.profesion&&<div style={{fontSize:10.5,color:'var(--ink3)',fontWeight:700,marginTop:1}}>{f.profesion}</div>}</div>
                  {selected&&<SGTIcon name="check-circle" size={18} color="var(--primary)"/>}
                </button>
              );})}
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{ onRemove(instancia.id); onClose(); }} title="Quitar rotativa del molde" style={{padding:'13px 14px',borderRadius:12,background:'#fff',color:'var(--warn)',border:'1.5px solid var(--warn)',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}><SGTIcon name="trash" size={15} color="var(--warn)"/></button>
          {instancia.idFuncionario&&<button onClick={()=>{ onUnassign(instancia.id); onClose(); }} style={{padding:'13px 14px',borderRadius:12,background:'#fff',color:'var(--ink2)',border:'1.5px solid var(--line)',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Vaciar</button>}
          <button onClick={handle} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:13,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
            <SGTIcon name="check" size={16} color="#fff"/> {instancia.idFuncionario?'Reasignar':'Asignar'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ─── ConfirmacionMovil (bottom sheet) ───────────────────────────────────────
   Mismo aspecto que las confirmaciones de Vigencias y de Eliminar turnos
   generados. La usan «Eliminar molde» y «Molde nuevo» con cambios sin guardar
   (R18-6e); en desktop, las mismas preguntas van en ConfirmacionPlan. */
function ConfirmacionMovil({titulo,children,etiquetaConfirmar,icono='trash',onConfirmar,onCancelar}){
  return(
    <div onClick={onCancelar} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}}>
      <div role="alertdialog" aria-modal="true" aria-label={titulo} onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'8px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'}}>
        <div style={{display:'flex',justifyContent:'center',paddingBottom:14}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><div style={{width:56,height:56,borderRadius:16,background:'var(--warn-soft)',display:'grid',placeItems:'center'}}><SGTIcon name={icono} size={26} color="var(--warn)"/></div></div>
        <div style={{fontWeight:800,fontSize:18,color:'var(--ink)',textAlign:'center',marginBottom:10}}>{titulo}</div>
        <div style={{fontSize:14,color:'var(--ink2)',margin:'0 0 22px',lineHeight:1.5,textAlign:'center'}}>{children}</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onCancelar} style={{flex:1,padding:'13px 0',borderRadius:12,border:'1.5px solid var(--line)',background:'none',color:'var(--ink2)',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={onConfirmar} style={{flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'var(--warn)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{etiquetaConfirmar}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MoldesSheet (guardar / cargar / eliminar contra el backend) ───────────── */
function MoldesSheet({open,onClose,onSave,onLoad,onDelete,instancias,moldes,loading,nombreInicial,planActualId}){
  const{esDesktop}=useLayout();
  const[tab,setTab]=useState('guardar');
  const[nombre,setNombre]=useState('');
  const[err,setErr]=useState('');
  // Confirmación antes de eliminar un molde, en desktop y en móvil (R18-6e):
  // eliminar borra el molde en el backend.
  const[porEliminar,setPorEliminar]=useState(null);
  useEffect(()=>{ if(open){ setTab('guardar'); setNombre(nombreInicial||''); setErr(''); } },[open,nombreInicial]);
  useEffect(()=>{ if(!open)setPorEliminar(null); },[open]);
  if(!open)return null;

  const totalTurnos=instancias.reduce((a,i)=>a+(i.secuencia||[]).reduce((s,d)=>s+d.length,0),0);
  const pend=instancias.filter(i=>!i.idFuncionario).length;

  const handleSave=()=>{ if(!nombre.trim())return setErr('Ponle un nombre al molde.'); if(instancias.length===0)return setErr('Agrega al menos una rotativa.'); setErr(''); onSave(nombre.trim()); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  const tabBtn=(key,icon,label)=>{ const active=tab===key; return <button onClick={()=>setTab(key)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 8px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',background:active?'#fff':'transparent',border:'none',color:active?'var(--primary)':'var(--ink3)',fontSize:13,fontWeight:800,boxShadow:active?'0 1px 3px rgba(15,23,42,0.10)':'none'}}><SGTIcon name={icon} size={15} color={active?'var(--primary)':'var(--ink3)'}/>{label}</button>; };

  // Desktop (R18): guardar el molde actual y los moldes guardados, a la vista
  // en el mismo panel (sin pestañas).
  if(esDesktop){
    return(
      <>
        <Sheet open={open} onClose={onClose} title="Moldes de planificación" anchoDesktop={560}>
          <FormularioPanel>
            <section className="sgt-dp-seccion" aria-label="Molde actual">
              <div className="sgt-d-seccion-titulo">{planActualId?`Actualizar «${nombreInicial||'molde'}»`:'Guardar el molde actual'}</div>
              <div className="sgt-dp-minis">
                <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Rotativas</div><div className="sgt-dp-mini__valor">{instancias.length}</div></div>
                <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Turnos</div><div className="sgt-dp-mini__valor">{formatoNumero(totalTurnos)}</div></div>
                <div className={`sgt-dp-mini${pend>0?' sgt-dp-mini--aviso':''}`}><div className="sgt-dp-mini__etiqueta">Sin asignar</div><div className="sgt-dp-mini__valor">{pend}</div></div>
              </div>
              {pend>0&&<AvisoDesktop tono="aviso">Hay {pend} rotativa{pend===1?'':'s'} sin funcionario. Puedes guardar igual.</AvisoDesktop>}
              {err&&<AvisoDesktop tono="aviso"><span role="alert">{err}</span></AvisoDesktop>}
              <form className="sgt-dp-fila-campos" onSubmit={(e)=>{ e.preventDefault(); handleSave(); }}>
                <CampoDesktop etiqueta="Nombre del molde" htmlFor="sgt-dp-nombre-molde">
                  <input id="sgt-dp-nombre-molde" className="sgt-d-input" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. UCI · Mayo 2026" autoComplete="off"/>
                </CampoDesktop>
                <BotonDesktop type="submit" variante="primario" icono="check">{planActualId?'Actualizar molde':'Guardar molde'}</BotonDesktop>
              </form>
            </section>

            <section className="sgt-dp-seccion" aria-label="Moldes guardados">
              <div className="sgt-dp-seccion__cabecera">
                <span className="sgt-d-seccion-titulo">Moldes guardados del servicio</span>
                {!loading&&<ChipDesktop>{moldes.length}</ChipDesktop>}
              </div>
              <p className="sgt-dp-ayuda" style={{margin:0}}>Cargar un molde reemplaza las rotativas que ves ahora en la pantalla.</p>
              {loading?(
                <div className="sgt-dp-cargando" role="status" aria-busy="true">
                  {[70,52].map(w=><div key={w} className="sgt-d-cargando" style={{width:`${w}%`}}/>)}
                  <span className="sgt-dp-visualmente-oculto">Cargando…</span>
                </div>
              ):moldes.length===0?(
                <div className="sgt-dp-opciones__vacio" style={{border:'1px dashed var(--line)',borderRadius:12}}>No hay moldes guardados todavía.</div>
              ):(
                <div className="sgt-dp-lista">
                  {moldes.map(pl=>{ const asignadas=(pl.asignaciones||[]).filter(a=>a.idFuncionario).length; const actual=pl.idPlanificacion===planActualId; return(
                    <div key={pl.idPlanificacion} className={`sgt-dp-item${actual?' sgt-dp-item--actual':''}`}>
                      <span className="sgt-dp-item__icono" aria-hidden="true"><SGTIcon name="calendar" size={16} color="var(--primary)"/></span>
                      <div className="sgt-dp-item__texto">
                        <div className="sgt-dp-item__titulo"><span>{pl.nombre}</span>{actual&&<ChipDesktop tono="primario" mayus>En pantalla</ChipDesktop>}</div>
                        <div className="sgt-dp-item__detalle">{(pl.asignaciones||[]).length} rotativas · {asignadas} asignadas</div>
                      </div>
                      <BotonDesktop tamano="sm" variante="secundario" onClick={()=>onLoad(pl.idPlanificacion)} aria-label={`Cargar molde ${pl.nombre}`}>
                        <FolderOpen size={12} strokeWidth={2.2} aria-hidden="true"/>Cargar
                      </BotonDesktop>
                      <BotonDesktop tamano="sm" variante="peligro" className="sgt-d-btn--icono" onClick={()=>setPorEliminar(pl)} aria-label={`Eliminar molde ${pl.nombre}`} title="Eliminar molde">
                        <Trash2 size={12} strokeWidth={2.2} aria-hidden="true"/>
                      </BotonDesktop>
                    </div>
                  );})}
                </div>
              )}
            </section>
          </FormularioPanel>
        </Sheet>
        {porEliminar&&(
          <ConfirmacionPlan
            titulo="¿Eliminar molde?"
            tono="peligro"
            icono={<Trash2 size={15} strokeWidth={2.2}/>}
            etiquetaConfirmar="Sí, eliminar"
            onCancelar={()=>setPorEliminar(null)}
            onConfirmar={()=>{ const pl=porEliminar; setPorEliminar(null); onDelete(pl); }}
          >
            <p>Se eliminará el molde <strong>{porEliminar.nombre}</strong> con sus {(porEliminar.asignaciones||[]).length} rotativas asignadas.</p>
            <p>Si tiene una vigencia activa, el sistema no lo permitirá: primero hay que anularla en «Vigencias».</p>
          </ConfirmacionPlan>
        )}
      </>
    );
  }

  return(
    <>
    <Sheet open={open} onClose={onClose} title="Moldes de planificación" maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',gap:4,background:'var(--surface2)',borderRadius:12,padding:4}}>
          {tabBtn('guardar','check-circle',planActualId?'Actualizar':'Guardar')}
          {tabBtn('cargar','calendar',`Cargar${moldes.length?` (${moldes.length})`:''}`)}
        </div>
        {err&&tab==='guardar'&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        {tab==='guardar'?(
          <Fragment>
            <div style={{display:'flex',gap:8}}>
              {[['calendar','var(--primary)','var(--primary-soft)',instancias.length,'Rotativas'],['clock','var(--accent)','var(--accent-soft)',totalTurnos,'Turnos'],['user','var(--warn)','var(--warn-soft)',pend,'Sin asignar']].map(([icon,ink,bg,n,label])=>(
                <div key={label} style={{flex:1,background:'var(--surface2)',borderRadius:12,padding:'11px 10px',textAlign:'center'}}>
                  <div style={{width:28,height:28,borderRadius:8,background:bg,display:'grid',placeItems:'center',margin:'0 auto 6px'}}><SGTIcon name={icon} size={15} color={ink}/></div>
                  <div style={{fontSize:17,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div>
                  <div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            {pend>0&&<div style={{display:'flex',alignItems:'flex-start',gap:8,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12,fontWeight:700}}><SGTIcon name="alert" size={14} color="var(--warn)"/><span>Hay {pend} rotativa{pend===1?'':'s'} sin funcionario. Puedes guardar igual.</span></div>}
            <div><span style={lbl}>Nombre del molde</span><input value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus placeholder="Ej. UCI · Mayo 2026" style={{width:'100%',padding:'12px 13px',borderRadius:10,border:'1.5px solid var(--line)',fontSize:14,fontWeight:700,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none'}}/></div>
            <button onClick={handleSave} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}><SGTIcon name="check" size={16} color="#fff"/> {planActualId?'Actualizar molde':'Guardar molde'}</button>
          </Fragment>
        ):(
          <Fragment>
            <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>Carga un molde guardado. Reemplazará las rotativas actuales.</div>
            {loading?(
              <div style={{padding:22,textAlign:'center',fontSize:12.5,color:'var(--ink3)',fontWeight:600}}>Cargando…</div>
            ):moldes.length===0?(
              <div style={{padding:22,background:'var(--surface2)',borderRadius:12,border:'1px dashed var(--line)',textAlign:'center',fontSize:12.5,color:'var(--ink3)',fontWeight:600}}>No hay moldes guardados todavía.</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {moldes.map(pl=>{ const asignadas=(pl.asignaciones||[]).filter(a=>a.idFuncionario).length; return(
                  <div key={pl.idPlanificacion} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',background:'#fff',borderRadius:12,border:'1.5px solid var(--line)'}}>
                    <div style={{width:38,height:38,borderRadius:11,background:'var(--primary-soft)',display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="calendar" size={18} color="var(--primary)"/></div>
                    <button onClick={()=>onLoad(pl.idPlanificacion)} style={{flex:1,minWidth:0,textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pl.nombre}</div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--ink3)',marginTop:2}}>{(pl.asignaciones||[]).length} rotativas · {asignadas} asignadas</div>
                    </button>
                    <button onClick={()=>setPorEliminar(pl)} title="Eliminar molde" aria-label={`Eliminar molde ${pl.nombre}`} style={{background:'var(--warn-soft)',border:'none',borderRadius:9,width:32,height:32,display:'grid',placeItems:'center',cursor:'pointer',flexShrink:0}}><SGTIcon name="trash" size={15} color="var(--warn)"/></button>
                  </div>
                );})}
              </div>
            )}
          </Fragment>
        )}
      </div>
    </Sheet>
    {porEliminar&&(
      <ConfirmacionMovil
        titulo="¿Eliminar molde?"
        etiquetaConfirmar="Sí, eliminar"
        onCancelar={()=>setPorEliminar(null)}
        onConfirmar={()=>{ const pl=porEliminar; setPorEliminar(null); onDelete(pl); }}
      >
        Se eliminará el molde <strong style={{color:'var(--ink)'}}>{porEliminar.nombre}</strong> con sus {(porEliminar.asignaciones||[]).length} rotativas asignadas. Si tiene una vigencia activa, el sistema no lo permitirá: primero hay que anularla en «Vigencias».
      </ConfirmacionMovil>
    )}
    </>
  );
}

/* ─── EliminarTurnosSheet (deshacer una generación por rango de fechas) ─────── */
// C-22 (17 oct 2026): el texto dice lo que hace el backend
// (PlanificacionService.eliminarTurnosGenerados): borra por las rotativas del
// molde dentro del rango, sin mirar qué generó cada turno, y no anula vigencias.
const TEXTO_VIGENCIAS='Para las generaciones nuevas conviene usar «Vigencias» (eliminar desde una fecha o anular), que borra solo los turnos de esa vigencia.';
function EliminarTurnosSheet({open,onClose,onConfirm,eliminando,nombreMolde}){
  const{esDesktop}=useLayout();
  const[fechaInicio,setFechaInicio]=useState('');
  const[fechaFin,setFechaFin]=useState('');
  const[err,setErr]=useState('');
  const[confirmando,setConfirmando]=useState(false);
  useEffect(()=>{ if(open){ setFechaInicio(''); setFechaFin(''); setErr(''); setConfirmando(false); } },[open]);
  if(!open)return null;
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  const inputSt={width:'100%',padding:'12px 13px',borderRadius:10,border:'1.5px solid var(--line)',fontSize:14,fontWeight:700,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none'};

  const handle=()=>{
    if(!fechaInicio||!fechaFin)return setErr('Indica fecha de inicio y fecha de fin.');
    if(fechaFin<fechaInicio)return setErr('La fecha de fin no puede ser anterior a la de inicio.');
    setErr(''); setConfirmando(true);
  };

  // Desktop (R18): rango en el panel lateral; la confirmación, centrada.
  if(esDesktop){
    return(
      <>
        <Sheet open={open} onClose={()=>!eliminando&&onClose()} title="Eliminar turnos generados" anchoDesktop={520}>
          <FormularioPanel pie={(
            <>
              <BotonDesktop variante="secundario" onClick={()=>!eliminando&&onClose()} disabled={eliminando}>Cancelar</BotonDesktop>
              <BotonDesktop variante="peligro-solido" onClick={handle} disabled={eliminando}><Trash2 size={14} strokeWidth={2.2} aria-hidden="true"/>Eliminar turnos del rango</BotonDesktop>
            </>
          )}>
            <p className="sgt-dp-texto">Borra (deja fuera de la agenda) todos los turnos de las rotativas de <strong>{nombreMolde||'este molde'}</strong> que empiezan dentro del rango de fechas, sin mirar qué los generó: también los de otros moldes que usen esas mismas rotativas y los asignados a mano con ellas. No anula ninguna vigencia.</p>
            <AvisoDesktop>{TEXTO_VIGENCIAS}</AvisoDesktop>
            {err&&<AvisoDesktop tono="aviso"><span role="alert">{err}</span></AvisoDesktop>}
            <div className="sgt-d-formulario">
              <CampoDesktop etiqueta="Desde" htmlFor="sgt-dp-eliminar-desde">
                <input id="sgt-dp-eliminar-desde" type="date" className="sgt-d-input" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}/>
              </CampoDesktop>
              <CampoDesktop etiqueta="Hasta" htmlFor="sgt-dp-eliminar-hasta">
                <input id="sgt-dp-eliminar-hasta" type="date" className="sgt-d-input" value={fechaFin} onChange={e=>setFechaFin(e.target.value)}/>
              </CampoDesktop>
            </div>
          </FormularioPanel>
        </Sheet>
        {confirmando&&(
          <ConfirmacionPlan
            titulo="¿Eliminar estos turnos?"
            tono="peligro"
            icono={<Trash2 size={15} strokeWidth={2.2}/>}
            etiquetaConfirmar="Sí, eliminar"
            etiquetaOcupado="Eliminando…"
            ocupado={eliminando}
            onCancelar={()=>setConfirmando(false)}
            onConfirmar={()=>onConfirm(fechaInicio,fechaFin)}
          >
            Se eliminarán todos los turnos de las rotativas de este molde que empiezan entre el <strong>{fechaCorta(fechaInicio)}</strong> y el <strong>{fechaCorta(fechaFin)}</strong>, también los de otros moldes que usen esas rotativas. Esta acción no se puede deshacer desde la app.
          </ConfirmacionPlan>
        )}
      </>
    );
  }

  return(
    <Sheet open={open} onClose={()=>!eliminando&&onClose()} title="Eliminar turnos generados" maxHeight="80%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>
          Borra (deja fuera de la agenda) todos los turnos de las rotativas de <strong style={{color:'var(--ink)'}}>{nombreMolde||'este molde'}</strong> que empiezan dentro del rango de fechas, sin mirar qué los generó: también los de otros moldes que usen esas mismas rotativas y los asignados a mano con ellas. No anula ninguna vigencia.
        </div>
        <div style={{fontSize:12,color:'var(--ink2)',fontWeight:600,lineHeight:1.4,background:'var(--surface2)',borderRadius:10,padding:'10px 12px'}}>{TEXTO_VIGENCIAS}</div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Desde</span>
          <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={inputSt}/>
        </div>
        <div>
          <span style={lbl}>Hasta</span>
          <input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} style={inputSt}/>
        </div>
        <button onClick={handle} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--warn)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="trash" size={16} color="#fff"/> Eliminar turnos del rango
        </button>
      </div>

      {confirmando&&(
        <div onClick={()=>!eliminando&&setConfirmando(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'8px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'}}>
            <div style={{display:'flex',justifyContent:'center',paddingBottom:14}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><div style={{width:56,height:56,borderRadius:16,background:'var(--warn-soft)',display:'grid',placeItems:'center'}}><SGTIcon name="trash" size={26} color="var(--warn)"/></div></div>
            <div style={{fontWeight:800,fontSize:18,color:'var(--ink)',textAlign:'center',marginBottom:10}}>¿Eliminar estos turnos?</div>
            <p style={{fontSize:14,color:'var(--ink2)',margin:'0 0 22px',lineHeight:1.5,textAlign:'center'}}>Se eliminarán todos los turnos de las rotativas de este molde que empiezan entre el <strong style={{color:'var(--ink)'}}>{fechaCorta(fechaInicio)}</strong> y el <strong style={{color:'var(--ink)'}}>{fechaCorta(fechaFin)}</strong>, también los de otros moldes que usen esas rotativas. Esta acción no se puede deshacer desde la app.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmando(false)} disabled={eliminando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'1.5px solid var(--line)',background:'none',color:'var(--ink2)',fontSize:15,fontWeight:700,cursor:eliminando?'not-allowed':'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={()=>onConfirm(fechaInicio,fechaFin)} disabled={eliminando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'var(--warn)',color:'#fff',fontSize:15,fontWeight:700,cursor:eliminando?'not-allowed':'pointer',opacity:eliminando?0.7:1,fontFamily:'inherit'}}>{eliminando?'Eliminando…':'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ─── VigenciasSheet (historial de vigencias: acortar / anular / editar desde fecha) ── */
function VigenciasSheet({open,onClose,ejecuciones,cargando,onAcortar,onAnular,onEditarDesde,procesando,moldeActualId,nombreMoldeActual}){
  const{esDesktop}=useLayout();
  const[confirmAnular,setConfirmAnular]=useState(null);
  const[acortarId,setAcortarId]=useState(null);
  const[fechaEliminarDesde,setFechaEliminarDesde]=useState('');
  const[editDesde,setEditDesde]=useState('');
  const[editHasta,setEditHasta]=useState('');
  const[errEdit,setErrEdit]=useState('');

  useEffect(()=>{
    if(!open){ setConfirmAnular(null); setAcortarId(null); setFechaEliminarDesde(''); setEditDesde(''); setEditHasta(''); setErrEdit(''); }
  },[open]);
  if(!open)return null;

  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  const inputSt={width:'100%',padding:'11px 12px',borderRadius:9,border:'1.5px solid var(--line)',fontSize:13.5,fontWeight:700,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box'};
  const hoyStr=toDateStr(new Date());
  const hayActivaDelMoldeActual=(ejecuciones||[]).some(e=>e.estado==='ACTIVA'&&e.idPlanificacion===moldeActualId);

  const confirmarEditar=()=>{
    if(!editDesde||!editHasta)return setErrEdit('Indica ambas fechas.');
    if(editDesde<hoyStr)return setErrEdit('La fecha desde no puede ser anterior a hoy.');
    if(editHasta<editDesde)return setErrEdit('La fecha de término debe ser igual o posterior a la fecha desde.');
    setErrEdit('');
    onEditarDesde(editDesde,editHasta);
  };

  // Desktop (R18): historial de vigencias en el panel lateral ancho; anular se
  // confirma en un diálogo centrado.
  if(esDesktop){
    return(
      <>
        <Sheet open={open} onClose={()=>!procesando&&onClose()} title="Vigencias del servicio" anchoDesktop="lg">
          <FormularioPanel>
            <p className="sgt-dp-texto">Todas las planificaciones vigentes o históricas de <strong>este servicio</strong> (de cualquier molde). Solo puede haber una vigencia <strong>activa</strong> a la vez por servicio; eliminar o anular una nunca afecta a otra.</p>
            {cargando?(
              <div className="sgt-dp-cargando" role="status" aria-busy="true">
                {[80,64,72].map(w=><div key={w} className="sgt-d-cargando" style={{width:`${w}%`}}/>)}
                <span className="sgt-dp-visualmente-oculto">Cargando vigencias…</span>
              </div>
            ):(ejecuciones||[]).length===0?(
              <EstadoVacioDesktop icono="clock" titulo="Sin vigencias" texto="Aún no se ha generado ninguna vigencia para este servicio."/>
            ):(
              <div className="sgt-dp-lista">
                {ejecuciones.map(e=>{
                  const activa=e.estado==='ACTIVA';
                  const enModoAcortar=acortarId===e.idEjecucion;
                  const minEliminar=toDateStr(new Date(Math.max(parseLocalDate(e.fechaInicioEfectiva).getTime()+86400000,parseLocalDate(hoyStr).getTime())));
                  return(
                    <article key={e.idEjecucion} className={`sgt-dp-vigencia ${activa?'sgt-dp-vigencia--activa':'sgt-dp-vigencia--anulada'}`} aria-label={`Vigencia ${activa?'activa':'anulada'} de ${e.nombrePlanificacion||'molde eliminado'}`}>
                      <div className="sgt-dp-vigencia__cabecera">
                        <ChipDesktop tono={activa?'exito':'neutral'} mayus>{activa?'Activa':'Anulada'}</ChipDesktop>
                        <span className="sgt-dp-vigencia__nombre">{e.nombrePlanificacion||'(molde eliminado)'}</span>
                        <span className="sgt-dp-vigencia__rango">{fechaCorta(e.fechaInicioEfectiva)} → {fechaCorta(e.fechaFinEfectiva)}</span>
                      </div>
                      <div className="sgt-dp-vigencia__meta">
                        Ancla de rotativa: {fechaCorta(e.fechaInicioRotativa)}{e.fechaGeneracion?` · Generada: ${fechaHora(e.fechaGeneracion)}`:''}{e.nombreActor?` · ${e.nombreActor}`:''}
                      </div>
                      {activa&&!enModoAcortar&&(
                        <div className="sgt-dp-acciones" style={{justifyContent:'flex-start',marginTop:2}}>
                          <BotonDesktop tamano="sm" variante="secundario" onClick={()=>{setAcortarId(e.idEjecucion);setFechaEliminarDesde(minEliminar);}} disabled={procesando}>Eliminar desde fecha</BotonDesktop>
                          <BotonDesktop tamano="sm" variante="peligro" onClick={()=>setConfirmAnular(e.idEjecucion)} disabled={procesando}>Anular todo</BotonDesktop>
                        </div>
                      )}
                      {activa&&enModoAcortar&&(
                        <div className="sgt-dp-vigencia__acortar">
                          <div className="sgt-dp-fila-campos">
                            <CampoDesktop etiqueta="Eliminar turnos desde" htmlFor={`sgt-dp-acortar-${e.idEjecucion}`}>
                              <input id={`sgt-dp-acortar-${e.idEjecucion}`} type="date" className="sgt-d-input" value={fechaEliminarDesde} min={minEliminar} max={e.fechaFinEfectiva} onChange={ev=>setFechaEliminarDesde(ev.target.value)}/>
                            </CampoDesktop>
                            <BotonDesktop variante="secundario" onClick={()=>setAcortarId(null)} disabled={procesando}>Cancelar</BotonDesktop>
                            <BotonDesktop variante="peligro-solido" onClick={()=>{onAcortar(e.idEjecucion,fechaEliminarDesde);setAcortarId(null);}} disabled={procesando||!fechaEliminarDesde}>Confirmar</BotonDesktop>
                          </div>
                          <div className="sgt-dp-ayuda">Se eliminarán los turnos desde esa fecha en adelante (no antes de hoy). Los anteriores quedan intactos.</div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {moldeActualId&&hayActivaDelMoldeActual&&(
              <section className="sgt-dp-tarjeta-suave" aria-label={`Editar ${nombreMoldeActual||'el molde'} desde una fecha`}>
                <div className="sgt-dp-tarjeta-suave__titulo">Editar "{nombreMoldeActual}" desde una fecha</div>
                <p className="sgt-dp-texto">Aplica <strong>las asignaciones actuales del molde cargado</strong> (las que ves ahora en la pantalla principal) desde la fecha que elijas en adelante. La vigencia activa del servicio se acorta o anula automáticamente hasta el día anterior, conservando el mismo ancla de rotativa; los turnos anteriores a esa fecha no se tocan.</p>
                {errEdit&&<AvisoDesktop tono="aviso"><span role="alert">{errEdit}</span></AvisoDesktop>}
                <div className="sgt-dp-fila-campos">
                  <CampoDesktop etiqueta="Desde" htmlFor="sgt-dp-editar-desde">
                    <input id="sgt-dp-editar-desde" type="date" className="sgt-d-input" value={editDesde} min={hoyStr} onChange={e=>setEditDesde(e.target.value)}/>
                  </CampoDesktop>
                  <CampoDesktop etiqueta="Hasta (nuevo fin efectivo)" htmlFor="sgt-dp-editar-hasta">
                    <input id="sgt-dp-editar-hasta" type="date" className="sgt-d-input" value={editHasta} min={editDesde||hoyStr} onChange={e=>setEditHasta(e.target.value)}/>
                  </CampoDesktop>
                </div>
                <div className="sgt-dp-acciones">
                  <BotonDesktop variante="primario" icono="check" onClick={confirmarEditar} disabled={procesando}>{procesando?'Aplicando…':'Aplicar cambios desde esta fecha'}</BotonDesktop>
                </div>
              </section>
            )}
            {moldeActualId&&!hayActivaDelMoldeActual&&(
              <p className="sgt-dp-ayuda" style={{margin:0,textAlign:'center'}}>"{nombreMoldeActual}" no tiene una vigencia activa todavía — usa "Generar" para crear la primera.</p>
            )}
          </FormularioPanel>
        </Sheet>
        {confirmAnular!=null&&(
          <ConfirmacionPlan
            titulo="¿Anular esta vigencia?"
            tono="peligro"
            icono="alert"
            etiquetaConfirmar="Sí, anular"
            etiquetaOcupado="Anulando…"
            ocupado={procesando}
            onCancelar={()=>setConfirmAnular(null)}
            onConfirmar={()=>{onAnular(confirmAnular);setConfirmAnular(null);}}
          >
            Se eliminarán (soft-delete) todos los turnos que esta vigencia generó. No afecta otras vigencias, otras planificaciones ni turnos manuales. Esta acción no se puede deshacer desde la app.
          </ConfirmacionPlan>
        )}
      </>
    );
  }

  return(
    <Sheet open={open} onClose={()=>!procesando&&onClose()} title="Vigencias del servicio" maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>
          Todas las planificaciones vigentes o históricas de <strong style={{color:'var(--ink)'}}>este servicio</strong> (de cualquier molde). Solo puede haber una vigencia <strong style={{color:'var(--ink)'}}>activa</strong> a la vez por servicio; eliminar o anular una nunca afecta a otra.
        </div>

        {cargando?(
          <div style={{textAlign:'center',padding:20,color:'var(--ink3)',fontSize:12.5,fontWeight:600}}>Cargando vigencias…</div>
        ):(ejecuciones||[]).length===0?(
          <div style={{textAlign:'center',padding:20,color:'var(--ink3)',fontSize:12.5,fontWeight:600}}>Aún no se ha generado ninguna vigencia para este servicio.</div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ejecuciones.map(e=>{
              const activa=e.estado==='ACTIVA';
              const enModoAcortar=acortarId===e.idEjecucion;
              const minEliminar=toDateStr(new Date(Math.max(parseLocalDate(e.fechaInicioEfectiva).getTime()+86400000,parseLocalDate(hoyStr).getTime())));
              return(
                <div key={e.idEjecucion} style={{background:'#fff',border:`1.5px solid ${activa?'var(--primary-soft)':'var(--line2)'}`,borderRadius:12,padding:'12px 14px',opacity:activa?1:0.65}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <SGTBadge tone={activa?'success':'neutral'} size="xs">{activa?'Activa':'Anulada'}</SGTBadge>
                    <span style={{fontSize:13,fontWeight:800,color:'var(--ink)'}}>{e.nombrePlanificacion||'(molde eliminado)'}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--ink3)'}}>{e.fechaInicioEfectiva} → {e.fechaFinEfectiva}</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--ink3)',fontWeight:600}}>
                    Ancla de rotativa: {e.fechaInicioRotativa}{e.fechaGeneracion?` · Generada: ${String(e.fechaGeneracion).slice(0,16).replace('T',' ')}`:''}{e.nombreActor?` · ${e.nombreActor}`:''}
                  </div>

                  {activa&&!enModoAcortar&&(
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <button onClick={()=>{setAcortarId(e.idEjecucion);setFechaEliminarDesde(minEliminar);}} disabled={procesando} style={{flex:1,padding:'9px 0',borderRadius:9,border:'1.5px solid var(--line)',background:'#fff',color:'var(--ink2)',fontSize:12.5,fontWeight:800,cursor:procesando?'not-allowed':'pointer',fontFamily:'inherit'}}>Eliminar desde fecha</button>
                      <button onClick={()=>setConfirmAnular(e.idEjecucion)} disabled={procesando} style={{flex:1,padding:'9px 0',borderRadius:9,border:'1.5px solid var(--warn)',background:'var(--warn-soft)',color:'var(--warn)',fontSize:12.5,fontWeight:800,cursor:procesando?'not-allowed':'pointer',fontFamily:'inherit'}}>Anular todo</button>
                    </div>
                  )}

                  {activa&&enModoAcortar&&(
                    <div style={{marginTop:10}}>
                      <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
                        <div style={{flex:'1 1 160px'}}>
                          <span style={lbl}>Eliminar turnos desde</span>
                          <input type="date" value={fechaEliminarDesde} min={minEliminar} max={e.fechaFinEfectiva} onChange={ev=>setFechaEliminarDesde(ev.target.value)} style={inputSt}/>
                        </div>
                        <button onClick={()=>setAcortarId(null)} disabled={procesando} style={{padding:'11px 12px',borderRadius:9,border:'1.5px solid var(--line)',background:'#fff',color:'var(--ink2)',fontSize:12.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
                        <button onClick={()=>{onAcortar(e.idEjecucion,fechaEliminarDesde);setAcortarId(null);}} disabled={procesando||!fechaEliminarDesde} style={{padding:'11px 14px',borderRadius:9,border:'none',background:'var(--warn)',color:'#fff',fontSize:12.5,fontWeight:800,cursor:procesando?'not-allowed':'pointer',fontFamily:'inherit'}}>Confirmar</button>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--ink3)',fontWeight:600,marginTop:6}}>Se eliminarán los turnos desde esa fecha en adelante (no antes de hoy). Los anteriores quedan intactos.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {moldeActualId&&hayActivaDelMoldeActual&&(
          <div style={{background:'var(--surface2)',borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
            <div style={{fontSize:12.5,fontWeight:800,color:'var(--ink)'}}>Editar "{nombreMoldeActual}" desde una fecha</div>
            <div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>
              Aplica <strong style={{color:'var(--ink)'}}>las asignaciones actuales del molde cargado</strong> (las que ves ahora en la pantalla principal) desde la fecha que elijas en adelante. La vigencia activa del servicio se acorta o anula automáticamente hasta el día anterior, conservando el mismo ancla de rotativa; los turnos anteriores a esa fecha no se tocan.
            </div>
            {errEdit&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'9px 11px',fontSize:12,fontWeight:700}}><SGTIcon name="alert" size={13}/>{errEdit}</div>}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <div style={{flex:'1 1 140px'}}>
                <span style={lbl}>Desde</span>
                <input type="date" value={editDesde} min={hoyStr} onChange={e=>setEditDesde(e.target.value)} style={inputSt}/>
              </div>
              <div style={{flex:'1 1 140px'}}>
                <span style={lbl}>Hasta (nuevo fin efectivo)</span>
                <input type="date" value={editHasta} min={editDesde||hoyStr} onChange={e=>setEditHasta(e.target.value)} style={inputSt}/>
              </div>
            </div>
            <button onClick={confirmarEditar} disabled={procesando} style={{padding:13,borderRadius:11,border:'none',background:'var(--primary)',color:'#fff',fontSize:13.5,fontWeight:800,cursor:procesando?'not-allowed':'pointer',fontFamily:'inherit'}}>{procesando?'Aplicando…':'Aplicar cambios desde esta fecha'}</button>
          </div>
        )}
        {moldeActualId&&!hayActivaDelMoldeActual&&(
          <div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4,textAlign:'center',padding:'4px 8px'}}>
            "{nombreMoldeActual}" no tiene una vigencia activa todavía — usa "Generar" para crear la primera.
          </div>
        )}
      </div>

      {confirmAnular!=null&&(
        <div onClick={()=>!procesando&&setConfirmAnular(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:320}}>
          <div onClick={ev=>ev.stopPropagation()} style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'8px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'}}>
            <div style={{display:'flex',justifyContent:'center',paddingBottom:14}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><div style={{width:56,height:56,borderRadius:16,background:'var(--warn-soft)',display:'grid',placeItems:'center'}}><SGTIcon name="alert" size={26} color="var(--warn)"/></div></div>
            <div style={{fontWeight:800,fontSize:18,color:'var(--ink)',textAlign:'center',marginBottom:10}}>¿Anular esta vigencia?</div>
            <p style={{fontSize:14,color:'var(--ink2)',margin:'0 0 22px',lineHeight:1.5,textAlign:'center'}}>Se eliminarán (soft-delete) todos los turnos que esta vigencia generó. No afecta otras vigencias, otras planificaciones ni turnos manuales. Esta acción no se puede deshacer desde la app.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmAnular(null)} disabled={procesando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'1.5px solid var(--line)',background:'none',color:'var(--ink2)',fontSize:15,fontWeight:700,cursor:procesando?'not-allowed':'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={()=>{onAnular(confirmAnular);setConfirmAnular(null);}} disabled={procesando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'var(--warn)',color:'#fff',fontSize:15,fontWeight:700,cursor:procesando?'not-allowed':'pointer',opacity:procesando?0.7:1,fontFamily:'inherit'}}>{procesando?'Anulando…':'Sí, anular'}</button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ─── DetalleDiaSheet (Semana X · Día, agrupado por tipo real) ─────────────── */
function DetalleDiaSheet({open,onClose,diaIndex,entradasDelDia,tipoColor,onAssignInstance,tonoTipo,funcionarios}){
  const{esDesktop}=useLayout();
  if(!open||diaIndex==null)return null;
  const grupos=buildDayCoverage(entradasDelDia);
  const semana=Math.floor(diaIndex/7)+1, dl=DIA_NOMBRE[diaIndex%7];

  // Desktop (R18): el equipo del día por tipo de turno (vacantes primero), como
  // el panel del día del Centro de operaciones. Cada persona o vacante abre su
  // asignación.
  if(esDesktop){
    const porId=new Map((funcionarios||[]).map(f=>[Number(f.idFuncionario),f]));
    const tono=tonoTipo||crearTonoTipo([]);
    const totalAsig=grupos.reduce((a,g)=>a+g.asignadas.length,0);
    const totalVac=grupos.reduce((a,g)=>a+g.pendientes.length,0);
    return(
      <Sheet open={open} onClose={onClose} title={`Semana ${semana} · ${dl}`} anchoDesktop={560}>
        <FormularioPanel>
          {grupos.length===0?(
            <EstadoVacioDesktop icono="calendar" titulo="Día libre" texto="Ninguna rotativa del molde tiene turno este día."/>
          ):(
            <div className="sgt-dp-minis">
              <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Asignados</div><div className="sgt-dp-mini__valor">{totalAsig}</div></div>
              <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Total</div><div className="sgt-dp-mini__valor">{totalAsig+totalVac}</div></div>
              <div className={`sgt-dp-mini${totalVac?' sgt-dp-mini--alerta':''}`}><div className="sgt-dp-mini__etiqueta">Vacantes</div><div className="sgt-dp-mini__valor">{totalVac}</div></div>
            </div>
          )}
          {grupos.map(({tipo,asignadas,pendientes})=>{
            const t=tono(tipo); const total=asignadas.length+pendientes.length;
            return(
              <section key={tipo.idTipoTurno} className={`sgt-dp-grupo sgt-dp-grupo--${t.clase}`} aria-label={`${tipo.nombre} ${rangoHoras(tipo)}`}>
                <div className={`sgt-dp-grupo__cabecera sgt-dp-bloque--${t.clase}`} style={t.estilo}>
                  <IconoKit name={t.icono} size={13} strokeWidth={2.4}/>
                  <span className="sgt-dp-grupo__titulo">{tipo.nombre} · {rangoHoras(tipo)}</span>
                  {pendientes.length>0?<ChipDesktop tono="alerta" mayus>{pendientes.length} vacante{pendientes.length===1?'':'s'}</ChipDesktop>:<ChipDesktop tono="exito" mayus>Completo</ChipDesktop>}
                  <span className={`sgt-dp-grupo__cob ${pendientes.length?'sgt-dp-bloque__cob--falta':'sgt-dp-bloque__cob--ok'}`}>{asignadas.length}/{total}</span>
                </div>
                <div className="sgt-dp-grupo__cuerpo">
                  {pendientes.map(inst=>(
                    <button key={inst.id} type="button" className="sgt-dp-persona sgt-dp-persona--vacante" onClick={()=>onAssignInstance&&onAssignInstance(inst)} aria-label={`Vacante ${inst.label}${inst.nombrePuesto?` · ${inst.nombrePuesto}`:''}: asignar funcionario`}>
                      <span className="sgt-dp-avatar sgt-dp-avatar--sm sgt-dp-avatar--vacante" aria-hidden="true"><IconoKit name="plus" size={10} strokeWidth={2.8}/></span>
                      <span className="sgt-dp-persona__texto"><span className="sgt-dp-persona__nombre">Vacante · {inst.label}</span><span className="sgt-dp-persona__detalle">{inst.nombrePuesto||'Sin puesto'}</span></span>
                    </button>
                  ))}
                  {asignadas.map(inst=>{ const f=porId.get(Number(inst.idFuncionario)); const nombre=f?nombreFunc(f):inst.nombreFuncionario; return(
                    <button key={inst.id} type="button" className="sgt-dp-persona" onClick={()=>onAssignInstance&&onAssignInstance(inst)} aria-label={`${nombre} · ${inst.label}${inst.nombrePuesto?` · ${inst.nombrePuesto}`:''}: cambiar asignación`} title={f?.rutCompleto?`RUT ${f.rutCompleto}`:undefined}>
                      <span className={`sgt-dp-avatar sgt-dp-avatar--sm ${claseAvatar(inst.nombrePuesto)}`} aria-hidden="true">{inicialesDeNombre(nombre)}</span>
                      <span className="sgt-dp-persona__texto"><span className="sgt-dp-persona__nombre">{nombre}</span><span className="sgt-dp-persona__detalle">{inst.label} · {inst.nombrePuesto||'Sin puesto'}</span></span>
                    </button>
                  );})}
                </div>
              </section>
            );
          })}
        </FormularioPanel>
      </Sheet>
    );
  }

  return(
    <Sheet open={open} onClose={onClose} title={`Semana ${semana} · ${dl}`} maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        {grupos.length===0&&<div style={{padding:20,textAlign:'center',fontSize:12.5,color:'var(--ink3)',fontWeight:600}}>Día libre (sin turnos).</div>}
        {grupos.map(({tipo,asignadas,pendientes})=>{
          const c=tipoColor(tipo.idTipoTurno);
          return(
            <div key={tipo.idTipoTurno} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:c.soft}}>
                <div style={{width:32,height:32,borderRadius:9,background:c.bar,display:'grid',placeItems:'center'}}><SGTIcon name="clock" size={15} color="#fff"/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:c.ink}}>{tipo.nombre}</div><div style={{fontSize:10.5,color:c.ink,opacity:0.75,fontWeight:700,marginTop:1}}>{rangoHoras(tipo)}</div></div>
                {pendientes.length>0?<SGTBadge tone="warn" size="xs">{pendientes.length} vacante{pendientes.length===1?'':'s'}</SGTBadge>:<SGTBadge tone="success" size="xs">Completo</SGTBadge>}
              </div>
              {asignadas.length>0&&<div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:4}}>
                {asignadas.map(inst=>(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:'var(--surface2)',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <SGTAvatar person={{iniciales:inst.iniciales}} size={30}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.nombreFuncionario}</div><div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}><span style={{fontSize:10,fontWeight:800,color:'var(--ink3)'}}>{inst.label}</span><PuestoTag inst={inst} size="xs"/></div></div>
                  </button>
                ))}
              </div>}
              {pendientes.length>0&&<div style={{padding:'0 10px 10px',display:'flex',flexDirection:'column',gap:4}}>
                {pendientes.map(inst=>(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1px dashed ${c.bar}`,borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <div style={{width:30,height:30,borderRadius:99,background:'#fff',display:'grid',placeItems:'center',border:`1px solid ${c.bg}`,flexShrink:0}}><SGTIcon name="user" size={14} color={c.ink}/></div>
                    <div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,fontWeight:800,color:c.ink}}>Vacante · {inst.label}</span><PuestoTag inst={inst} size="xs"/></div><div style={{fontSize:10,fontWeight:700,color:c.ink,opacity:0.7,marginTop:1}}>Toca para asignar funcionario</div></div>
                    <SGTIcon name="arrow-right" size={13} color={c.ink}/>
                  </button>
                ))}
              </div>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ─── RotativasList (pestañas colapsables por rotativa) ──────────────────────── */
function RotativasList({instancias,onAssign,tipoColor}){
  const grouped=useMemo(()=>{ const m={}; instancias.forEach(inst=>{ (m[inst.nombreRotativa]??=[]).push(inst); }); return Object.entries(m).sort(([a],[b])=>a.localeCompare(b,'es')); },[instancias]);
  const[abierto,setAbierto]=useState({});
  const toggle=(name)=>setAbierto(p=>({...p,[name]:!p[name]}));

  if(instancias.length===0)return <div style={{padding:20,background:'#fff',borderRadius:12,border:'1px dashed var(--line)',textAlign:'center',fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay rotativas en el molde. Toca <strong>Agregar</strong> para empezar.</div>;

  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {grouped.map(([nombreRotativa,list])=>{
        const primerTipo=(list[0].secuencia||[]).flat()[0];
        const c=tipoColor(primerTipo?.idTipoTurno);
        const pend=list.filter(i=>!i.idFuncionario).length, open=!!abierto[nombreRotativa];
        return(
          <div key={nombreRotativa} style={{background:'#fff',borderRadius:12,border:'1px solid var(--line)',overflow:'hidden'}}>
            <button onClick={()=>toggle(nombreRotativa)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:'none',border:'none',borderLeft:`5px solid ${c.bar}`,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{width:30,height:30,borderRadius:8,background:c.bar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="calendar" size={15} color="#fff"/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombreRotativa}</div>
                <div style={{fontSize:11,color:'var(--ink3)',fontWeight:700,marginTop:1}}>{list.length} {list.length===1?'rotativa':'rotativas'} · {list.length-pend}/{list.length} asignadas</div>
              </div>
              <span style={{fontSize:9.5,fontWeight:900,padding:'2px 8px',borderRadius:99,background:pend>0?'var(--warn-soft)':'var(--success-soft)',color:pend>0?'var(--warn)':'var(--success)',textTransform:'uppercase',letterSpacing:0.3,flexShrink:0}}>{pend>0?`${pend} vac.`:'Completo'}</span>
              <SGTIcon name={open?'chevron-up':'chevron-down'} size={18} color="var(--ink3)"/>
            </button>
            {open&&(
              <div style={{padding:'2px 10px 10px',display:'flex',flexDirection:'column',gap:5}}>
                {list.map(inst=>{ const assigned=!!inst.idFuncionario; const turnos=(inst.secuencia||[]).reduce((s,d)=>s+d.length,0); return(
                  <div key={inst.id} style={{background:'var(--surface2)',borderRadius:9,overflow:'hidden',display:'flex',alignItems:'stretch'}}>
                    <div style={{flex:1,padding:'8px 10px',minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                        <span style={{fontSize:10,fontWeight:900,color:'#fff',background:c.bar,padding:'2px 7px',borderRadius:99,flexShrink:0}}>{inst.label}</span>
                        <span style={{fontSize:10.5,fontWeight:700,color:'var(--ink3)',flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{turnos} turnos · {inst.semanas} sem</span>
                        <PuestoTag inst={inst} size="xs"/>
                      </div>
                      {assigned?(
                        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4}}>
                          <SGTAvatar person={{iniciales:inst.iniciales}} size={26}/>
                          <div style={{minWidth:0,flex:1}}><div style={{fontSize:12,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.nombreFuncionario}</div>{inst.profesion&&<div style={{fontSize:10,fontWeight:800,color:'var(--ink3)',marginTop:1}}>{inst.profesion}</div>}</div>
                        </div>
                      ):(
                        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4}}>
                          <div style={{width:26,height:26,borderRadius:99,background:'var(--warn-soft)',display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="user" size={14} color="var(--warn)"/></div>
                          <span style={{fontSize:12,fontWeight:800,color:'var(--warn)'}}>Sin asignar</span>
                        </div>
                      )}
                    </div>
                    <button onClick={()=>onAssign(inst)} style={{paddingLeft:10,paddingRight:12,background:assigned?'transparent':c.soft,border:'none',borderLeft:'1px solid var(--line2)',display:'grid',placeItems:'center',cursor:'pointer',fontFamily:'inherit'}}>
                      <SGTIcon name={assigned?'more':'arrow-right'} size={15} color={assigned?'var(--ink2)':c.ink}/>
                    </button>
                  </div>
                );})}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── RelativeWeekGrid ───────────────────────────────────────────────────────── */
function RelativeWeekGrid({maxSemanas,daysIndex,tipoColor,onDayClick}){
  const semanas=Math.max(1,maxSemanas||0);
  return(
    <div style={{padding:'8px 12px 0'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',marginBottom:6}}>
        {WEEK_DAYS_LBL.map((d,i)=><div key={d} style={{textAlign:'center',padding:'4px 0',fontSize:10,fontWeight:800,letterSpacing:0.4,color:i>=5?'var(--accent)':'var(--ink3)',textTransform:'uppercase'}}>{d}</div>)}
      </div>
      {Array.from({length:semanas},(_,w)=>(
        <div key={w} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.4,marginBottom:5}}>Semana {w+1}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:5}}>
            {Array.from({length:7},(_,d)=>{
              const diaIndex=w*7+d; const entradas=daysIndex[diaIndex]||[];
              const grupos=buildDayCoverage(entradas);
              return(
                <div key={diaIndex} onClick={()=>entradas.length&&onDayClick(diaIndex)} style={{minWidth:0,minHeight:46,borderRadius:9,background:entradas.length?'#fff':'var(--surface2)',border:'1px solid var(--line2)',padding:'4px 3px 5px',display:'flex',flexDirection:'column',gap:3,cursor:entradas.length?'pointer':'default'}}>
                  <div style={{fontSize:10,fontWeight:800,color:d>=5?'var(--accent)':'var(--ink3)',textAlign:'center'}}>{WEEK_DAYS_LBL[d]}</div>
                  {grupos.map(({tipo,asignadas,pendientes})=>{ const c=tipoColor(tipo.idTipoTurno); const total=asignadas.length+pendientes.length; const allAssigned=pendientes.length===0; return(
                    <div key={tipo.idTipoTurno} style={{height:22,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',gap:3,background:allAssigned?c.bg:'#fff',backgroundImage:allAssigned?'none':`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1.5px solid ${c.bar}`,borderStyle:allAssigned?'solid':'dashed',position:'relative'}}>
                      <span style={{fontSize:10,fontWeight:900,color:c.ink,lineHeight:1}}>{total}</span>
                      {pendientes.length>0&&<span style={{position:'absolute',top:-5,right:-4,minWidth:14,height:14,padding:'0 3px',borderRadius:99,background:'var(--warn)',color:'#fff',fontSize:9,fontWeight:900,lineHeight:'14px',textAlign:'center',boxShadow:'0 0 0 1.5px #fff'}}>{pendientes.length}</span>}
                    </div>
                  );})}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const ghostBtnGB={width:30,height:30,borderRadius:8,background:'var(--surface2)',border:'1px solid var(--line)',display:'grid',placeItems:'center',cursor:'pointer',flexShrink:0};

/* ─── GenerarView (elegir lunes + previsualización) ──────────────────────────── */
function GenerarView({instancias,daysIndex,maxSemanas,tipoColor,tipos,servicioId,onCancel,onConfirm,generando,planActualId,nombreMolde,tonoTipo,funcionarios}){
  const{esDesktop}=useLayout();
  const[fecha,setFecha]=useState(''); // ancla de la rotativa (lunes): fija la fase del ciclo
  // Vigencia efectiva: el día en que la planificación realmente empieza y termina a regir. Por
  // defecto igual al ancla (el caso más común), pero siempre editable de forma independiente —
  // p. ej. anclar la rotativa un lunes y hacerla efectiva recién semanas después, conservando la
  // fase (corrección funcional "separar ancla de vigencia efectiva").
  const[inicioEfectiva,setInicioEfectiva]=useState('');
  const[inicioEditadoManualmente,setInicioEditadoManualmente]=useState(false);
  // Fecha efectiva de término: por defecto, un solo ciclo de la rotativa (comportamiento previo),
  // pero editable a cualquier fecha posterior — permite generar rangos de varios meses en una sola
  // operación (corrección funcional "generar más de un mes").
  const[finEfectiva,setFinEfectiva]=useState('');
  const[finEditadoManualmente,setFinEditadoManualmente]=useState(false);
  const[pickSeed,setPickSeed]=useState(toDateStr(new Date()));
  const[confirmando,setConfirmando]=useState(false);
  const[conflictos,setConflictos]=useState([]);
  const[cargandoConf,setCargandoConf]=useState(false);
  const{weeks,year,month}=useMemo(()=>buildMonthGrid(pickSeed),[pickSeed]);
  const start=fecha?parseLocalDate(fecha):null; // ancla, como Date — usado solo para la vista previa del patrón
  const semanas=Math.max(1,maxSemanas||0);
  const totalTurnosPorCiclo=instancias.reduce((a,i)=>a+(i.secuencia||[]).reduce((s,d)=>s+d.length,0),0);

  // Al elegir/cambiar el ancla, si el usuario no ha tocado manualmente el inicio efectivo, se
  // propone por defecto el mismo día (caso más común: la vigencia empieza junto con el ancla).
  useEffect(()=>{
    if(!fecha||inicioEditadoManualmente)return;
    setInicioEfectiva(fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fecha]);

  const inicioEfectivaDt=inicioEfectiva?parseLocalDate(inicioEfectiva):null;

  // Al elegir/cambiar el inicio efectivo, si el usuario no ha tocado manualmente el fin efectivo,
  // se propone por defecto el fin de un solo ciclo contado desde el inicio efectivo.
  useEffect(()=>{
    if(!inicioEfectiva||finEditadoManualmente)return;
    const dt=parseLocalDate(inicioEfectiva); const fin=new Date(dt); fin.setDate(dt.getDate()+semanas*7-1);
    setFinEfectiva(toDateStr(fin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[inicioEfectiva,semanas]);

  const finEfectivaDt=finEfectiva?parseLocalDate(finEfectiva):null;
  const anclaValida=!start||!inicioEfectivaDt||inicioEfectivaDt>=start; // el inicio efectivo no puede ser anterior al ancla
  const rangoValido=start&&inicioEfectivaDt&&finEfectivaDt&&finEfectivaDt>=inicioEfectivaDt&&anclaValida;
  const diasTotalesRango=rangoValido?Math.round((finEfectivaDt-inicioEfectivaDt)/86400000)+1:0;
  const cantidadCiclos=diasTotalesRango&&semanas?Math.ceil(diasTotalesRango/(semanas*7)):0;
  // Estimación (no exacta): un rango que no calza en ciclos completos puede generar menos turnos
  // en el último ciclo parcial; se muestra como aproximación, el conteo real lo confirma el backend.
  const totalTurnosEstimado=Math.round(totalTurnosPorCiclo*(diasTotalesRango/(semanas*7||1)));

  const fechaReal=(rel)=>{ const dt=new Date(start); dt.setDate(start.getDate()+rel); return dt; };
  let minD=null,maxD=null;
  if(start){ const tot=semanas*7; for(let r=0;r<tot;r++){ if((daysIndex[r]||[]).length){ const dt=fechaReal(r); if(!minD||dt<minD)minD=dt; if(!maxD||dt>maxD)maxD=dt; } } }
  const fmt=(dt)=>dt?`${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`:'—';
  const stepLbl={fontSize:11,fontWeight:800,color:'var(--primary)',textTransform:'uppercase',letterSpacing:0.4,marginBottom:10,display:'flex',alignItems:'center',gap:6};
  const stepNum=(n)=><span style={{width:18,height:18,borderRadius:99,background:'var(--primary)',color:'#fff',fontSize:11,fontWeight:900,display:'grid',placeItems:'center'}}>{n}</span>;

  // Pre-chequeo de conflictos contra turnos existentes (requiere molde guardado). Usa exactamente
  // el mismo rango (ancla + inicio/fin efectivo) que la generación real, para que la previsualización
  // nunca pueda diferir del resultado final.
  useEffect(()=>{
    let activo=true;
    if(!fecha||!inicioEfectiva||!finEfectiva||!planActualId||!rangoValido){ setConflictos([]); return; }
    setCargandoConf(true);
    planificacionService.conflictos(planActualId,fecha,inicioEfectiva,finEfectiva)
      .then(list=>{ if(activo)setConflictos(Array.isArray(list)?list:[]); })
      .catch(()=>{ if(activo)setConflictos([]); })
      .finally(()=>{ if(activo)setCargandoConf(false); });
    return()=>{ activo=false; };
  },[fecha,inicioEfectiva,finEfectiva,planActualId,rangoValido]);

  // Claves "fecha|HH:MM" para resaltar los bloques en conflicto del calendario.
  const conflictoKeys=useMemo(()=>{ const s=new Set(); conflictos.forEach(c=>s.add(`${c.fecha}|${formatHora(c.horaInicio)}`)); return s; },[conflictos]);

  // Feriados del rango (tabla en BD) para marcarlos en la previsualización.
  const[feriados,setFeriados]=useState(new Set());
  useEffect(()=>{
    let activo=true;
    if(!start){ setFeriados(new Set()); return; }
    const tot=Math.max(1,semanas)*7;
    const hastaDt=new Date(start); hastaDt.setDate(start.getDate()+tot-1);
    feriadosService.getFechas({desde:toDateStr(start),hasta:toDateStr(hastaDt)})
      .then(set=>{ if(activo)setFeriados(set); })
      .catch(()=>{ if(activo)setFeriados(new Set()); });
    return()=>{ activo=false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fecha]);

  // Reglas activas del servicio (para resaltar el preview y la pestaña "Reglas").
  const[reglas,setReglas]=useState([]);
  const[tab,setTab]=useState('calendario');
  useEffect(()=>{
    let activo=true;
    if(!servicioId){ setReglas([]); return; }
    reglasServicioService.getByServicio(servicioId)
      .then(list=>{ if(activo)setReglas(Array.isArray(list)?list:[]); })
      .catch(()=>{ if(activo)setReglas([]); });
    return()=>{ activo=false; };
  },[servicioId]);

  // Selección de reglas a aplicar (multi). Por defecto, todas las activas preseleccionadas.
  const[seleccion,setSeleccion]=useState(new Set());
  useEffect(()=>{ setSeleccion(new Set(reglas.map(r=>r.idRegla))); },[reglas]);
  const reglasSel=reglas.filter(r=>seleccion.has(r.idRegla));
  const toggleRegla=(id)=>setSeleccion(prev=>{ const n=new Set(prev); if(n.has(id))n.delete(id); else n.add(id); return n; });
  const todasSeleccionadas=reglas.length>0&&seleccion.size===reglas.length;

  const horaMin=(h)=>{ const s=formatHora(h); if(!s)return 0; const[H,M]=s.split(':').map(Number); return H*60+M; };
  const esFinde=(dt)=>dt.getDay()===0||dt.getDay()===6;
  const cumpleCondicion=(r,dt)=>(esFinde(dt)&&r.aplicaFinDeSemana)||(feriados.has(toDateStr(dt))&&r.aplicaFeriado);
  // ¿Alguna regla activa cambia el horario de este tipo en esta fecha? (inicio por día de
  // inicio; fin por día final, que es el siguiente si el turno cruza medianoche).
  const reglaAfecta=(tipo,dt)=>{
    if(!reglasSel.length)return false;
    const id=tipo.idTipoTurno;
    const overnight=horaMin(tipo.horaTermino)<=horaMin(tipo.horaInicio);
    const finDt=new Date(dt); if(overnight)finDt.setDate(dt.getDate()+1);
    return reglasSel.some(r=>
      (r.idTipoTurnoInicio===id&&cumpleCondicion(r,dt))||
      (r.idTipoTurnoFin===id&&cumpleCondicion(r,finDt))
    );
  };

  // Presentación de reglas (pestaña "Reglas activas").
  const badgeMini={fontSize:9.5,fontWeight:800,textTransform:'uppercase',letterSpacing:0.3,color:'var(--primary)',background:'var(--primary-soft)',padding:'2px 8px',borderRadius:99,whiteSpace:'nowrap'};
  const infoTipo=(idTipo,fallback)=>{ const t=(tipos||[]).find(x=>x.idTipoTurno===idTipo); return t?{nombre:t.nombre,hi:t.horaInicio,hf:t.horaTermino}:{nombre:fallback||`#${idTipo}`,hi:null,hf:null}; };
  const filaCambio=(idTipo,fallback,bound,tiempo)=>{
    const{nombre,hi,hf}=infoTipo(idTipo,fallback); const ok=hi!=null&&hf!=null;
    const dI=bound==='inicio'?shiftHora(hi,tiempo):formatHora(hi);
    const dF=bound==='fin'?shiftHora(hf,tiempo):formatHora(hf);
    return(
      <div key={`${idTipo}-${bound}`} style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',fontSize:11.5,fontWeight:600}}>
        <span style={{fontSize:9.5,fontWeight:800,textTransform:'uppercase',letterSpacing:0.3,color:bound==='inicio'?'var(--primary)':'var(--accent)',background:bound==='inicio'?'var(--primary-soft)':'var(--accent-soft)',padding:'2px 7px',borderRadius:99}}>{bound==='inicio'?'Entrada':'Salida'}</span>
        <span style={{color:'var(--ink)',fontWeight:700}}>{nombre}</span>
        {ok?(<>
          <span style={{color:'var(--ink3)'}}>{formatHora(hi)}–{formatHora(hf)}</span>
          <SGTIcon name="arrow-right" size={12} color="var(--ink3)"/>
          <span><span style={{color:bound==='inicio'?'var(--primary)':'var(--ink2)',fontWeight:bound==='inicio'?800:600}}>{dI}</span><span style={{color:'var(--ink3)'}}>–</span><span style={{color:bound==='fin'?'var(--primary)':'var(--ink2)',fontWeight:bound==='fin'?800:600}}>{dF}</span></span>
        </>):(<span style={{color:'var(--ink3)'}}>(horario no disponible)</span>)}
      </div>
    );
  };

  // Desktop (R18): sub-pantalla ancha que conserva su volver. A la izquierda el
  // lunes de inicio, la vigencia efectiva y las reglas (a la vista, sin
  // pestaña); a la derecha la vista previa del ciclo a lo ancho.
  if(esDesktop){
    const tono=tonoTipo||crearTonoTipo(tipos);
    const porId=new Map((funcionarios||[]).map(f=>[Number(f.idFuncionario),f]));
    const fmtD=(dt)=>dt?fechaCorta(toDateStr(dt)):'—';
    const hoyDs=toDateStr(new Date());
    const nombreDia=(dt)=>`${mayusculaInicial(DIAS_LARGOS[(dt.getDay()+6)%7])} ${dt.getDate()} de ${MESES_LARGOS[dt.getMonth()]} de ${dt.getFullYear()}`;
    const puedeGenerar=rangoValido&&!generando;
    const n=conflictos.length;
    return(
      <>
        <EncabezadoDesktop
          izquierda={(
            <BotonDesktop variante="fantasma" className="sgt-d-btn--icono" onClick={onCancel} aria-label="Volver a Planificación" title="Volver a Planificación">
              <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true"/>
            </BotonDesktop>
          )}
          titulo="Generar planificación"
          subtitulo={`${nombreMolde?`Molde «${nombreMolde}»`:'Molde sin guardar'} · ${instancias.length} rotativas · ciclo de ${semanas} semana${semanas===1?'':'s'}`}
          acciones={(
            <>
              <BotonDesktop variante="secundario" onClick={onCancel}>Cancelar</BotonDesktop>
              <BotonDesktop variante="primario" onClick={()=>rangoValido&&setConfirmando(true)} disabled={!puedeGenerar}>
                <CalendarCheck2 size={14} strokeWidth={2.2} aria-hidden="true"/>Confirmar y generar
              </BotonDesktop>
            </>
          )}
        />
        <PaginaDesktop>
          <div className="sgt-dp-generar">
            <div className="sgt-dp-generar__lateral">
              <PanelDesktop titulo="1 · Lunes de inicio" subtitulo="Ancla de la rotativa: fija la fase del ciclo" icono="calendar">
                <div className="sgt-dp-mes">
                  <BotonDesktop variante="secundario" tamano="sm" className="sgt-d-btn--icono" onClick={()=>setPickSeed(toDateStr(new Date(year,month-1,1)))} aria-label="Mes anterior"><ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true"/></BotonDesktop>
                  <div className="sgt-dp-mes__titulo" aria-live="polite">{MONTHS_LONG[month]} <span>{year}</span></div>
                  <BotonDesktop variante="secundario" tamano="sm" className="sgt-d-btn--icono" onClick={()=>setPickSeed(toDateStr(new Date(year,month+1,1)))} aria-label="Mes siguiente"><ChevronRight size={14} strokeWidth={2.4} aria-hidden="true"/></BotonDesktop>
                </div>
                <div className="sgt-dp-cal" role="group" aria-label={`Lunes de ${MESES_LARGOS[month]} de ${year}`}>
                  {WEEK_DAYS_LBL.map((d,i)=><span key={d} className={`sgt-dp-cal__cabecera${i>=5?' sgt-dp-cal__cabecera--finde':''}`} aria-hidden="true">{d}</span>)}
                  {weeks.flat().map(({date,inMonth})=>{ const ds=toDateStr(date), esLunes=date.getDay()===1, selectable=esLunes&&inMonth, sel=ds===fecha; return(
                    <button
                      key={ds}
                      type="button"
                      disabled={!selectable}
                      aria-pressed={selectable?sel:undefined}
                      aria-label={nombreDia(date)}
                      onClick={()=>setFecha(ds)}
                      className={`sgt-dp-cal__dia${selectable?' sgt-dp-cal__dia--lunes':''}${sel?' sgt-dp-cal__dia--sel':''}${!inMonth?' sgt-dp-cal__dia--fuera':''}${ds===hoyDs?' sgt-dp-cal__dia--hoy':''}`}
                    >{date.getDate()}</button>
                  );})}
                </div>
                <p className="sgt-dp-ayuda" style={{margin:'8px 0 0'}}>Debe ser <strong>lunes</strong> (resaltados).{start&&<> Ancla elegida: <strong>{nombreDia(start)}</strong>.</>}</p>
              </PanelDesktop>

              {start&&(
                <PanelDesktop titulo="2 · Vigencia efectiva" subtitulo="Rango en que realmente se crearán turnos" icono="clock">
                  <p className="sgt-dp-ayuda" style={{margin:'0 0 10px'}}>Puede empezar en una fecha distinta al ancla (p. ej. ancla lunes 28 de julio, vigencia efectiva desde el sábado 1 de agosto) y abarcar varios ciclos o varios meses — no está limitado a un mes.</p>
                  <div className="sgt-d-formulario">
                    <CampoDesktop etiqueta="Inicio efectivo" htmlFor="sgt-dp-inicio-efectivo">
                      <input id="sgt-dp-inicio-efectivo" type="date" className="sgt-d-input" value={inicioEfectiva} min={fecha} onChange={e=>{setInicioEfectiva(e.target.value);setInicioEditadoManualmente(true);}}/>
                    </CampoDesktop>
                    <CampoDesktop etiqueta="Término efectivo" htmlFor="sgt-dp-fin-efectivo">
                      <input id="sgt-dp-fin-efectivo" type="date" className="sgt-d-input" value={finEfectiva} min={inicioEfectiva||fecha} onChange={e=>{setFinEfectiva(e.target.value);setFinEditadoManualmente(true);}}/>
                    </CampoDesktop>
                  </div>
                  {!anclaValida&&<AvisoDesktop tono="aviso" style={{marginTop:10}}><span role="alert">El inicio efectivo no puede ser anterior al ancla de la rotativa ({fmt(start)}).</span></AvisoDesktop>}
                  {anclaValida&&!rangoValido&&finEfectiva&&<AvisoDesktop tono="aviso" style={{marginTop:10}}><span role="alert">La fecha de término no puede ser anterior al inicio efectivo.</span></AvisoDesktop>}
                  {rangoValido&&<div className="sgt-dp-ayuda" style={{marginTop:8}}>{diasTotalesRango} día{diasTotalesRango===1?'':'s'} · ≈{cantidadCiclos} ciclo{cantidadCiclos===1?'':'s'} de la rotativa</div>}
                </PanelDesktop>
              )}

              <PanelDesktop
                titulo="Reglas de horario"
                subtitulo={reglas.length?`${seleccion.size} de ${reglas.length} seleccionada${reglas.length===1?'':'s'} para esta generación`:'Sin reglas activas para este servicio'}
                icono="sliders"
                acciones={reglas.length>0&&(
                  <BotonDesktop variante="fantasma" tamano="sm" onClick={()=>setSeleccion(todasSeleccionadas?new Set():new Set(reglas.map(r=>r.idRegla)))}>{todasSeleccionadas?'Quitar todas':'Seleccionar todas'}</BotonDesktop>
                )}
              >
                {reglas.length===0?(
                  <div className="sgt-dp-ayuda">Se usarán los horarios base de cada tipo de turno.</div>
                ):(
                  <div className="sgt-dp-reglas">
                    {reglas.map(r=>{ const sel=seleccion.has(r.idRegla); return(
                      <div key={r.idRegla} className={`sgt-dp-regla${sel?' sgt-dp-regla--sel':''}`}>
                        <label className="sgt-dp-regla__cabecera">
                          <input type="checkbox" className="sgt-dp-regla__input" checked={sel} onChange={()=>toggleRegla(r.idRegla)}/>
                          <span className="sgt-dp-regla__nombre">{r.nombre}</span>
                        </label>
                        <div className="sgt-dp-regla__chips">
                          {r.aplicaFinDeSemana&&<ChipDesktop tono="primario" mayus>Fin de semana</ChipDesktop>}
                          {r.aplicaFeriado&&<ChipDesktop tono="primario" mayus>Feriado</ChipDesktop>}
                          <ChipDesktop tono="alerta" mayus>{formatDesplazamientoHoras(r.tiempoMinutos)}</ChipDesktop>
                        </div>
                        <div className="sgt-dp-regla__cambios">
                          {r.idTipoTurnoInicio!=null&&filaCambio(r.idTipoTurnoInicio,r.nombreTipoTurnoInicio,'inicio',r.tiempoMinutos)}
                          {r.idTipoTurnoFin!=null&&filaCambio(r.idTipoTurnoFin,r.nombreTipoTurnoFin,'fin',r.tiempoMinutos)}
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </PanelDesktop>
            </div>

            <PanelDesktop
              className="sgt-dp-generar__previa"
              titulo="3 · Vista previa"
              subtitulo={start?`Un ciclo de la rotativa desde el ${fmtD(start)}`:'Elige el lunes de inicio para ver dónde se generarán los turnos'}
              icono="calendar"
            >
              {!start?(
                <EstadoVacioDesktop icono="calendar" titulo="Sin lunes de inicio" texto="Selecciona un lunes para ver dónde se generarán los turnos."/>
              ):(
                <div className="sgt-dp-previa">
                  <div className="sgt-dp-minis sgt-dp-minis--4">
                    <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Rotativas</div><div className="sgt-dp-mini__valor">{instancias.length}</div></div>
                    <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Turnos (aprox.)</div><div className="sgt-dp-mini__valor">{formatoNumero(totalTurnosEstimado)}</div></div>
                    <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Vigencia</div><div className="sgt-dp-mini__valor">{rangoValido?`${diasTotalesRango} días`:'—'}</div></div>
                    <div className="sgt-dp-mini"><div className="sgt-dp-mini__etiqueta">Patrón del ciclo</div><div className="sgt-dp-mini__valor sgt-dp-mini__valor--texto">{minD?`${fmtD(minD)} → ${fmtD(maxD)}`:'—'}</div></div>
                  </div>

                  {!planActualId?(
                    <AvisoDesktop>Guarda el molde para detectar choques con turnos ya existentes.</AvisoDesktop>
                  ):cargandoConf?(
                    <div className="sgt-dp-estado" role="status"><IconoKit name="clock" size={13}/>Verificando conflictos…</div>
                  ):n>0?(
                    <section className="sgt-dp-conflictos" aria-label="Conflictos de horario">
                      <div className="sgt-dp-conflictos__titulo"><IconoKit name="alert" size={14} strokeWidth={2.4}/>{n} turno{n===1?'':'s'} quedará{n===1?'':'n'} vacante{n===1?'':'s'} por conflicto</div>
                      <table className="sgt-d-tabla sgt-dp-conflictos__tabla">
                        <thead><tr><th>Funcionario</th><th>Fecha</th><th>Horario</th><th>Rotativa</th><th>Conflicto en</th></tr></thead>
                        <tbody>
                          {conflictos.slice(0,8).map((cf,i)=>{ const f=porId.get(Number(cf.idFuncionario)); const nombre=f?nombreFunc(f):(cf.nombreFuncionario||'—'); const dtc=parseLocalDate(cf.fecha); return(
                            <tr key={i}>
                              <td><span className="sgt-dp-persona-linea"><span className="sgt-dp-avatar sgt-dp-avatar--sm" aria-hidden="true">{inicialesDeNombre(nombre)}</span><span>{nombre}</span></span></td>
                              <td className="sgt-dp-num">{dtc?`${DIAS_LARGOS[(dtc.getDay()+6)%7].slice(0,3)} ${fechaCorta(cf.fecha)}`:cf.fecha}</td>
                              <td className="sgt-dp-num">{formatHora(cf.horaInicio)}–{formatHora(cf.horaFin)}</td>
                              <td>{cf.nombreRotativa}</td>
                              <td>{cf.servicioEnConflicto?<ChipDesktop tono="aviso">{cf.servicioEnConflicto}</ChipDesktop>:'—'}</td>
                            </tr>
                          );})}
                        </tbody>
                      </table>
                      {n>8&&<div className="sgt-dp-ayuda" style={{padding:'6px 12px 8px'}}>y {n-8} más…</div>}
                    </section>
                  ):(
                    <AvisoDesktop tono="exito">Sin conflictos: todos los turnos se asignarán.</AvisoDesktop>
                  )}

                  <div className="sgt-dp-leyenda">
                    <span className="sgt-dp-leyenda__item"><span className="sgt-dp-punto sgt-dp-punto--feriado" aria-hidden="true"/>Feriado</span>
                    <span className="sgt-dp-leyenda__item"><span className="sgt-dp-leyenda__muestra sgt-dp-bloque--regla" aria-hidden="true"><IconoKit name="clock" size={9} strokeWidth={2.6}/></span>Horario ajustado por regla</span>
                    <span className="sgt-dp-leyenda__item"><span className="sgt-dp-leyenda__muestra sgt-dp-bloque--conflicto" aria-hidden="true"><IconoKit name="alert" size={9} strokeWidth={2.6}/></span>Choca con un turno existente</span>
                    <span className="sgt-dp-leyenda__item"><span className="sgt-dp-leyenda__muestra sgt-dp-leyenda__muestra--fuera" aria-hidden="true"/>Fuera de la vigencia efectiva</span>
                  </div>

                  <GrillaSemanas
                    semanas={semanas}
                    ariaLabel="Vista previa del primer ciclo"
                    renderDia={(diaIndex,d)=>{
                      const grupos=buildDayCoverage(daysIndex[diaIndex]||[]); const dt=fechaReal(diaIndex); const ds=toDateStr(dt);
                      const esFeriado=feriados.has(ds);
                      const fuera=Boolean((inicioEfectivaDt&&dt<inicioEfectivaDt)||(finEfectivaDt&&dt>finEfectivaDt));
                      return(
                        <div className={`sgt-dp-diaprev${esFeriado?' sgt-dp-diaprev--feriado':''}${grupos.length?'':' sgt-dp-diaprev--libre'}${fuera?' sgt-dp-diaprev--fuera':''}`} title={fuera?'Fuera de la vigencia efectiva: aquí no se crean turnos':esFeriado?'Feriado — se ajustan los horarios':undefined}>
                          <div className="sgt-dp-diaprev__fecha">
                            {esFeriado&&<span className="sgt-dp-punto sgt-dp-punto--feriado" aria-hidden="true"/>}
                            <span className={`sgt-dp-diaprev__num${d>=5?' sgt-dp-diaprev__num--finde':''}`}>{dt.getDate()}</span>
                            <span className="sgt-dp-diaprev__mes">{MONTHS_SHORT[dt.getMonth()].toLowerCase()}</span>
                            {esFeriado&&<span className="sgt-dp-diaprev__etiqueta">Feriado</span>}
                          </div>
                          {grupos.length===0&&<span className="sgt-dp-diaprev__libre">Sin turnos</span>}
                          {grupos.map(({tipo,asignadas,pendientes})=>{ const enConf=conflictoKeys.has(`${ds}|${formatHora(tipo.horaInicio)}`); const afectada=!enConf&&reglaAfecta(tipo,dt); const t=tono(tipo); return(
                            <span key={tipo.idTipoTurno} className={`sgt-dp-bloque sgt-dp-bloque--${t.clase}${enConf?' sgt-dp-bloque--conflicto':''}${afectada?' sgt-dp-bloque--regla':''}`} style={enConf||afectada?undefined:t.estilo} title={`${tipo.nombre} ${rangoHoras(tipo)} · ${asignadas.length+pendientes.length} turno${asignadas.length+pendientes.length===1?'':'s'}${enConf?' · choca con un turno existente: quedará vacante':afectada?' · horario ajustado por una regla':''}`}>
                              <IconoKit name={enConf?'alert':afectada?'clock':t.icono} size={10} strokeWidth={2.4}/>
                              <span className="sgt-dp-bloque__nombre">{tipo.nombre}</span>
                              <span className="sgt-dp-bloque__cob">{asignadas.length+pendientes.length}</span>
                            </span>
                          );})}
                        </div>
                      );
                    }}
                  />
                </div>
              )}
            </PanelDesktop>
          </div>
        </PaginaDesktop>

        {confirmando&&(
          <ConfirmacionPlan
            titulo="¿Generar la planificación?"
            icono={<CalendarCheck2 size={15} strokeWidth={2.2}/>}
            etiquetaConfirmar="Sí, generar"
            etiquetaOcupado="Generando…"
            ocupado={generando}
            onCancelar={()=>setConfirmando(false)}
            onConfirmar={()=>onConfirm(fecha,inicioEfectiva,finEfectiva,[...seleccion])}
          >
            <p>Se crearán <strong>≈{formatoNumero(totalTurnosEstimado)} turnos</strong> entre el <strong>{fmtD(inicioEfectivaDt)}</strong> y el <strong>{fmtD(finEfectivaDt)}</strong> ({diasTotalesRango} días).</p>
            {inicioEfectiva!==fecha&&<p>Ancla de rotativa: <strong>{fmtD(start)}</strong> (fase del ciclo).</p>}
            <p>{n>0?<><strong>{n}</strong> quedará{n===1?'':'n'} vacante{n===1?'':'s'} por conflicto de horario.</>:'Los turnos con choque de horario se crearán sin asignar (vacantes).'}</p>
            <p>{reglasSel.length>0?<>Se aplicarán <strong>{reglasSel.length}</strong> regla{reglasSel.length===1?'':'s'} de horario.</>:'Sin reglas de horario (horarios base).'}</p>
          </ConfirmacionPlan>
        )}
      </>
    );
  }

  return(
    <div className="dash-page-bg" style={{flex:1,display:'flex',flexDirection:'column',animation:'sgtSlideLeft .3s ease',overflow:'hidden'}}>
      <TopHeader title="Generar planificación" subtitle="Elige el lunes de inicio" dense leftSlot={<button onClick={onCancel} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}/>
      <div style={{flex:1,overflow:'auto'}}>
        <div style={{background:'#fff',padding:'14px',borderBottom:'1px solid var(--line2)'}}>
          <div style={stepLbl}>{stepNum(1)} Elige el lunes de inicio</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <button onClick={()=>setPickSeed(toDateStr(new Date(year,month-1,1)))} style={ghostBtnGB}><SGTIcon name="chevron-left" size={15} color="var(--ink2)"/></button>
            <div style={{flex:1,textAlign:'center',fontSize:14,fontWeight:800,color:'var(--ink)'}}>{MONTHS_LONG[month]} <span style={{color:'var(--ink3)'}}>{year}</span></div>
            <button onClick={()=>setPickSeed(toDateStr(new Date(year,month+1,1)))} style={ghostBtnGB}><SGTIcon name="chevron-right" size={15} color="var(--ink2)"/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',marginBottom:4}}>{WEEK_DAYS_LBL.map((d,i)=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:800,color:i>=5?'var(--accent)':'var(--ink3)',textTransform:'uppercase'}}>{d}</div>)}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:4}}>
            {weeks.flat().map(({date,inMonth})=>{ const ds=toDateStr(date), esLunes=date.getDay()===1, selectable=esLunes&&inMonth, sel=ds===fecha; return(
              <button key={ds} disabled={!selectable} onClick={()=>setFecha(ds)} style={{aspectRatio:'1',minWidth:0,borderRadius:9,border:sel?'2px solid var(--primary)':selectable?'1.5px solid var(--primary-soft)':'1px solid transparent',background:sel?'var(--primary)':selectable?'var(--primary-soft)':'transparent',color:sel?'#fff':!inMonth?'var(--ink3)':selectable?'var(--primary)':'var(--ink3)',opacity:inMonth?(selectable||sel?1:0.4):0.25,fontSize:13,fontWeight:selectable||sel?800:600,cursor:selectable?'pointer':'default',display:'grid',placeItems:'center',fontFamily:'inherit'}}>{date.getDate()}</button>
            );})}
          </div>
          <div style={{fontSize:11,color:'var(--ink3)',fontWeight:600,marginTop:8,display:'flex',alignItems:'center',gap:5}}><SGTIcon name="calendar" size={12} color="var(--ink3)"/>Este es el <strong style={{color:'var(--ink)'}}>ancla de la rotativa</strong>: fija la fase del ciclo. Debe ser <strong style={{color:'var(--ink)'}}>lunes</strong> (resaltados).</div>
        </div>

        {start&&(
          <div style={{background:'#fff',padding:'14px',borderBottom:'1px solid var(--line2)'}}>
            <div style={stepLbl}>{stepNum(2)} Vigencia efectiva</div>
            <div style={{fontSize:11,color:'var(--ink3)',fontWeight:600,marginBottom:10}}>El rango de fechas en que realmente se crearán turnos. Puede empezar en una fecha distinta al ancla (p. ej. ancla lunes 28 de julio, vigencia efectiva desde el sábado 1 de agosto) y abarcar varios ciclos o varios meses — no está limitado a un mes.</div>

            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',marginBottom:4}}>Inicio efectivo</div>
                <input type="date" value={inicioEfectiva} min={fecha} onChange={e=>{setInicioEfectiva(e.target.value);setInicioEditadoManualmente(true);}} style={{width:'100%',padding:'8px 10px',borderRadius:9,border:'1px solid var(--line)',fontSize:13,fontWeight:700,color:'var(--ink)',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <SGTIcon name="arrow-right" size={14} color="var(--ink3)"/>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',marginBottom:4}}>Término efectivo</div>
                <input type="date" value={finEfectiva} min={inicioEfectiva||fecha} onChange={e=>{setFinEfectiva(e.target.value);setFinEditadoManualmente(true);}} style={{width:'100%',padding:'8px 10px',borderRadius:9,border:'1px solid var(--line)',fontSize:13,fontWeight:700,color:'var(--ink)',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
            </div>
            {!anclaValida&&<div style={{fontSize:11,color:'var(--warn)',fontWeight:700,marginTop:6}}>El inicio efectivo no puede ser anterior al ancla de la rotativa ({fmt(start)}).</div>}
            {anclaValida&&!rangoValido&&finEfectiva&&<div style={{fontSize:11,color:'var(--warn)',fontWeight:700,marginTop:6}}>La fecha de término no puede ser anterior al inicio efectivo.</div>}
            {rangoValido&&<div style={{fontSize:11,color:'var(--ink3)',fontWeight:600,marginTop:6}}>{diasTotalesRango} día{diasTotalesRango===1?'':'s'} · ≈{cantidadCiclos} ciclo{cantidadCiclos===1?'':'s'} de la rotativa</div>}
          </div>
        )}

        {!start?(
          <div style={{padding:'30px 20px',textAlign:'center',color:'var(--ink3)',fontSize:12.5,fontWeight:600}}>Selecciona un lunes para ver dónde se generarán los turnos.</div>
        ):(
          <div style={{padding:'14px'}}>
            <div style={stepLbl}>{stepNum(3)} Previsualización</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {[['calendar','var(--primary)','var(--primary-soft)',instancias.length,'Rotativas'],['clock','var(--accent)','var(--accent-soft)',totalTurnosEstimado,'Turnos (aprox.)']].map(([icon,ink,bg,n,label])=>(
                <div key={label} style={{flex:1,background:'#fff',border:'1px solid var(--line)',borderRadius:10,padding:'10px',textAlign:'center'}}>
                  <div style={{width:26,height:26,borderRadius:8,background:bg,display:'grid',placeItems:'center',margin:'0 auto 6px'}}><SGTIcon name={icon} size={14} color={ink}/></div>
                  <div style={{fontSize:17,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div>
                  <div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            {minD&&<div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:10,padding:'9px 12px',display:'flex',alignItems:'center',gap:8,marginBottom:10}}><SGTIcon name="calendar" size={15} color="var(--ink3)"/><span style={{fontSize:12.5,fontWeight:700,color:'var(--ink)'}}>{fmt(minD)} → {fmt(maxD)}</span></div>}

            <div style={{display:'flex',gap:6,marginBottom:10,background:'var(--surface2)',borderRadius:10,padding:4}}>
              {[['calendario','Calendario'],['reglas','Reglas activas']].map(([k,lbl])=>(
                <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',fontSize:12.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:tab===k?'#fff':'transparent',color:tab===k?'var(--primary)':'var(--ink3)',boxShadow:tab===k?'0 1px 3px rgba(0,0,0,0.08)':'none'}}>{lbl}{k==='reglas'&&reglas.length>0?` (${seleccion.size}/${reglas.length})`:''}</button>
              ))}
            </div>

            {tab==='calendario'&&(<>
            {!planActualId?(
              <div style={{display:'flex',alignItems:'flex-start',gap:6,fontSize:11.5,color:'var(--ink3)',fontWeight:600,marginBottom:10,background:'var(--surface2)',borderRadius:10,padding:'10px 12px'}}><SGTIcon name="alert" size={13} color="var(--ink3)"/>Guarda el molde para detectar choques con turnos ya existentes.</div>
            ):cargandoConf?(
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--ink3)',fontWeight:600,marginBottom:10}}><SGTIcon name="clock" size={13} color="var(--ink3)"/>Verificando conflictos…</div>
            ):conflictos.length>0?(
              <div style={{background:'var(--warn-soft)',borderRadius:12,padding:'12px 14px',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <SGTIcon name="alert" size={15} color="var(--warn)"/>
                  <span style={{fontSize:13,fontWeight:800,color:'var(--warn)'}}>{conflictos.length} turno{conflictos.length===1?'':'s'} quedará{conflictos.length===1?'':'n'} vacante{conflictos.length===1?'':'s'} por conflicto</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {conflictos.slice(0,8).map((cf,i)=>{ const dtc=parseLocalDate(cf.fecha); const ini=(cf.nombreFuncionario||'?').split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join(''); return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',borderRadius:8,padding:'7px 9px'}}>
                      <SGTAvatar person={{iniciales:ini}} size={26}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cf.nombreFuncionario}</div>
                        <div style={{fontSize:10.5,color:'var(--ink3)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{dtc?`${dtc.getDate()} ${MONTHS_SHORT[dtc.getMonth()]}`:cf.fecha} · {formatHora(cf.horaInicio)}–{formatHora(cf.horaFin)} · {cf.nombreRotativa}</div>
                      </div>
                      {cf.servicioEnConflicto&&<span style={{fontSize:9.5,fontWeight:800,color:'var(--warn)',background:'var(--warn-soft)',padding:'2px 7px',borderRadius:99,whiteSpace:'nowrap',flexShrink:0}}>en {cf.servicioEnConflicto}</span>}
                    </div>
                  );})}
                  {conflictos.length>8&&<div style={{fontSize:11,color:'var(--ink3)',fontWeight:600,textAlign:'center'}}>y {conflictos.length-8} más…</div>}
                </div>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--success)',fontWeight:700,marginBottom:10}}><SGTIcon name="check-circle" size={14} color="var(--success)"/>Sin conflictos: todos los turnos se asignarán.</div>
            )}

            {(feriados.size>0||reglasSel.length>0)&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px 14px',fontSize:11,color:'var(--ink3)',fontWeight:600,marginBottom:10}}>
                {feriados.size>0&&<span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:7,height:7,borderRadius:99,background:'var(--warn)',flexShrink:0}}/>Feriado</span>}
                {reglasSel.length>0&&<span style={{display:'flex',alignItems:'center',gap:5}}><SGTIcon name="clock" size={11} color="var(--primary)"/>Horario ajustado por regla</span>}
              </div>
            )}
            {Array.from({length:semanas},(_,w)=>(
              <div key={w} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.4,marginBottom:5}}>Semana {w+1}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:5}}>
                  {Array.from({length:7},(_,d)=>{ const diaIndex=w*7+d, grupos=buildDayCoverage(daysIndex[diaIndex]||[]), dt=fechaReal(diaIndex); const esFeriado=feriados.has(toDateStr(dt)); const ajustado=esFeriado||d>=5; return(
                    <div key={diaIndex} style={{minWidth:0,minHeight:56,borderRadius:10,background:esFeriado?'var(--warn-soft)':grupos.length?'#fff':'var(--surface2)',border:`1px solid ${esFeriado?'var(--warn)':'var(--line2)'}`,padding:'5px 4px 6px',display:'flex',flexDirection:'column',gap:4}}>
                      <div title={esFeriado?'Feriado — se ajustan los horarios':ajustado?'Fin de semana — se ajustan los horarios':undefined} style={{fontSize:12,fontWeight:800,color:esFeriado?'var(--warn)':d>=5?'var(--accent)':'var(--ink)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>{esFeriado&&<span style={{width:5,height:5,borderRadius:99,background:'var(--warn)',flexShrink:0}}/>}{dt.getDate()}<span style={{fontSize:8.5,color:'var(--ink3)',fontWeight:700}}> {MONTHS_SHORT[dt.getMonth()].toLowerCase()}</span></div>
                      {grupos.map(({tipo,asignadas,pendientes})=>{ const c=tipoColor(tipo.idTipoTurno); const enConf=conflictoKeys.has(`${toDateStr(dt)}|${formatHora(tipo.horaInicio)}`); const afectada=!enConf&&reglaAfecta(tipo,dt); return(
                        <div key={tipo.idTipoTurno} title={afectada?'Horario ajustado por una regla':undefined} style={{height:22,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',gap:2,background:enConf?'var(--warn-soft)':c.bg,border:`1.5px solid ${enConf?'var(--warn)':afectada?'var(--primary)':c.bar}`,boxShadow:afectada?'0 0 0 1px var(--primary-soft)':'none'}}>
                          {enConf&&<SGTIcon name="alert" size={10} color="var(--warn)"/>}
                          {afectada&&<SGTIcon name="clock" size={10} color="var(--primary)"/>}
                          <span style={{fontSize:11,fontWeight:900,color:enConf?'var(--warn)':afectada?'var(--primary)':c.ink,lineHeight:1}}>{asignadas.length+pendientes.length}</span>
                        </div>
                      );})}
                    </div>
                  );})}
                </div>
              </div>
            ))}
            </>)}

            {tab==='reglas'&&(
              reglas.length===0?(
                <div style={{padding:'24px 16px',textAlign:'center',color:'var(--ink3)',fontSize:12.5,fontWeight:600}}>Sin reglas activas para este servicio.</div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11.5,color:'var(--ink3)',fontWeight:700}}>
                    <span style={{flex:1}}>Marca las reglas a aplicar en esta generación.</span>
                    <button onClick={()=>setSeleccion(todasSeleccionadas?new Set():new Set(reglas.map(r=>r.idRegla)))} style={{background:'none',border:'none',color:'var(--primary)',fontWeight:800,fontSize:11.5,cursor:'pointer',fontFamily:'inherit'}}>{todasSeleccionadas?'Quitar todas':'Seleccionar todas'}</button>
                  </div>
                  {reglas.map(r=>{ const sel=seleccion.has(r.idRegla); return(
                    <div key={r.idRegla} onClick={()=>toggleRegla(r.idRegla)} style={{background:'#fff',border:`1.5px solid ${sel?'var(--primary)':'var(--line2)'}`,borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:8,cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:'grid',placeItems:'center',border:`2px solid ${sel?'var(--primary)':'var(--line)'}`,background:sel?'var(--primary)':'#fff'}}>{sel&&<SGTIcon name="check" size={13} color="#fff"/>}</span>
                        <span style={{fontSize:13.5,fontWeight:800,color:'var(--ink)',flex:1}}>{r.nombre}</span>
                        {r.aplicaFinDeSemana&&<span style={badgeMini}>Fin de semana</span>}
                        {r.aplicaFeriado&&<span style={badgeMini}>Feriado</span>}
                        <span style={{...badgeMini,color:'var(--accent)',background:'var(--accent-soft)'}}>{formatDesplazamientoHoras(r.tiempoMinutos)}</span>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {r.idTipoTurnoInicio!=null&&filaCambio(r.idTipoTurnoInicio,r.nombreTipoTurnoInicio,'inicio',r.tiempoMinutos)}
                        {r.idTipoTurnoFin!=null&&filaCambio(r.idTipoTurnoFin,r.nombreTipoTurnoFin,'fin',r.tiempoMinutos)}
                      </div>
                    </div>
                  );})}
                </div>
              )
            )}
          </div>
        )}
      </div>
      <div style={{padding:'10px 14px',background:'#fff',borderTop:'1px solid var(--line)',flexShrink:0,display:'flex',gap:8}}>
        <button onClick={onCancel} style={{padding:'14px 16px',borderRadius:12,background:'#fff',color:'var(--ink2)',border:'1.5px solid var(--line)',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Cancelar</button>
        <button onClick={()=>rangoValido&&setConfirmando(true)} disabled={!rangoValido||generando} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:(rangoValido&&!generando)?'var(--primary)':'var(--line)',color:(rangoValido&&!generando)?'#fff':'var(--ink3)',border:'none',fontSize:14.5,fontWeight:800,cursor:(rangoValido&&!generando)?'pointer':'not-allowed',fontFamily:'inherit'}}>
          <SGTIcon name="check" size={17} color={(rangoValido&&!generando)?'#fff':'var(--ink3)'}/> Confirmar y generar
        </button>
      </div>

      {confirmando&&(
        <div onClick={()=>!generando&&setConfirmando(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'8px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'}}>
            <div style={{display:'flex',justifyContent:'center',paddingBottom:14}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><div style={{width:56,height:56,borderRadius:16,background:'var(--primary-soft)',display:'grid',placeItems:'center'}}><SGTIcon name="calendar" size={26} color="var(--primary)"/></div></div>
            <div style={{fontWeight:800,fontSize:18,color:'var(--ink)',textAlign:'center',marginBottom:10}}>¿Generar la planificación?</div>
            <p style={{fontSize:14,color:'var(--ink2)',margin:'0 0 6px',lineHeight:1.5,textAlign:'center'}}>Se crearán <strong style={{color:'var(--ink)'}}>≈{totalTurnosEstimado} turnos</strong> entre el <strong style={{color:'var(--ink)'}}>{fmt(inicioEfectivaDt)}</strong> y el <strong style={{color:'var(--ink)'}}>{fmt(finEfectivaDt)}</strong> ({diasTotalesRango} días).</p>
            {inicioEfectiva!==fecha&&<p style={{fontSize:12,color:'var(--ink3)',margin:'0 0 6px',lineHeight:1.5,textAlign:'center'}}>Ancla de rotativa: <strong style={{color:'var(--ink)'}}>{fmt(start)}</strong> (fase del ciclo).</p>}
            <p style={{fontSize:12.5,color:'var(--ink3)',margin:'0 0 8px',lineHeight:1.5,textAlign:'center'}}>{conflictos.length>0?<><strong style={{color:'var(--warn)'}}>{conflictos.length}</strong> quedará{conflictos.length===1?'':'n'} vacante{conflictos.length===1?'':'s'} por conflicto de horario.</>:'Los turnos con choque de horario se crearán sin asignar (vacantes).'}</p>
            <p style={{fontSize:12,color:'var(--ink3)',margin:'0 0 22px',lineHeight:1.5,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><SGTIcon name="clock" size={12} color={reglasSel.length?'var(--primary)':'var(--ink3)'}/>{reglasSel.length>0?<>Se aplicarán <strong style={{color:'var(--primary)'}}>{reglasSel.length}</strong> regla{reglasSel.length===1?'':'s'} de horario.</>:'Sin reglas de horario (horarios base).'}</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmando(false)} disabled={generando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'1.5px solid var(--line)',background:'none',color:'var(--ink2)',fontSize:15,fontWeight:700,cursor:generando?'not-allowed':'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={()=>onConfirm(fecha,inicioEfectiva,finEfectiva,[...seleccion])} disabled={generando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'var(--primary)',color:'#fff',fontSize:15,fontWeight:700,cursor:generando?'not-allowed':'pointer',opacity:generando?0.7:1,fontFamily:'inherit'}}>{generando?'Generando…':'Sí, generar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Vista principal ────────────────────────────────────────────────────────── */
function PlanGuardarBase({onBack}){
  const{user}=useAuth();
  const{esDesktop}=useLayout();
  const servicioId=user?.servicioId;

  const[plantillas,setPlantillas]=useState([]);
  const[funcionarios,setFuncionarios]=useState([]);
  const[puestos,setPuestos]=useState([]);
  const[tipos,setTipos]=useState([]);
  const[moldes,setMoldes]=useState([]);
  const[cargandoDatos,setCargandoDatos]=useState(true);
  const[cargandoMoldes,setCargandoMoldes]=useState(false);
  const[error,setError]=useState('');

  const tipoColor=useMemo(()=>makeTipoColor(tipos),[tipos]);
  // Desktop: día (sol, verde) / noche (luna, rosado), como el resto del modo desktop.
  const tonoTipo=useMemo(()=>crearTonoTipo(tipos),[tipos]);

  const{instancias,inject,assign,unassign,removeInstancia,reset,loadMolde,toAsignaciones,daysIndex,maxSemanas}=usePlanificacionState({plantillas,funcionarios,puestos});

  const[planActualId,setPlanActualId]=useState(null);
  const[planNombre,setPlanNombre]=useState(null);
  const[injectOpen,setInjectOpen]=useState(false);
  const[moldesOpen,setMoldesOpen]=useState(false);
  const[generarOpen,setGenerarOpen]=useState(false);
  const[generando,setGenerando]=useState(false);
  const[eliminarOpen,setEliminarOpen]=useState(false);
  const[eliminandoTurnos,setEliminandoTurnos]=useState(false);
  const[vigenciasOpen,setVigenciasOpen]=useState(false);
  const[ejecuciones,setEjecuciones]=useState([]);
  const[cargandoEjecuciones,setCargandoEjecuciones]=useState(false);
  const[procesandoVigencia,setProcesandoVigencia]=useState(false);
  const[assignInstance,setAssignInstance]=useState(null);
  const[detailDia,setDetailDia]=useState(null);
  const[toast,setToast]=useState('');
  // R18-6e: asignaciones del último molde guardado o cargado, para saber si el
  // molde en pantalla tiene cambios sin guardar.
  const[asignacionesGuardadas,setAsignacionesGuardadas]=useState('[]');
  const[confirmarMoldeNuevo,setConfirmarMoldeNuevo]=useState(false);

  const flash=(msg)=>{ setToast(msg); setTimeout(()=>setToast(''),3800); };

  // Carga inicial de datos del servicio.
  useEffect(()=>{
    let activo=true;
    (async()=>{
      if(!servicioId){ setCargandoDatos(false); setError('No hay un servicio activo.'); return; }
      setCargandoDatos(true); setError('');
      try{
        const [pl,ti,pi,fu]=await Promise.all([
          plantillasService.getByServicio(servicioId),
          tiposTurnoService.getByServicio(servicioId),
          getPuestosPorServicio(servicioId),
          getFuncionariosSummary(servicioId),
        ]);
        if(!activo)return;
        setPlantillas(Array.isArray(pl)?pl:[]);
        setTipos(Array.isArray(ti)?ti:[]);
        setPuestos(pi?.success?(Array.isArray(pi.data)?pi.data:[]):[]);
        setFuncionarios(fu?.success?(Array.isArray(fu.data)?fu.data:[]):[]);
      }catch(e){ if(activo)setError(e?.response?.data?.error||e.message||'Error al cargar datos.'); }
      finally{ if(activo)setCargandoDatos(false); }
    })();
    return()=>{ activo=false; };
  },[servicioId]);

  const cargarMoldes=async()=>{
    if(!servicioId)return;
    setCargandoMoldes(true);
    try{ const data=await planificacionService.getByServicio(servicioId); setMoldes(Array.isArray(data)?data:[]); }
    catch(e){ setError(e?.response?.data?.error||e.message||'Error al cargar moldes.'); }
    finally{ setCargandoMoldes(false); }
  };

  const onInject=(dto)=>{ const created=inject(dto); setInjectOpen(false); if(created)flash(`${created.label} · ${created.nombreRotativa}${created.nombrePuesto?' · '+created.nombrePuesto:''}`); };
  const onAssign=(id,idFunc)=>{ assign(id,idFunc); setAssignInstance(null); flash('Funcionario asignado'); };

  const onSave=async(nombre)=>{
    try{
      const payload={ nombre, asignaciones:toAsignaciones() };
      let guardado;
      if(planActualId){ guardado=await planificacionService.update(planActualId,payload); }
      else { guardado=await planificacionService.create({ idServicio:servicioId, ...payload }); }
      setPlanActualId(guardado?.idPlanificacion??planActualId);
      setPlanNombre(nombre);
      setAsignacionesGuardadas(JSON.stringify(payload.asignaciones));
      setMoldesOpen(false);
      flash(`Molde "${nombre}" guardado`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al guardar el molde.'); }
  };

  const onLoad=async(id)=>{
    try{
      const pl=await planificacionService.getById(id);
      loadMolde(pl);
      setPlanActualId(pl.idPlanificacion);
      setPlanNombre(pl.nombre);
      // Mismo formato que toAsignaciones() de las instancias que arma loadMolde.
      setAsignacionesGuardadas(JSON.stringify((pl.asignaciones||[]).map(a=>({ idRotativa:a.idRotativa, idFuncionario:a.idFuncionario||null, idPuesto:a.idPuesto||null }))));
      setMoldesOpen(false);
      flash(`Molde "${pl.nombre}" cargado`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al cargar el molde.'); }
  };

  const onDeleteMolde=async(pl)=>{
    try{
      await planificacionService.remove(pl.idPlanificacion);
      // Si era el molde en pantalla, lo que se ve queda como un molde sin guardar.
      if(planActualId===pl.idPlanificacion){ setPlanActualId(null); setPlanNombre(null); setAsignacionesGuardadas('[]'); }
      await cargarMoldes();
      flash(`Molde "${pl.nombre}" eliminado`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al eliminar el molde.'); }
  };

  const onGenerar=async(fechaInicioRotativa,fechaInicioEfectiva,fechaFinEfectiva,idsReglas=[])=>{
    if(!planActualId){ setGenerarOpen(false); flash('Guarda el molde antes de generar.'); return; }
    setGenerando(true);
    try{
      const res=await planificacionService.generar(planActualId,fechaInicioRotativa,fechaInicioEfectiva,fechaFinEfectiva,idsReglas);
      setGenerarOpen(false);
      const vac=res?.vacantesPorConflicto||0;
      flash(`${res?.generados||0} turnos generados${vac?` · ${vac} vacantes por conflicto`:''}`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al generar.'); }
    finally{ setGenerando(false); }
  };

  const onEliminarTurnos=async(fechaInicio,fechaFin)=>{
    setEliminandoTurnos(true);
    try{
      const res=await planificacionService.eliminarTurnosGenerados(planActualId,fechaInicio,fechaFin);
      setEliminarOpen(false);
      flash(`${res?.eliminados||0} turnos eliminados`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al eliminar turnos.'); }
    finally{ setEliminandoTurnos(false); }
  };

  const abrirEliminarTurnos=()=>{ if(!planActualId){ flash('Guarda el molde antes de eliminar turnos generados.'); return; } setEliminarOpen(true); };

  const cargarEjecuciones=async()=>{
    if(!servicioId)return;
    setCargandoEjecuciones(true);
    try{ const list=await planificacionService.getEjecucionesServicio(servicioId); setEjecuciones(Array.isArray(list)?list:[]); }
    catch(e){ setError(e?.response?.data?.error||e.message||'Error al cargar las vigencias.'); }
    finally{ setCargandoEjecuciones(false); }
  };

  const abrirVigencias=()=>{ setVigenciasOpen(true); cargarEjecuciones(); };

  const onAcortarEjecucion=async(idEjecucion,fechaDesde)=>{
    setProcesandoVigencia(true);
    try{
      const res=await planificacionService.acortarEjecucion(idEjecucion,fechaDesde);
      flash(`${res?.turnosDesactivados||0} turnos eliminados desde ${fechaDesde}`);
      await cargarEjecuciones();
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al eliminar desde esa fecha.'); }
    finally{ setProcesandoVigencia(false); }
  };

  const onAnularEjecucion=async(idEjecucion)=>{
    setProcesandoVigencia(true);
    try{
      const res=await planificacionService.anularEjecucion(idEjecucion);
      flash(`${res?.eliminados||0} turnos eliminados`);
      await cargarEjecuciones();
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al anular la vigencia.'); }
    finally{ setProcesandoVigencia(false); }
  };

  const onEditarDesdeFecha=async(fechaDesde,fechaFinEfectiva)=>{
    setProcesandoVigencia(true);
    try{
      const res=await planificacionService.editarDesde(planActualId,{ fechaDesde, fechaFinEfectiva, asignaciones:toAsignaciones() });
      flash(`${res?.generados||0} turnos generados en la nueva vigencia`);
      await cargarEjecuciones();
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al editar desde esa fecha.'); }
    finally{ setProcesandoVigencia(false); }
  };

  const openMoldes=()=>{ cargarMoldes(); setMoldesOpen(true); };
  const empezarMoldeNuevo=()=>{ reset(); setPlanActualId(null); setPlanNombre(null); setAsignacionesGuardadas('[]'); setConfirmarMoldeNuevo(false); flash('Molde nuevo'); };
  // R18-6e: «Molde nuevo» vacía la pantalla; si hay cambios sin guardar, primero pregunta.
  const haySinGuardar=JSON.stringify(toAsignaciones())!==asignacionesGuardadas;
  const nuevoMolde=()=>{ if(haySinGuardar){ setConfirmarMoldeNuevo(true); return; } empezarMoldeNuevo(); };
  const textoMoldeNuevo='El molde en pantalla tiene cambios sin guardar. Si empiezas uno nuevo, se pierden.';

  const dayEntradas=detailDia!=null?(daysIndex[detailDia]||[]):[];

  if(cargandoDatos){
    if(esDesktop)return <MoldeCargandoDesktop/>;
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface2)'}}>
        <TopHeader title="Planificación" dense leftSlot={<button onClick={onBack} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}/>
        <div style={{flex:1,display:'grid',placeItems:'center',color:'var(--ink3)',fontSize:13,fontWeight:600}}>Cargando datos del servicio…</div>
      </div>
    );
  }

  if(generarOpen){
    return <GenerarView instancias={instancias} daysIndex={daysIndex} maxSemanas={maxSemanas} tipoColor={tipoColor} tipos={tipos} servicioId={servicioId} generando={generando} planActualId={planActualId} onCancel={()=>setGenerarOpen(false)} onConfirm={onGenerar} nombreMolde={planNombre} tonoTipo={tonoTipo} funcionarios={funcionarios}/>;
  }

  // Desktop (R18): vista raíz del menú (sin volver). El molde a lo ancho y los
  // mismos paneles que en el móvil, como paneles laterales.
  if(esDesktop){
    return(
      <>
        <MoldeDesktop
          servicioNombre={localStorage.getItem('sgt_servicio_activo_nombre')||''}
          planNombre={planNombre}
          planActualId={planActualId}
          instancias={instancias}
          puestos={puestos}
          funcionarios={funcionarios}
          tipos={tipos}
          daysIndex={daysIndex}
          maxSemanas={maxSemanas}
          coberturaDia={buildDayCoverage}
          tonoTipo={tonoTipo}
          formatoRango={rangoHoras}
          error={error}
          onCerrarError={()=>setError('')}
          toast={toast}
          onNuevoMolde={nuevoMolde}
          onMoldes={openMoldes}
          onVigencias={abrirVigencias}
          onEliminarTurnos={abrirEliminarTurnos}
          onAgregar={()=>setInjectOpen(true)}
          onGenerar={()=>setGenerarOpen(true)}
          onAsignar={(inst)=>setAssignInstance(inst)}
          onDia={(di)=>setDetailDia(di)}
        />
        <InyectarSheet open={injectOpen} onClose={()=>setInjectOpen(false)} onInject={onInject} plantillas={plantillas} puestos={puestos}/>
        <MoldesSheet open={moldesOpen} onClose={()=>setMoldesOpen(false)} onSave={onSave} onLoad={onLoad} onDelete={onDeleteMolde} instancias={instancias} moldes={moldes} loading={cargandoMoldes} nombreInicial={planNombre} planActualId={planActualId}/>
        <EliminarTurnosSheet open={eliminarOpen} onClose={()=>setEliminarOpen(false)} onConfirm={onEliminarTurnos} eliminando={eliminandoTurnos} nombreMolde={planNombre}/>
        <VigenciasSheet
          open={vigenciasOpen}
          onClose={()=>setVigenciasOpen(false)}
          ejecuciones={ejecuciones}
          cargando={cargandoEjecuciones}
          onAcortar={onAcortarEjecucion}
          onAnular={onAnularEjecucion}
          onEditarDesde={onEditarDesdeFecha}
          procesando={procesandoVigencia}
          moldeActualId={planActualId}
          nombreMoldeActual={planNombre}
        />
        <AsignarFuncionarioSheet open={!!assignInstance} onClose={()=>setAssignInstance(null)} instancia={assignInstance?instancias.find(i=>i.id===assignInstance.id):null} instancias={instancias} funcionarios={funcionarios} onAssign={onAssign} onUnassign={(id)=>{ unassign(id); flash('Asignación retirada'); }} onRemove={(id)=>{ removeInstancia(id); flash('Rotativa quitada'); }}/>
        <DetalleDiaSheet open={detailDia!=null} onClose={()=>setDetailDia(null)} diaIndex={detailDia} entradasDelDia={dayEntradas} tipoColor={tipoColor} tonoTipo={tonoTipo} funcionarios={funcionarios} onAssignInstance={(inst)=>{ setDetailDia(null); setTimeout(()=>setAssignInstance(inst),220); }}/>
        {confirmarMoldeNuevo&&(
          <ConfirmacionPlan
            titulo="¿Empezar un molde nuevo?"
            tono="peligro"
            etiquetaConfirmar="Sí, empezar de nuevo"
            onCancelar={()=>setConfirmarMoldeNuevo(false)}
            onConfirmar={empezarMoldeNuevo}
          >
            <p>{textoMoldeNuevo}</p>
          </ConfirmacionPlan>
        )}
      </>
    );
  }

  return(
    <div className="dash-page-bg" style={{flex:1,display:'flex',flexDirection:'column',animation:'sgtSlideLeft .3s ease',overflow:'hidden',position:'relative'}}>
      <TopHeader
        title="Planificación"
        subtitle={planNombre||'Molde de rotativas · por semanas'}
        dense
        leftSlot={<button onClick={onBack} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}
        rightSlot={
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button onClick={nuevoMolde} title="Molde nuevo" style={ghostBtnGB}><SGTIcon name="plus" size={16} color="var(--ink2)"/></button>
            <button onClick={abrirVigencias} title="Ver vigencias del servicio (eliminar desde fecha, anular, editar)" style={ghostBtnGB}><SGTIcon name="clock" size={15} color="var(--primary)"/></button>
            <button onClick={abrirEliminarTurnos} aria-label="Eliminar turnos generados" title="Eliminar los turnos de las rotativas del molde en un rango de fechas (legado)" style={ghostBtnGB}><SGTIcon name="trash" size={15} color="var(--warn)"/></button>
            <button onClick={()=>setInjectOpen(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 12px',borderRadius:10,background:'var(--primary)',color:'#fff',border:'none',fontSize:12.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}><SGTIcon name="plus" size={14} color="#fff"/> Agregar</button>
          </div>
        }
      />

      <div style={{padding:'10px 14px 4px',background:'#fff',flexShrink:0,borderBottom:'1px solid var(--line2)'}}><KPIBar instancias={instancias} dense/></div>

      {error&&<div style={{margin:'6px 14px 0',background:'var(--warn-soft)',color:'var(--warn)',borderRadius:8,padding:'8px 12px',fontSize:11.5,fontWeight:700,display:'flex',alignItems:'center',gap:7,flexShrink:0}}><SGTIcon name="alert" size={13} color="var(--warn)"/><span style={{flex:1}}>{error}</span><button onClick={()=>setError('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--warn)',display:'flex'}}><SGTIcon name="close" size={13}/></button></div>}
      {toast&&<div style={{margin:'6px 14px 0',background:'var(--success-soft)',color:'var(--success)',borderRadius:8,padding:'8px 12px',fontSize:11.5,fontWeight:700,display:'flex',alignItems:'center',gap:7,flexShrink:0}}><SGTIcon name="check-circle" size={13} color="var(--success)"/>{toast}</div>}

      <div style={{flex:1,overflow:'auto',background:'#fff'}}>
        {instancias.length===0?(
          <div style={{margin:'28px 16px',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:16,padding:'28px 22px',textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:14,background:'var(--primary-soft)',display:'grid',placeItems:'center',margin:'0 auto 14px'}}><SGTIcon name="calendar" size={26} color="var(--primary)"/></div>
            <div style={{fontSize:15,fontWeight:800,color:'var(--ink)',marginBottom:6}}>Arma tu molde de planificación</div>
            <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.5,marginBottom:16}}>1. Agrega una rotativa · 2. Asigna funcionarios · 3. Genera la planificación</div>
            <button onClick={()=>setInjectOpen(true)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:10,background:'var(--primary)',color:'#fff',border:'none',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}><SGTIcon name="plus" size={15} color="#fff"/> Agregar rotativa</button>
          </div>
        ):(
          <RelativeWeekGrid maxSemanas={maxSemanas} daysIndex={daysIndex} tipoColor={tipoColor} onDayClick={(di)=>setDetailDia(di)}/>
        )}
        <div style={{padding:'16px 14px 24px',background:'var(--surface2)',borderTop:'1px solid var(--line)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:11.5,fontWeight:800,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:0.4}}>Rotativas del molde</div>
            <span style={{fontSize:11,color:'var(--ink3)',fontWeight:700}}>{instancias.length} total</span>
          </div>
          <RotativasList instancias={instancias} onAssign={(inst)=>setAssignInstance(inst)} tipoColor={tipoColor}/>
        </div>
      </div>

      <div style={{padding:'10px 14px',background:'#fff',borderTop:'1px solid var(--line)',flexShrink:0,display:'flex',gap:8}}>
        <button onClick={openMoldes} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'14px 16px',borderRadius:12,background:'#fff',color:'var(--primary)',border:'1.5px solid var(--primary)',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}><SGTIcon name="calendar" size={16} color="var(--primary)"/> Moldes</button>
        <button onClick={()=>setGenerarOpen(true)} disabled={instancias.length===0} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:instancias.length===0?'var(--line)':'var(--primary)',color:instancias.length===0?'var(--ink3)':'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:instancias.length===0?'not-allowed':'pointer',fontFamily:'inherit'}}><SGTIcon name="check" size={17} color={instancias.length===0?'var(--ink3)':'#fff'}/> Generar planificación</button>
      </div>

      <InyectarSheet open={injectOpen} onClose={()=>setInjectOpen(false)} onInject={onInject} plantillas={plantillas} puestos={puestos}/>
      <MoldesSheet open={moldesOpen} onClose={()=>setMoldesOpen(false)} onSave={onSave} onLoad={onLoad} onDelete={onDeleteMolde} instancias={instancias} moldes={moldes} loading={cargandoMoldes} nombreInicial={planNombre} planActualId={planActualId}/>
      <EliminarTurnosSheet open={eliminarOpen} onClose={()=>setEliminarOpen(false)} onConfirm={onEliminarTurnos} eliminando={eliminandoTurnos} nombreMolde={planNombre}/>
      <VigenciasSheet
        open={vigenciasOpen}
        onClose={()=>setVigenciasOpen(false)}
        ejecuciones={ejecuciones}
        cargando={cargandoEjecuciones}
        onAcortar={onAcortarEjecucion}
        onAnular={onAnularEjecucion}
        onEditarDesde={onEditarDesdeFecha}
        procesando={procesandoVigencia}
        moldeActualId={planActualId}
        nombreMoldeActual={planNombre}
      />
      <AsignarFuncionarioSheet open={!!assignInstance} onClose={()=>setAssignInstance(null)} instancia={assignInstance?instancias.find(i=>i.id===assignInstance.id):null} instancias={instancias} funcionarios={funcionarios} onAssign={onAssign} onUnassign={(id)=>{ unassign(id); flash('Asignación retirada'); }} onRemove={(id)=>{ removeInstancia(id); flash('Rotativa quitada'); }}/>
      <DetalleDiaSheet open={detailDia!=null} onClose={()=>setDetailDia(null)} diaIndex={detailDia} entradasDelDia={dayEntradas} tipoColor={tipoColor} onAssignInstance={(inst)=>{ setDetailDia(null); setTimeout(()=>setAssignInstance(inst),220); }}/>
      {confirmarMoldeNuevo&&(
        <ConfirmacionMovil
          titulo="¿Empezar un molde nuevo?"
          icono="alert"
          etiquetaConfirmar="Sí, empezar de nuevo"
          onCancelar={()=>setConfirmarMoldeNuevo(false)}
          onConfirmar={empezarMoldeNuevo}
        >
          {textoMoldeNuevo}
        </ConfirmacionMovil>
      )}
    </div>
  );
}

export default function PlanificacionView({onBack}){
  return <PlanGuardarBase onBack={onBack}/>;
}
