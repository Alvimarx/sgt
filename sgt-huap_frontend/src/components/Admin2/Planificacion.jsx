import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useAuth } from '../../context/AuthContext';
import { plantillasService, tiposTurnoService, formatHora } from '../../services/plantillasService';
import { getPisosPorServicio } from '../../services/pisosService';
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { planificacionService } from '../../services/planificacionService';

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

/** Construye un mapa idPlantillaTurno → color estable según el orden de los tipos. */
function makeTipoColor(tipos){
  const idx={}; (tipos||[]).forEach((t,i)=>{ idx[t.idPlantillaTurno]=i; });
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

/** Secuencia porDia [{idPlantillaTurno,nombre,horaInicio,horaTermino}...] desde PlantillaDTO.secuenciaDias. */
function buildSecuencia(plantilla){
  const total=(plantilla.semanas||0)*7;
  const porDia=Array.from({length:total},()=>[]);
  (plantilla.secuenciaDias||[]).forEach(d=>{
    const idx=d?.diaIndex; const t=d?.turno;
    if(idx!=null && idx>=0 && idx<total && t && t.idPlantillaTurno!=null){
      porDia[idx].push({ idPlantillaTurno:t.idPlantillaTurno, nombre:t.nombre, horaInicio:t.horaInicio, horaTermino:t.horaTermino });
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
function Sheet({open,onClose,children,title,maxHeight='85%'}){
  if(!open)return null;
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

/* ─── PisoTag ────────────────────────────────────────────────────────────────── */
function PisoTag({inst,size='sm'}){
  if(!inst||!inst.nombrePiso)return null;
  const fs=size==='xs'?9.5:10.5;
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:fs,fontWeight:900,letterSpacing:0.2,padding:'1px 6px',borderRadius:99,background:'var(--primary-soft)',color:'var(--primary)',whiteSpace:'nowrap'}}><SGTIcon name="home" size={fs-1} color="var(--primary)"/>{inst.nombrePiso}</span>;
}

/* ─── PisoSelector ───────────────────────────────────────────────────────────── */
function PisoSelector({pisos,value,onChange}){
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  return(
    <div>
      <span style={lbl}>Asociar a piso / unidad</span>
      {pisos.length===0?(
        <div style={{fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay pisos en este servicio.</div>
      ):(
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {pisos.map(p=>{ const sel=String(p.idPiso)===String(value); return(
            <button key={p.idPiso} onClick={()=>onChange(String(p.idPiso))} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 13px',borderRadius:99,cursor:'pointer',fontFamily:'inherit',background:sel?'var(--primary)':'#fff',border:`1.5px solid ${sel?'var(--primary)':'var(--line)'}`,color:sel?'#fff':'var(--ink)',fontSize:13,fontWeight:800}}>
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
    const key=tipo.idPlantillaTurno;
    if(!byTipo[key])byTipo[key]={tipo,asignadas:[],pendientes:[]};
    if(inst.idFuncionario)byTipo[key].asignadas.push(inst); else byTipo[key].pendientes.push(inst);
  });
  return Object.values(byTipo);
}

/* ─── Estado de planificación (sobre datos reales) ─────────────────────────── */
function usePlanificacionState({plantillas,funcionarios,pisos}){
  const[instancias,setInstancias]=useState([]);
  const counter=useRef(0);

  const reset=()=>{ setInstancias([]); counter.current=0; };

  const instanciaDesdePlantilla=(plantilla,extra={})=>{
    counter.current+=1; const n=counter.current;
    return {
      id:`inst-${n}`, label:`R${n}`,
      idPlantilla:plantilla.idPlantilla, nombrePlantilla:plantilla.nombre,
      semanas:plantilla.semanas, secuencia:buildSecuencia(plantilla),
      idFuncionario:null, nombreFuncionario:null, iniciales:null, profesion:null,
      idPiso:null, nombrePiso:null, ...extra,
    };
  };

  const inject=({idPlantilla,idPiso})=>{
    const plantilla=plantillas.find(p=>p.idPlantilla===Number(idPlantilla)); if(!plantilla)return null;
    const piso=idPiso?pisos.find(p=>p.idPiso===Number(idPiso)):null;
    const nueva=instanciaDesdePlantilla(plantilla,{idPiso:piso?.idPiso||null,nombrePiso:piso?.nombre||null});
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
      const plantilla=plantillas.find(p=>p.idPlantilla===a.idPlantilla);
      counter.current+=1; const n=counter.current;
      return {
        id:`inst-${n}`, label:`R${n}`,
        idPlantilla:a.idPlantilla, nombrePlantilla:a.nombrePlantilla||plantilla?.nombre||'Rotativa',
        semanas:plantilla?.semanas||0, secuencia:plantilla?buildSecuencia(plantilla):[],
        idFuncionario:a.idFuncionario||null, nombreFuncionario:a.nombreFuncionario||null,
        iniciales:a.nombreFuncionario?a.nombreFuncionario.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join(''):null,
        profesion:null, idPiso:a.idPiso||null, nombrePiso:a.nombrePiso||null,
      };
    });
    setInstancias(nuevas);
  };

  // Asignaciones para enviar al backend.
  const toAsignaciones=()=>instancias.map(i=>({ idPlantilla:i.idPlantilla, idFuncionario:i.idFuncionario||null, idPiso:i.idPiso||null }));

  const daysIndex=useMemo(()=>{
    const m={};
    instancias.forEach(inst=>{ (inst.secuencia||[]).forEach((tipos,diaIndex)=>{ tipos.forEach(tipo=>{ (m[diaIndex]??=[]).push({inst,tipo}); }); }); });
    return m;
  },[instancias]);
  const maxSemanas=useMemo(()=>instancias.reduce((mx,i)=>Math.max(mx,i.semanas||0),0),[instancias]);

  return{instancias,inject,assign,unassign,removeInstancia,reset,loadMolde,toAsignaciones,daysIndex,maxSemanas};
}

/* ─── InyectarSheet ──────────────────────────────────────────────────────────── */
function InyectarSheet({open,onClose,onInject,plantillas,pisos,tipoColor}){
  const[idPlantilla,setIdPlantilla]=useState('');
  const[idPiso,setIdPiso]=useState('');
  const[err,setErr]=useState('');
  if(!open)return null;

  const handle=()=>{ if(!idPlantilla)return setErr('Selecciona una rotativa.'); if(!idPiso)return setErr('Selecciona el piso.'); setErr(''); onInject({idPlantilla:Number(idPlantilla),idPiso:Number(idPiso)}); setIdPlantilla(''); setIdPiso(''); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title="Agregar rotativa" maxHeight="90%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>La rotativa quedará <strong style={{color:'var(--ink)'}}>pendiente de asignación</strong> y asociada al piso que elijas.</div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Rotativa</span>
          {plantillas.length===0?(
            <div style={{fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay rotativas en este servicio. Créalas en «Rotativas».</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {plantillas.map(p=>{ const selected=String(p.idPlantilla)===idPlantilla; const turnos=buildSecuencia(p).reduce((s,d)=>s+d.length,0); return(
                <button key={p.idPlantilla} onClick={()=>setIdPlantilla(String(p.idPlantilla))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?'var(--primary-soft)':'#fff',border:`1.5px solid ${selected?'var(--primary)':'var(--line)'}`,borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{p.nombre}</div><div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,marginTop:1}}>{p.semanas} semanas · {turnos} turnos</div></div>
                  <div style={{width:18,height:18,borderRadius:99,border:`2px solid ${selected?'var(--primary)':'var(--line)'}`,background:selected?'var(--primary)':'transparent',display:'grid',placeItems:'center',flexShrink:0}}>{selected&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</div>
                </button>
              );})}
            </div>
          )}
        </div>
        <PisoSelector pisos={pisos} value={idPiso} onChange={setIdPiso}/>
        <button onClick={handle} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="plus" size={16} color="#fff"/> Agregar al molde
        </button>
      </div>
    </Sheet>
  );
}

/* ─── AsignarFuncionarioSheet ────────────────────────────────────────────────── */
function AsignarFuncionarioSheet({open,onClose,onAssign,instancia,onUnassign,onRemove,instancias=[],funcionarios=[]}){
  if(!open||!instancia)return null;
  const[idFuncionario,setIdFuncionario]=useState(instancia.idFuncionario?String(instancia.idFuncionario):'');
  const[err,setErr]=useState('');
  const totalTurnos=(instancia.secuencia||[]).reduce((s,d)=>s+d.length,0);

  useEffect(()=>{ setIdFuncionario(instancia.idFuncionario?String(instancia.idFuncionario):''); setErr(''); },[instancia]);

  const handle=()=>{
    if(!idFuncionario)return setErr('Selecciona un funcionario.');
    const conflicto=findDobleAsignacion(instancias,instancia.id,Number(idFuncionario));
    if(conflicto){ const f=funcionarios.find(x=>x.idFuncionario===Number(idFuncionario)); return setErr(`${f?nombreFunc(f):'Esta persona'} ya cubre ${conflicto.label} · ${conflicto.nombrePlantilla}, que se superpone en horario.`); }
    setErr(''); onAssign(instancia.id,Number(idFuncionario));
  };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title={`Asignar a ${instancia.label}`} maxHeight="90%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'var(--surface2)',borderRadius:14,padding:14}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:10.5,fontWeight:900,color:'#fff',background:'var(--primary)',padding:'2px 7px',borderRadius:99}}>{instancia.label}</span><span style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{instancia.nombrePlantilla}</span></div>
          <div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>{instancia.semanas} semanas · {totalTurnos} turnos<PisoTag inst={instancia} size="xs"/></div>
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

/* ─── MoldesSheet (guardar / cargar / eliminar contra el backend) ───────────── */
function MoldesSheet({open,onClose,onSave,onLoad,onDelete,instancias,moldes,loading,nombreInicial,planActualId}){
  const[tab,setTab]=useState('guardar');
  const[nombre,setNombre]=useState('');
  const[err,setErr]=useState('');
  useEffect(()=>{ if(open){ setTab('guardar'); setNombre(nombreInicial||''); setErr(''); } },[open,nombreInicial]);
  if(!open)return null;

  const totalTurnos=instancias.reduce((a,i)=>a+(i.secuencia||[]).reduce((s,d)=>s+d.length,0),0);
  const pend=instancias.filter(i=>!i.idFuncionario).length;

  const handleSave=()=>{ if(!nombre.trim())return setErr('Ponle un nombre al molde.'); if(instancias.length===0)return setErr('Agrega al menos una rotativa.'); setErr(''); onSave(nombre.trim()); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  const tabBtn=(key,icon,label)=>{ const active=tab===key; return <button onClick={()=>setTab(key)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 8px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',background:active?'#fff':'transparent',border:'none',color:active?'var(--primary)':'var(--ink3)',fontSize:13,fontWeight:800,boxShadow:active?'0 1px 3px rgba(15,23,42,0.10)':'none'}}><SGTIcon name={icon} size={15} color={active?'var(--primary)':'var(--ink3)'}/>{label}</button>; };

  return(
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
                    <button onClick={()=>onDelete(pl)} title="Eliminar molde" style={{background:'var(--warn-soft)',border:'none',borderRadius:9,width:32,height:32,display:'grid',placeItems:'center',cursor:'pointer',flexShrink:0}}><SGTIcon name="trash" size={15} color="var(--warn)"/></button>
                  </div>
                );})}
              </div>
            )}
          </Fragment>
        )}
      </div>
    </Sheet>
  );
}

/* ─── DetalleDiaSheet (Semana X · Día, agrupado por tipo real) ─────────────── */
function DetalleDiaSheet({open,onClose,diaIndex,entradasDelDia,tipoColor,onAssignInstance}){
  if(!open||diaIndex==null)return null;
  const grupos=buildDayCoverage(entradasDelDia);
  const semana=Math.floor(diaIndex/7)+1, dl=DIA_NOMBRE[diaIndex%7];

  return(
    <Sheet open={open} onClose={onClose} title={`Semana ${semana} · ${dl}`} maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        {grupos.length===0&&<div style={{padding:20,textAlign:'center',fontSize:12.5,color:'var(--ink3)',fontWeight:600}}>Día libre (sin turnos).</div>}
        {grupos.map(({tipo,asignadas,pendientes})=>{
          const c=tipoColor(tipo.idPlantillaTurno);
          return(
            <div key={tipo.idPlantillaTurno} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:c.soft}}>
                <div style={{width:32,height:32,borderRadius:9,background:c.bar,display:'grid',placeItems:'center'}}><SGTIcon name="clock" size={15} color="#fff"/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:c.ink}}>{tipo.nombre}</div><div style={{fontSize:10.5,color:c.ink,opacity:0.75,fontWeight:700,marginTop:1}}>{rangoHoras(tipo)}</div></div>
                {pendientes.length>0?<SGTBadge tone="warn" size="xs">{pendientes.length} vacante{pendientes.length===1?'':'s'}</SGTBadge>:<SGTBadge tone="success" size="xs">Completo</SGTBadge>}
              </div>
              {asignadas.length>0&&<div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:4}}>
                {asignadas.map(inst=>(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:'var(--surface2)',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <SGTAvatar person={{iniciales:inst.iniciales}} size={30}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.nombreFuncionario}</div><div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}><span style={{fontSize:10,fontWeight:800,color:'var(--ink3)'}}>{inst.label}</span><PisoTag inst={inst} size="xs"/></div></div>
                  </button>
                ))}
              </div>}
              {pendientes.length>0&&<div style={{padding:'0 10px 10px',display:'flex',flexDirection:'column',gap:4}}>
                {pendientes.map(inst=>(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1px dashed ${c.bar}`,borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <div style={{width:30,height:30,borderRadius:99,background:'#fff',display:'grid',placeItems:'center',border:`1px solid ${c.bg}`,flexShrink:0}}><SGTIcon name="user" size={14} color={c.ink}/></div>
                    <div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,fontWeight:800,color:c.ink}}>Vacante · {inst.label}</span><PisoTag inst={inst} size="xs"/></div><div style={{fontSize:10,fontWeight:700,color:c.ink,opacity:0.7,marginTop:1}}>Toca para asignar funcionario</div></div>
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
  const grouped=useMemo(()=>{ const m={}; instancias.forEach(inst=>{ (m[inst.nombrePlantilla]??=[]).push(inst); }); return Object.entries(m).sort(([a],[b])=>a.localeCompare(b,'es')); },[instancias]);
  const[abierto,setAbierto]=useState({});
  const toggle=(name)=>setAbierto(p=>({...p,[name]:!p[name]}));

  if(instancias.length===0)return <div style={{padding:20,background:'#fff',borderRadius:12,border:'1px dashed var(--line)',textAlign:'center',fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay rotativas en el molde. Toca <strong>Agregar</strong> para empezar.</div>;

  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {grouped.map(([nombrePlantilla,list])=>{
        const primerTipo=(list[0].secuencia||[]).flat()[0];
        const c=tipoColor(primerTipo?.idPlantillaTurno);
        const pend=list.filter(i=>!i.idFuncionario).length, open=!!abierto[nombrePlantilla];
        return(
          <div key={nombrePlantilla} style={{background:'#fff',borderRadius:12,border:'1px solid var(--line)',overflow:'hidden'}}>
            <button onClick={()=>toggle(nombrePlantilla)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:'none',border:'none',borderLeft:`5px solid ${c.bar}`,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{width:30,height:30,borderRadius:8,background:c.bar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="calendar" size={15} color="#fff"/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombrePlantilla}</div>
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
                        <PisoTag inst={inst} size="xs"/>
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
                  {grupos.map(({tipo,asignadas,pendientes})=>{ const c=tipoColor(tipo.idPlantillaTurno); const total=asignadas.length+pendientes.length; const allAssigned=pendientes.length===0; return(
                    <div key={tipo.idPlantillaTurno} style={{height:22,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',gap:3,background:allAssigned?c.bg:'#fff',backgroundImage:allAssigned?'none':`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1.5px solid ${c.bar}`,borderStyle:allAssigned?'solid':'dashed',position:'relative'}}>
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
function GenerarView({instancias,daysIndex,maxSemanas,tipoColor,onCancel,onConfirm,generando,planActualId}){
  const[fecha,setFecha]=useState('');
  const[pickSeed,setPickSeed]=useState(toDateStr(new Date()));
  const[confirmando,setConfirmando]=useState(false);
  const[conflictos,setConflictos]=useState([]);
  const[cargandoConf,setCargandoConf]=useState(false);
  const{weeks,year,month}=useMemo(()=>buildMonthGrid(pickSeed),[pickSeed]);
  const start=fecha?parseLocalDate(fecha):null;
  const semanas=Math.max(1,maxSemanas||0);
  const totalTurnos=instancias.reduce((a,i)=>a+(i.secuencia||[]).reduce((s,d)=>s+d.length,0),0);

  const fechaReal=(rel)=>{ const dt=new Date(start); dt.setDate(start.getDate()+rel); return dt; };
  let minD=null,maxD=null;
  if(start){ const tot=semanas*7; for(let r=0;r<tot;r++){ if((daysIndex[r]||[]).length){ const dt=fechaReal(r); if(!minD||dt<minD)minD=dt; if(!maxD||dt>maxD)maxD=dt; } } }
  const fmt=(dt)=>dt?`${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`:'—';
  const stepLbl={fontSize:11,fontWeight:800,color:'var(--primary)',textTransform:'uppercase',letterSpacing:0.4,marginBottom:10,display:'flex',alignItems:'center',gap:6};
  const stepNum=(n)=><span style={{width:18,height:18,borderRadius:99,background:'var(--primary)',color:'#fff',fontSize:11,fontWeight:900,display:'grid',placeItems:'center'}}>{n}</span>;

  // Pre-chequeo de conflictos contra turnos existentes (requiere molde guardado).
  useEffect(()=>{
    let activo=true;
    if(!fecha||!planActualId){ setConflictos([]); return; }
    setCargandoConf(true);
    planificacionService.conflictos(planActualId,fecha)
      .then(list=>{ if(activo)setConflictos(Array.isArray(list)?list:[]); })
      .catch(()=>{ if(activo)setConflictos([]); })
      .finally(()=>{ if(activo)setCargandoConf(false); });
    return()=>{ activo=false; };
  },[fecha,planActualId]);

  // Claves "fecha|HH:MM" para resaltar los bloques en conflicto del calendario.
  const conflictoKeys=useMemo(()=>{ const s=new Set(); conflictos.forEach(c=>s.add(`${c.fecha}|${formatHora(c.horaInicio)}`)); return s; },[conflictos]);

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface2)',animation:'sgtSlideLeft .3s ease',overflow:'hidden'}}>
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
          <div style={{fontSize:11,color:'var(--ink3)',fontWeight:600,marginTop:8,display:'flex',alignItems:'center',gap:5}}><SGTIcon name="calendar" size={12} color="var(--ink3)"/>Solo puedes iniciar un <strong style={{color:'var(--ink)'}}>lunes</strong> (resaltados).</div>
        </div>

        {!start?(
          <div style={{padding:'30px 20px',textAlign:'center',color:'var(--ink3)',fontSize:12.5,fontWeight:600}}>Selecciona un lunes para ver dónde se generarán los turnos.</div>
        ):(
          <div style={{padding:'14px'}}>
            <div style={stepLbl}>{stepNum(2)} Previsualización</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {[['calendar','var(--primary)','var(--primary-soft)',instancias.length,'Rotativas'],['clock','var(--accent)','var(--accent-soft)',totalTurnos,'Turnos']].map(([icon,ink,bg,n,label])=>(
                <div key={label} style={{flex:1,background:'#fff',border:'1px solid var(--line)',borderRadius:10,padding:'10px',textAlign:'center'}}>
                  <div style={{width:26,height:26,borderRadius:8,background:bg,display:'grid',placeItems:'center',margin:'0 auto 6px'}}><SGTIcon name={icon} size={14} color={ink}/></div>
                  <div style={{fontSize:17,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div>
                  <div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            {minD&&<div style={{background:'#fff',border:'1px solid var(--line)',borderRadius:10,padding:'9px 12px',display:'flex',alignItems:'center',gap:8,marginBottom:10}}><SGTIcon name="calendar" size={15} color="var(--ink3)"/><span style={{fontSize:12.5,fontWeight:700,color:'var(--ink)'}}>{fmt(minD)} → {fmt(maxD)}</span></div>}

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

            {Array.from({length:semanas},(_,w)=>(
              <div key={w} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.4,marginBottom:5}}>Semana {w+1}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:5}}>
                  {Array.from({length:7},(_,d)=>{ const diaIndex=w*7+d, grupos=buildDayCoverage(daysIndex[diaIndex]||[]), dt=fechaReal(diaIndex); return(
                    <div key={diaIndex} style={{minWidth:0,minHeight:42,borderRadius:9,background:grupos.length?'#fff':'var(--surface2)',border:'1px solid var(--line2)',padding:'3px 3px 5px',display:'flex',flexDirection:'column',gap:3}}>
                      <div style={{fontSize:10,fontWeight:800,color:d>=5?'var(--accent)':'var(--ink)',textAlign:'center'}}>{dt.getDate()}<span style={{fontSize:8,color:'var(--ink3)',fontWeight:700}}> {MONTHS_SHORT[dt.getMonth()].toLowerCase()}</span></div>
                      {grupos.map(({tipo,asignadas,pendientes})=>{ const c=tipoColor(tipo.idPlantillaTurno); const enConf=conflictoKeys.has(`${toDateStr(dt)}|${formatHora(tipo.horaInicio)}`); return(
                        <div key={tipo.idPlantillaTurno} style={{height:20,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',gap:2,background:enConf?'var(--warn-soft)':c.bg,border:`1.5px solid ${enConf?'var(--warn)':c.bar}`}}>
                          {enConf&&<SGTIcon name="alert" size={9} color="var(--warn)"/>}
                          <span style={{fontSize:10,fontWeight:900,color:enConf?'var(--warn)':c.ink,lineHeight:1}}>{asignadas.length+pendientes.length}</span>
                        </div>
                      );})}
                    </div>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{padding:'10px 14px',background:'#fff',borderTop:'1px solid var(--line)',flexShrink:0,display:'flex',gap:8}}>
        <button onClick={onCancel} style={{padding:'14px 16px',borderRadius:12,background:'#fff',color:'var(--ink2)',border:'1.5px solid var(--line)',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Cancelar</button>
        <button onClick={()=>start&&setConfirmando(true)} disabled={!start||generando} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:(start&&!generando)?'var(--primary)':'var(--line)',color:(start&&!generando)?'#fff':'var(--ink3)',border:'none',fontSize:14.5,fontWeight:800,cursor:(start&&!generando)?'pointer':'not-allowed',fontFamily:'inherit'}}>
          <SGTIcon name="check" size={17} color={(start&&!generando)?'#fff':'var(--ink3)'}/> Confirmar y generar
        </button>
      </div>

      {confirmando&&(
        <div onClick={()=>!generando&&setConfirmando(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'8px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'}}>
            <div style={{display:'flex',justifyContent:'center',paddingBottom:14}}><div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/></div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><div style={{width:56,height:56,borderRadius:16,background:'var(--primary-soft)',display:'grid',placeItems:'center'}}><SGTIcon name="calendar" size={26} color="var(--primary)"/></div></div>
            <div style={{fontWeight:800,fontSize:18,color:'var(--ink)',textAlign:'center',marginBottom:10}}>¿Generar la planificación?</div>
            <p style={{fontSize:14,color:'var(--ink2)',margin:'0 0 6px',lineHeight:1.5,textAlign:'center'}}>Se crearán <strong style={{color:'var(--ink)'}}>{totalTurnos} turnos</strong> desde el <strong style={{color:'var(--ink)'}}>{fmt(minD)}</strong>.</p>
            <p style={{fontSize:12.5,color:'var(--ink3)',margin:'0 0 22px',lineHeight:1.5,textAlign:'center'}}>{conflictos.length>0?<><strong style={{color:'var(--warn)'}}>{conflictos.length}</strong> quedará{conflictos.length===1?'':'n'} vacante{conflictos.length===1?'':'s'} por conflicto de horario.</>:'Los turnos con choque de horario se crearán sin asignar (vacantes).'}</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmando(false)} disabled={generando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'1.5px solid var(--line)',background:'none',color:'var(--ink2)',fontSize:15,fontWeight:700,cursor:generando?'not-allowed':'pointer',fontFamily:'inherit'}}>Cancelar</button>
              <button onClick={()=>onConfirm(fecha)} disabled={generando} style={{flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'var(--primary)',color:'#fff',fontSize:15,fontWeight:700,cursor:generando?'not-allowed':'pointer',opacity:generando?0.7:1,fontFamily:'inherit'}}>{generando?'Generando…':'Sí, generar'}</button>
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
  const servicioId=user?.servicioId;

  const[plantillas,setPlantillas]=useState([]);
  const[funcionarios,setFuncionarios]=useState([]);
  const[pisos,setPisos]=useState([]);
  const[tipos,setTipos]=useState([]);
  const[moldes,setMoldes]=useState([]);
  const[cargandoDatos,setCargandoDatos]=useState(true);
  const[cargandoMoldes,setCargandoMoldes]=useState(false);
  const[error,setError]=useState('');

  const tipoColor=useMemo(()=>makeTipoColor(tipos),[tipos]);

  const{instancias,inject,assign,unassign,removeInstancia,reset,loadMolde,toAsignaciones,daysIndex,maxSemanas}=usePlanificacionState({plantillas,funcionarios,pisos});

  const[planActualId,setPlanActualId]=useState(null);
  const[planNombre,setPlanNombre]=useState(null);
  const[injectOpen,setInjectOpen]=useState(false);
  const[moldesOpen,setMoldesOpen]=useState(false);
  const[generarOpen,setGenerarOpen]=useState(false);
  const[generando,setGenerando]=useState(false);
  const[assignInstance,setAssignInstance]=useState(null);
  const[detailDia,setDetailDia]=useState(null);
  const[toast,setToast]=useState('');

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
          getPisosPorServicio(servicioId),
          getFuncionariosSummary(servicioId),
        ]);
        if(!activo)return;
        setPlantillas(Array.isArray(pl)?pl:[]);
        setTipos(Array.isArray(ti)?ti:[]);
        setPisos(pi?.success?(Array.isArray(pi.data)?pi.data:[]):[]);
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

  const onInject=(dto)=>{ const created=inject(dto); setInjectOpen(false); if(created)flash(`${created.label} · ${created.nombrePlantilla}${created.nombrePiso?' · '+created.nombrePiso:''}`); };
  const onAssign=(id,idFunc)=>{ assign(id,idFunc); setAssignInstance(null); flash('Funcionario asignado'); };

  const onSave=async(nombre)=>{
    try{
      const payload={ nombre, asignaciones:toAsignaciones() };
      let guardado;
      if(planActualId){ guardado=await planificacionService.update(planActualId,payload); }
      else { guardado=await planificacionService.create({ idServicio:servicioId, ...payload }); }
      setPlanActualId(guardado?.idPlanificacion??planActualId);
      setPlanNombre(nombre);
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
      setMoldesOpen(false);
      flash(`Molde "${pl.nombre}" cargado`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al cargar el molde.'); }
  };

  const onDeleteMolde=async(pl)=>{
    try{
      await planificacionService.remove(pl.idPlanificacion);
      if(planActualId===pl.idPlanificacion){ setPlanActualId(null); setPlanNombre(null); }
      await cargarMoldes();
      flash(`Molde "${pl.nombre}" eliminado`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al eliminar el molde.'); }
  };

  const onGenerar=async(fecha)=>{
    if(!planActualId){ setGenerarOpen(false); flash('Guarda el molde antes de generar.'); return; }
    setGenerando(true);
    try{
      const res=await planificacionService.generar(planActualId,fecha);
      setGenerarOpen(false);
      const vac=res?.vacantesPorConflicto||0;
      flash(`${res?.generados||0} turnos generados${vac?` · ${vac} vacantes por conflicto`:''}`);
    }catch(e){ setError(e?.response?.data?.error||e.message||'Error al generar.'); }
    finally{ setGenerando(false); }
  };

  const openMoldes=()=>{ cargarMoldes(); setMoldesOpen(true); };
  const nuevoMolde=()=>{ reset(); setPlanActualId(null); setPlanNombre(null); flash('Molde nuevo'); };

  const dayEntradas=detailDia!=null?(daysIndex[detailDia]||[]):[];

  if(cargandoDatos){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface2)'}}>
        <TopHeader title="Planificación" dense leftSlot={<button onClick={onBack} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}/>
        <div style={{flex:1,display:'grid',placeItems:'center',color:'var(--ink3)',fontSize:13,fontWeight:600}}>Cargando datos del servicio…</div>
      </div>
    );
  }

  if(generarOpen){
    return <GenerarView instancias={instancias} daysIndex={daysIndex} maxSemanas={maxSemanas} tipoColor={tipoColor} generando={generando} planActualId={planActualId} onCancel={()=>setGenerarOpen(false)} onConfirm={onGenerar}/>;
  }

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface2)',animation:'sgtSlideLeft .3s ease',overflow:'hidden',position:'relative'}}>
      <TopHeader
        title="Planificación"
        subtitle={planNombre||'Molde de rotativas · por semanas'}
        dense
        leftSlot={<button onClick={onBack} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}
        rightSlot={
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button onClick={nuevoMolde} title="Molde nuevo" style={ghostBtnGB}><SGTIcon name="plus" size={16} color="var(--ink2)"/></button>
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

      <InyectarSheet open={injectOpen} onClose={()=>setInjectOpen(false)} onInject={onInject} plantillas={plantillas} pisos={pisos} tipoColor={tipoColor}/>
      <MoldesSheet open={moldesOpen} onClose={()=>setMoldesOpen(false)} onSave={onSave} onLoad={onLoad} onDelete={onDeleteMolde} instancias={instancias} moldes={moldes} loading={cargandoMoldes} nombreInicial={planNombre} planActualId={planActualId}/>
      <AsignarFuncionarioSheet open={!!assignInstance} onClose={()=>setAssignInstance(null)} instancia={assignInstance?instancias.find(i=>i.id===assignInstance.id):null} instancias={instancias} funcionarios={funcionarios} onAssign={onAssign} onUnassign={(id)=>{ unassign(id); flash('Asignación retirada'); }} onRemove={(id)=>{ removeInstancia(id); flash('Rotativa quitada'); }}/>
      <DetalleDiaSheet open={detailDia!=null} onClose={()=>setDetailDia(null)} diaIndex={detailDia} entradasDelDia={dayEntradas} tipoColor={tipoColor} onAssignInstance={(inst)=>{ setDetailDia(null); setTimeout(()=>setAssignInstance(inst),220); }}/>
    </div>
  );
}

export default function PlanificacionView({onBack}){
  return <PlanGuardarBase onBack={onBack}/>;
}
