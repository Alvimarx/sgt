import { useState, useMemo, useRef, useEffect, Fragment } from 'react';

/* ─── Paleta local ─────────────────────────────────────────────────────────── */
const SGT_PALETTE = {
  equipoA: { bg:'oklch(0.94 0.04 250)', ink:'oklch(0.35 0.08 250)', soft:'oklch(0.97 0.02 250)' },
  equipoB: { bg:'oklch(0.94 0.04 150)', ink:'oklch(0.35 0.08 150)', soft:'oklch(0.97 0.02 150)' },
  equipoC: { bg:'oklch(0.94 0.04 30)',  ink:'oklch(0.4 0.09 30)',   soft:'oklch(0.97 0.02 30)'  },
  equipoD: { bg:'oklch(0.94 0.04 85)',  ink:'oklch(0.38 0.08 85)',  soft:'oklch(0.97 0.02 85)'  },
  primary:'var(--primary)', primarySoft:'var(--primary-soft)',
  accent:'var(--accent)',   accentSoft:'var(--accent-soft)',
  warn:'var(--warn)',       warnSoft:'var(--warn-soft)',
  success:'var(--success)', successSoft:'var(--success-soft)',
  ink:'var(--ink)', ink2:'var(--ink2)', ink3:'var(--ink3)',
  line:'var(--line)', line2:'var(--line2)',
  surface:'var(--surface)', surface2:'var(--surface2)',
};

/* ─── Mock data ────────────────────────────────────────────────────────────── */
const FUNCIONARIOS = [
  { idFuncionario:1, nombre:'Ana',     apellidoPaterno:'García',   iniciales:'AG', rol:'JEFATURA'     },
  { idFuncionario:2, nombre:'Carlos',  apellidoPaterno:'López',    iniciales:'CL', rol:'URGENCIOLOGO' },
  { idFuncionario:3, nombre:'María',   apellidoPaterno:'Martínez', iniciales:'MM', rol:'URGENCIOLOGO' },
  { idFuncionario:4, nombre:'Roberto', apellidoPaterno:'Soto',     iniciales:'RS', rol:'MEDICO'       },
  { idFuncionario:5, nombre:'Lucía',   apellidoPaterno:'Herrera',  iniciales:'LH', rol:'URGENCIOLOGO' },
  { idFuncionario:6, nombre:'Diego',   apellidoPaterno:'Ríos',     iniciales:'DR', rol:'MEDICO'       },
  { idFuncionario:7, nombre:'Sofía',   apellidoPaterno:'Cárcamo',  iniciales:'SC', rol:'MEDICO'       },
  { idFuncionario:8, nombre:'Felipe',  apellidoPaterno:'Tapia',    iniciales:'FT', rol:'URGENCIOLOGO' },
];

const PLANTILLAS = [
  { idPlantilla:1, nombre:'Rotativa Mañana 4×3', semanas:4 },
  { idPlantilla:2, nombre:'Rotativa Noche 2×2',  semanas:2 },
  { idPlantilla:3, nombre:'Rotativa Tarde 3×4',  semanas:3 },
];

const PISOS = [
  { idPiso:1, nombre:'Urgencias',        codigo:'P1', sigla:'URG' },
  { idPiso:2, nombre:'Medicina Interna', codigo:'P2', sigla:'MED' },
  { idPiso:3, nombre:'Cirugía',          codigo:'P3', sigla:'CIR' },
  { idPiso:4, nombre:'UCI',              codigo:'P4', sigla:'UCI' },
  { idPiso:5, nombre:'Pediatría',        codigo:'P5', sigla:'PED' },
];

const TIPOS_TURNO = {
  'Mañana':{ hue:30,  icon:'sun',  short:'M', label:'Mañana', horaInicio:'08:00', horaFin:'16:00', horas:8  },
  'Tarde': { hue:320, icon:'sun',  short:'T', label:'Tarde',  horaInicio:'14:00', horaFin:'22:00', horas:8  },
  'Noche': { hue:250, icon:'moon', short:'N', label:'Noche',  horaInicio:'20:00', horaFin:'08:00', horas:12 },
};

function tipoColor(nombre) {
  const t = TIPOS_TURNO[nombre];
  const h = t ? t.hue : 200;
  return { bg:`oklch(0.94 0.045 ${h})`, soft:`oklch(0.97 0.025 ${h})`, ink:`oklch(0.36 0.10 ${h})`, bar:`oklch(0.62 0.13 ${h})` };
}

function generarTurnos() {
  const year=2026, month=5, diasEnMes=new Date(year,month,0).getDate();
  const result=[]; let id=1;
  const configs=[
    {fId:1,tipo:'Mañana',patron:[1,1,0,1,1,0,0]},
    {fId:2,tipo:'Noche', patron:[1,1,1,0,0,1,1,1,0,0]},
    {fId:3,tipo:'Tarde', patron:[1,0,1,0,0,1,0]},
    {fId:4,tipo:'Mañana',patron:[0,1,1,0,1,1,0]},
    {fId:5,tipo:'Noche', patron:[0,0,1,1,0,0,1,1,0,1]},
    {fId:6,tipo:'Mañana',patron:[1,0,0,1,1,0,1]},
    {fId:7,tipo:'Tarde', patron:[0,1,1,0,1,0,1]},
    {fId:8,tipo:'Noche', patron:[1,0,0,1,1,0,1,0,1,0]},
  ];
  configs.forEach(cfg => {
    const t=TIPOS_TURNO[cfg.tipo], f=FUNCIONARIOS.find(x=>x.idFuncionario===cfg.fId);
    for(let d=1;d<=diasEnMes;d++){
      if(cfg.patron[(d-1)%cfg.patron.length]){
        const dateStr=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        result.push({id:id++,nombre:cfg.tipo,diaInicioTurno:dateStr,horaInicio:t.horaInicio,horaFin:t.horaFin,idFuncionario:cfg.fId,nombreFuncionario:`${f.nombre} ${f.apellidoPaterno}`,iniciales:f.iniciales,rol:f.rol});
      }
    }
  });
  return result;
}

const TURNOS = generarTurnos();

const PLAN_DATA = { PALETTE:SGT_PALETTE, FUNCIONARIOS, PLANTILLAS, PISOS, TIPOS_TURNO, TURNOS, tipoColor };

/* ─── Helpers de fecha ─────────────────────────────────────────────────────── */
const MONTHS_LONG=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEK_DAYS_LBL=['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

function parseLocalDate(str){
  if(!str)return null;
  const[y,m,d]=String(str).split('-').map(Number);
  return new Date(y,m-1,d);
}
function toDateStr(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function buildWeeks(startDateStr,numWeeks){
  const start=parseLocalDate(startDateStr);
  const jsDay=start.getDay(), toMon=jsDay===0?6:jsDay-1;
  const monday=new Date(start);
  monday.setDate(start.getDate()-toMon);
  return Array.from({length:numWeeks},(_,w)=>
    Array.from({length:7},(__,d)=>{ const dt=new Date(monday); dt.setDate(monday.getDate()+w*7+d); return dt; })
  );
}
function buildMonthGrid(seedDateStr){
  const seed=parseLocalDate(seedDateStr);
  const year=seed.getFullYear(), month=seed.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  const jsDay=first.getDay(), offset=jsDay===0?6:jsDay-1;
  const start=new Date(year,month,1-offset);
  const totalCells=Math.ceil((offset+last.getDate())/7)*7;
  const weeks=[];
  for(let w=0;w<totalCells/7;w++){
    const row=[];
    for(let d=0;d<7;d++){
      const dt=new Date(start); dt.setDate(start.getDate()+w*7+d);
      row.push({date:dt, inMonth:dt.getMonth()===month});
    }
    weeks.push(row);
  }
  return{weeks,year,month};
}

const H = { MONTHS_LONG, MONTHS_SHORT, WEEK_DAYS_LBL, parseLocalDate, toDateStr, buildWeeks, buildMonthGrid };

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
    case 'sun':           return <svg {...c}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>;
    case 'moon':          return <svg {...c}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'plus':          return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check':         return <svg {...c}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'check-circle':  return <svg {...c}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
    case 'alert':         return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
    case 'calendar':      return <svg {...c}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case 'search':        return <svg {...c}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
    case 'arrow-right':   return <svg {...c}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case 'sliders':       return <svg {...c}><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>;
    case 'more':          return <svg {...c}><circle cx="12" cy="12" r="1" fill={color}/><circle cx="19" cy="12" r="1" fill={color}/><circle cx="5" cy="12" r="1" fill={color}/></svg>;
    default: return null;
  }
}

/* ─── SGTBadge ─────────────────────────────────────────────────────────────── */
function SGTBadge({children,tone='neutral',size='sm',style={}}){
  const tones={neutral:{bg:'var(--line2)',ink:'var(--ink2)'},primary:{bg:'var(--primary-soft)',ink:'var(--primary)'},accent:{bg:'var(--accent-soft)',ink:'#B85A60'},warn:{bg:'var(--warn-soft)',ink:'var(--warn)'},success:{bg:'var(--success-soft)',ink:'var(--success)'}};
  const t=tones[tone]||tones.neutral;
  const sz=size==='xs'?{fs:10,pad:'2px 6px'}:{fs:11,pad:'3px 8px'};
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,background:t.bg,color:t.ink,padding:sz.pad,borderRadius:999,fontSize:sz.fs,fontWeight:700,letterSpacing:0.2,textTransform:'uppercase',whiteSpace:'nowrap',...style}}>{children}</span>;
}

/* ─── SGTAvatar ────────────────────────────────────────────────────────────── */
function SGTAvatar({person,size=28,style={},ring=null}){
  const role=person.rol;
  const bg=role==='JEFATURA'?'#E9D9C2':role==='URGENCIOLOGO'?'#D5E3EE':'#E8E2EE';
  const ink=role==='JEFATURA'?'#6E4E1F':role==='URGENCIOLOGO'?'#2B4E6B':'#4E3A6F';
  return <div style={{width:size,height:size,borderRadius:999,background:bg,color:ink,display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*0.38,letterSpacing:0.3,flexShrink:0,boxShadow:ring?`0 0 0 2px ${ring}`:'none',...style}}>{person.iniciales}</div>;
}

/* ─── TopHeader ────────────────────────────────────────────────────────────── */
function TopHeader({title,subtitle,rightSlot,leftSlot,dense}){
  return(
    <div style={{padding:dense?'14px 16px 10px':'16px 18px 12px',background:'#fff',borderBottom:'1px solid var(--line2)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
      {leftSlot}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:19,fontWeight:800,color:'var(--ink)',lineHeight:1.15,letterSpacing:-0.2}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:'var(--ink3)',marginTop:2,fontWeight:600}}>{subtitle}</div>}
      </div>
      {rightSlot}
    </div>
  );
}

/* ─── Sheet (bottom sheet, position fixed) ────────────────────────────────── */
function Sheet({open,onClose,children,title,maxHeight='85%'}){
  if(!open)return null;
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.35)',backdropFilter:'blur(2px)',animation:'sgtFade .2s ease'}}/>
      <div style={{position:'relative',background:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight,width:'100%',maxWidth:480,display:'flex',flexDirection:'column',boxShadow:'0 -12px 40px rgba(15,23,42,0.16)',animation:'sgtSlideUp .28s cubic-bezier(.2,.9,.2,1)'}}>
        <div style={{display:'flex',justifyContent:'center',paddingTop:10}}>
          <div style={{width:40,height:4,background:'var(--line)',borderRadius:99}}/>
        </div>
        {title&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px 8px'}}>
            <div style={{fontSize:17,fontWeight:800,color:'var(--ink)'}}>{title}</div>
            <button onClick={onClose} style={{background:'var(--line2)',border:'none',borderRadius:999,width:30,height:30,display:'grid',placeItems:'center',cursor:'pointer'}}>
              <SGTIcon name="close" size={16} color="var(--ink2)"/>
            </button>
          </div>
        )}
        <div style={{overflow:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  );
}

/* ─── AsignarModal (dentro de sheet) ─────────────────────────────────────── */
function AsignarModal({open,onClose,onConfirm,startDate}){
  if(!open)return null;
  const[idFuncionario,setIdFuncionario]=useState('');
  const[idPlantilla,setIdPlantilla]=useState('');
  const[err,setErr]=useState('');

  const selectedPlantilla=PLANTILLAS.find(p=>String(p.idPlantilla)===idPlantilla);
  const fechaFin=useMemo(()=>{
    if(!selectedPlantilla||!startDate)return'';
    const d=parseLocalDate(startDate);
    d.setDate(d.getDate()+selectedPlantilla.semanas*7-1);
    return toDateStr(d);
  },[selectedPlantilla,startDate]);

  const handleSave=()=>{
    if(!idFuncionario)return setErr('Selecciona un funcionario.');
    if(!idPlantilla)return setErr('Selecciona una rotativa.');
    setErr('');
    const f=FUNCIONARIOS.find(x=>String(x.idFuncionario)===String(idFuncionario));
    onConfirm({idFuncionario:Number(idFuncionario),idPlantilla:Number(idPlantilla),fechaInicio:startDate,fechaFin,nombreFuncionario:f?`${f.nombre} ${f.apellidoPaterno}`:'',nombrePlantilla:selectedPlantilla?.nombre??''});
    setIdFuncionario(''); setIdPlantilla('');
  };

  const sel={padding:'11px 12px',borderRadius:10,border:'1px solid var(--line)',fontSize:13.5,color:'var(--ink)',background:'#fff',width:'100%',outline:'none',fontFamily:'inherit',appearance:'none',WebkitAppearance:'none'};
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title="Asignar rotativa" maxHeight="92%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Funcionario</span>
          <select value={idFuncionario} onChange={e=>setIdFuncionario(e.target.value)} style={sel}>
            <option value="">Seleccionar funcionario…</option>
            {FUNCIONARIOS.map(f=><option key={f.idFuncionario} value={f.idFuncionario}>{f.nombre} {f.apellidoPaterno} · {f.rol}</option>)}
          </select>
        </div>
        <div>
          <span style={lbl}>Rotativa</span>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PLANTILLAS.map(p=>{
              const selected=String(p.idPlantilla)===idPlantilla;
              return(
                <button key={p.idPlantilla} onClick={()=>setIdPlantilla(String(p.idPlantilla))} style={{textAlign:'left',cursor:'pointer',background:selected?'var(--primary-soft)':'#fff',border:`1.5px solid ${selected?'var(--primary)':'var(--line)'}`,borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:18,height:18,borderRadius:99,border:`2px solid ${selected?'var(--primary)':'var(--line)'}`,background:selected?'var(--primary)':'transparent',display:'grid',placeItems:'center',flexShrink:0}}>
                    {selected&&<div style={{width:6,height:6,background:'#fff',borderRadius:99}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{p.nombre}</div>
                    <div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600}}>{p.semanas} semanas · patrón cíclico</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{background:'var(--surface2)',borderRadius:12,padding:'12px 14px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:10,textTransform:'uppercase',letterSpacing:0.4}}>Período</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{flex:1,background:'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid var(--line)'}}>
              <div style={{fontSize:10,color:'var(--ink3)',fontWeight:700,marginBottom:2,textTransform:'uppercase',letterSpacing:0.3}}>Inicio</div>
              <div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{startDate}</div>
            </div>
            <SGTIcon name="arrow-right" size={14} color="var(--ink3)"/>
            <div style={{flex:1,background:'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid var(--line)'}}>
              <div style={{fontSize:10,color:'var(--ink3)',fontWeight:700,marginBottom:2,textTransform:'uppercase',letterSpacing:0.3}}>Fin</div>
              <div style={{fontSize:13.5,fontWeight:800,color:selectedPlantilla?'var(--ink)':'var(--ink3)'}}>{fechaFin||'—'}</div>
            </div>
          </div>
        </div>
        <button onClick={handleSave} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer'}}>
          <SGTIcon name="check" size={16} color="#fff"/> Confirmar asignación
        </button>
      </div>
    </Sheet>
  );
}

/* ─── Patrones rotativos ──────────────────────────────────────────────────── */
const PATRONES = {
  'Rotativa Mañana 4×3':{ tipo:'Mañana', pattern:[1,1,1,1,0,0,0] },
  'Rotativa Noche 2×2': { tipo:'Noche',  pattern:[1,1,0,0]       },
  'Rotativa Tarde 3×4': { tipo:'Tarde',  pattern:[1,1,1,0,0,0,0] },
};

function patternDays(plantillaNombre, fechaInicioStr){
  const conf=PATRONES[plantillaNombre];
  if(!conf)return{tipo:'Mañana',dias:[]};
  const semanas=PLANTILLAS.find(p=>p.nombre===plantillaNombre)?.semanas||2;
  const total=semanas*7, start=parseLocalDate(fechaInicioStr), dias=[];
  for(let i=0;i<total;i++){
    if(conf.pattern[i%conf.pattern.length]){
      const d=new Date(start); d.setDate(start.getDate()+i); dias.push(toDateStr(d));
    }
  }
  return{tipo:conf.tipo,dias};
}

function seedInstancias(){
  const make=(id,plantillaNombre,fechaInicio,funcionarioId,idPiso)=>{
    const plantilla=PLANTILLAS.find(p=>p.nombre===plantillaNombre);
    const{tipo,dias}=patternDays(plantillaNombre,fechaInicio);
    const f=funcionarioId?FUNCIONARIOS.find(x=>x.idFuncionario===funcionarioId):null;
    const piso=idPiso?PISOS.find(p=>p.idPiso===idPiso):null;
    return{id,label:id.toUpperCase().replace('INST-','R'),idPlantilla:plantilla.idPlantilla,nombrePlantilla:plantillaNombre,semanas:plantilla.semanas,tipo,fechaInicio,fechaFin:dias[dias.length-1]||fechaInicio,dias,idFuncionario:f?.idFuncionario||null,nombreFuncionario:f?`${f.nombre} ${f.apellidoPaterno}`:null,iniciales:f?.iniciales||null,rol:f?.rol||null,idPiso:piso?.idPiso||null,nombrePiso:piso?.nombre||null,codigoPiso:piso?.codigo||null};
  };
  return[
    make('inst-1','Rotativa Mañana 4×3','2026-05-04',1,4),
    make('inst-2','Rotativa Tarde 3×4', '2026-05-04',null,1),
    make('inst-3','Rotativa Mañana 4×3','2026-05-11',null,2),
    make('inst-4','Rotativa Noche 2×2', '2026-05-06',5,4),
  ];
}

function seedSavedPlans(){
  const snap=(defs)=>defs.map(([id,plantilla,fecha,fId,piso])=>{
    const{tipo,dias}=patternDays(plantilla,fecha);
    const p=PLANTILLAS.find(x=>x.nombre===plantilla);
    const f=fId?FUNCIONARIOS.find(x=>x.idFuncionario===fId):null;
    const pi=piso?PISOS.find(x=>x.idPiso===piso):null;
    return{id,label:id.toUpperCase().replace('INST-','R'),idPlantilla:p.idPlantilla,nombrePlantilla:plantilla,semanas:p.semanas,tipo,fechaInicio:fecha,fechaFin:dias[dias.length-1]||fecha,dias,idFuncionario:f?.idFuncionario||null,nombreFuncionario:f?`${f.nombre} ${f.apellidoPaterno}`:null,iniciales:f?.iniciales||null,rol:f?.rol||null,idPiso:pi?.idPiso||null,nombrePiso:pi?.nombre||null,codigoPiso:pi?.codigo||null};
  });
  return[
    {id:'tpl-uci-base',nombre:'UCI · Mes base',fecha:'2026-04-28T10:00:00Z',snapshot:snap([['inst-1','Rotativa Mañana 4×3','2026-05-04',1,4],['inst-2','Rotativa Noche 2×2','2026-05-04',5,4],['inst-3','Rotativa Tarde 3×4','2026-05-06',3,4]])},
    {id:'tpl-urgencias',nombre:'Urgencias · Cobertura mínima',fecha:'2026-04-22T16:30:00Z',snapshot:snap([['inst-1','Rotativa Mañana 4×3','2026-05-04',2,1],['inst-2','Rotativa Tarde 3×4','2026-05-04',null,1]])},
  ].map(pl=>({...pl,totales:pl.snapshot.length,asignadas:pl.snapshot.filter(i=>i.idFuncionario).length}));
}

/* ─── Estado de planificación ────────────────────────────────────────────── */
function usePlanificacionState(){
  const[instancias,setInstancias]=useState(()=>seedInstancias());
  const[savedPlans,setSavedPlans]=useState(()=>seedSavedPlans());
  const counter=useRef(instancias.length);

  const inject=({idPlantilla,fechaInicio,idPiso})=>{
    const plantilla=PLANTILLAS.find(p=>p.idPlantilla===Number(idPlantilla));
    if(!plantilla)return null;
    const{tipo,dias}=patternDays(plantilla.nombre,fechaInicio);
    const piso=idPiso?PISOS.find(p=>p.idPiso===Number(idPiso)):null;
    counter.current+=1;
    const n=counter.current;
    const nueva={id:`inst-${n}`,label:`R${n}`,idPlantilla:plantilla.idPlantilla,nombrePlantilla:plantilla.nombre,semanas:plantilla.semanas,tipo,fechaInicio,fechaFin:dias[dias.length-1]||fechaInicio,dias,idFuncionario:null,nombreFuncionario:null,iniciales:null,rol:null,idPiso:piso?.idPiso||null,nombrePiso:piso?.nombre||null,codigoPiso:piso?.codigo||null};
    setInstancias(prev=>[...prev,nueva]);
    return nueva;
  };

  const assign=(instanceId,idFuncionario)=>{
    const f=FUNCIONARIOS.find(x=>x.idFuncionario===Number(idFuncionario));
    if(!f)return;
    setInstancias(prev=>prev.map(i=>i.id===instanceId?{...i,idFuncionario:f.idFuncionario,nombreFuncionario:`${f.nombre} ${f.apellidoPaterno}`,iniciales:f.iniciales,rol:f.rol}:i));
  };

  const unassign=(instanceId)=>{
    setInstancias(prev=>prev.map(i=>i.id===instanceId?{...i,idFuncionario:null,nombreFuncionario:null,iniciales:null,rol:null}:i));
  };

  const daysIndex=useMemo(()=>{
    const m={};
    instancias.forEach(inst=>{ inst.dias.forEach(d=>{ (m[d]??=[]).push(inst); }); });
    return m;
  },[instancias]);

  const savePlan=(nombre)=>{
    const entry={id:`plan-${Date.now()}`,nombre:nombre.trim(),fecha:new Date().toISOString(),totales:instancias.length,asignadas:instancias.filter(i=>i.idFuncionario).length,snapshot:instancias.map(i=>({...i}))};
    setSavedPlans(prev=>[entry,...prev]);
    return entry;
  };

  const loadPlan=(planId)=>{
    const pl=savedPlans.find(p=>p.id===planId);
    if(!pl)return null;
    const restored=pl.snapshot.map(i=>({...i}));
    setInstancias(restored);
    const maxN=restored.reduce((mx,i)=>{ const n=parseInt(String(i.id).replace('inst-',''),10); return Number.isFinite(n)?Math.max(mx,n):mx; },0);
    counter.current=maxN;
    return pl;
  };

  return{instancias,inject,assign,unassign,daysIndex,getInstance:(id)=>instancias.find(i=>i.id===id),savePlan,loadPlan,savedPlans};
}

/* ─── InyectarSheet ──────────────────────────────────────────────────────── */
function InyectarSheet({open,onClose,onInject,defaultDate}){
  if(!open)return null;
  const[idPlantilla,setIdPlantilla]=useState('');
  const[fechaInicio,setFechaInicio]=useState(defaultDate||'2026-05-04');
  const[err,setErr]=useState('');
  useEffect(()=>{ setFechaInicio(defaultDate||'2026-05-04'); },[defaultDate,open]);

  const selectedP=PLANTILLAS.find(p=>String(p.idPlantilla)===idPlantilla);
  const fechaFin=useMemo(()=>{ if(!selectedP||!fechaInicio)return''; const d=parseLocalDate(fechaInicio); d.setDate(d.getDate()+selectedP.semanas*7-1); return toDateStr(d); },[selectedP,fechaInicio]);

  const handle=()=>{ if(!idPlantilla)return setErr('Selecciona una rotativa.'); setErr(''); onInject({idPlantilla:Number(idPlantilla),fechaInicio}); setIdPlantilla(''); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title="Inyectar rotativa" maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>La rotativa quedará <strong style={{color:'var(--ink)'}}>pendiente de asignación</strong> hasta que le asignes un funcionario.</div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Rotativa</span>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PLANTILLAS.map(p=>{ const conf=PATRONES[p.nombre]; const c=tipoColor(conf?.tipo||'Mañana'); const selected=String(p.idPlantilla)===idPlantilla; return(
              <button key={p.idPlantilla} onClick={()=>setIdPlantilla(String(p.idPlantilla))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?c.soft:'#fff',border:`1.5px solid ${selected?c.bar:'var(--line)'}`,borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:c.bar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={TIPOS_TURNO[conf?.tipo]?.icon||'sun'} size={18} color="#fff"/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{p.nombre}</div><div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,marginTop:1}}>{p.semanas} semanas · turno {conf?.tipo}</div></div>
                <div style={{width:18,height:18,borderRadius:99,border:`2px solid ${selected?c.bar:'var(--line)'}`,background:selected?c.bar:'transparent',display:'grid',placeItems:'center',flexShrink:0}}>{selected&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</div>
              </button>
            );})}
          </div>
        </div>
        <div>
          <span style={lbl}>Fecha de inicio</span>
          <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1px solid var(--line)',fontSize:13.5,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none'}}/>
        </div>
        <div style={{background:'var(--surface2)',borderRadius:12,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.4}}>Termina</div><div style={{fontSize:13,fontWeight:800,color:selectedP?'var(--ink)':'var(--ink3)'}}>{fechaFin||'—'}</div></div>
          <SGTBadge tone="neutral">Pendiente</SGTBadge>
        </div>
        <button onClick={handle} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="plus" size={16} color="#fff"/> Inyectar al calendario
        </button>
      </div>
    </Sheet>
  );
}

/* ─── AsignarFuncionarioSheet ────────────────────────────────────────────── */
function AsignarFuncionarioSheet({open,onClose,onAssign,instancia,onUnassign}){
  if(!open||!instancia)return null;
  const[idFuncionario,setIdFuncionario]=useState(instancia.idFuncionario?String(instancia.idFuncionario):'');
  const[err,setErr]=useState('');
  const c=tipoColor(instancia.tipo);
  const cfg=TIPOS_TURNO[instancia.tipo];

  useEffect(()=>{ setIdFuncionario(instancia.idFuncionario?String(instancia.idFuncionario):''); setErr(''); },[instancia]);

  const handle=()=>{ if(!idFuncionario)return setErr('Selecciona un funcionario.'); setErr(''); onAssign(instancia.id,Number(idFuncionario)); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title={`Asignar a ${instancia.label}`} maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:c.soft,border:`1px solid ${c.bg}`,borderRadius:14,padding:14,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:c.bar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={cfg.icon} size={20} color="#fff"/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:10.5,fontWeight:900,color:'#fff',background:c.bar,padding:'2px 7px',borderRadius:99,letterSpacing:0.3}}>{instancia.label}</span><span style={{fontSize:13,fontWeight:800,color:c.ink}}>{instancia.nombrePlantilla}</span></div>
            <div style={{fontSize:11.5,color:c.ink,opacity:0.8,fontWeight:600}}>{instancia.fechaInicio} – {instancia.fechaFin} · {instancia.dias.length} turnos · {cfg.horaInicio}–{cfg.horaFin}</div>
          </div>
        </div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Funcionario</span>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflow:'auto'}}>
            {FUNCIONARIOS.map(f=>{ const selected=String(f.idFuncionario)===idFuncionario; return(
              <button key={f.idFuncionario} onClick={()=>setIdFuncionario(String(f.idFuncionario))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?'var(--primary-soft)':'#fff',border:`1.5px solid ${selected?'var(--primary)':'var(--line)'}`,borderRadius:10,padding:'8px 10px',display:'flex',alignItems:'center',gap:10}}>
                <SGTAvatar person={f} size={32}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:'var(--ink)'}}>{f.nombre} {f.apellidoPaterno}</div><div style={{fontSize:10.5,color:'var(--ink3)',fontWeight:700,textTransform:'uppercase',letterSpacing:0.3,marginTop:1}}>{f.rol}</div></div>
                {selected&&<SGTIcon name="check-circle" size={18} color="var(--primary)"/>}
              </button>
            );})}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {instancia.idFuncionario&&onUnassign&&<button onClick={()=>{ onUnassign(instancia.id); onClose(); }} style={{padding:'13px 14px',borderRadius:12,background:'#fff',color:'var(--accent)',border:'1.5px solid var(--accent)',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Quitar</button>}
          <button onClick={handle} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:13,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
            <SGTIcon name="check" size={16} color="#fff"/> {instancia.idFuncionario?'Reasignar':'Asignar'} a {instancia.label}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ─── Cobertura ──────────────────────────────────────────────────────────── */
const COBERTURA_MINIMA={'Mañana':2,'Tarde':2,'Noche':1};

function buildDayCoverage(instanciasDelDia){
  const byTipo={};
  ['Mañana','Tarde','Noche'].forEach(tipo=>{ byTipo[tipo]={asignadas:[],pendientes:[]}; });
  instanciasDelDia.forEach(inst=>{ if(!byTipo[inst.tipo])byTipo[inst.tipo]={asignadas:[],pendientes:[]}; if(inst.idFuncionario)byTipo[inst.tipo].asignadas.push(inst); else byTipo[inst.tipo].pendientes.push(inst); });
  Object.keys(byTipo).forEach(tipo=>{ const grp=byTipo[tipo],obj=COBERTURA_MINIMA[tipo]||1; grp.objetivo=obj; grp.total=grp.asignadas.length+grp.pendientes.length; grp.deficit=Math.max(0,obj-grp.total); grp.faltaAsignar=Math.max(0,obj-grp.asignadas.length); grp.coberturaPct=Math.min(100,Math.round((grp.asignadas.length/obj)*100)); });
  return byTipo;
}

function buildDayCoverageAggregate(dayCoverage){
  let asignadas=0,total=0,objetivo=0;
  Object.values(dayCoverage).forEach(g=>{ asignadas+=g.asignadas.length; total+=g.total; objetivo+=g.objetivo; });
  return{asignadas,total,objetivo,coberturaPct:objetivo?Math.min(100,Math.round((asignadas/objetivo)*100)):0,faltaAsignar:Math.max(0,objetivo-asignadas)};
}

/* ─── KPIBar ─────────────────────────────────────────────────────────────── */
function KPIBar({instancias,dense=false}){
  const pend=instancias.filter(i=>!i.idFuncionario).length;
  const asgn=instancias.length-pend;
  const pad=dense?'7px 9px':'9px 11px';
  const item=(bgVar,iconColor,iconName,n,label)=>(
    <div style={{flex:1,background:'var(--surface2)',borderRadius:10,padding:pad,display:'flex',alignItems:'center',gap:8}}>
      <div style={{width:26,height:26,borderRadius:8,background:bgVar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={iconName} size={14} color={iconColor}/></div>
      <div style={{minWidth:0}}><div style={{fontSize:15,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div><div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:2}}>{label}</div></div>
    </div>
  );
  return(
    <div style={{display:'flex',gap:6}}>
      {item('var(--primary-soft)','var(--primary)','calendar',instancias.length,'Total')}
      {item('var(--warn-soft)','var(--warn)','clock',pend,'Pendientes')}
      {item('var(--success-soft)','var(--success)','check-circle',asgn,'Asignadas')}
    </div>
  );
}

/* ─── PisoTag ────────────────────────────────────────────────────────────── */
function PisoTag({inst,variant,size='sm'}){
  if(!inst||!inst.nombrePiso)return null;
  const fs=size==='xs'?9.5:10.5;
  if(variant==='b')return <span style={{fontSize:fs,fontWeight:800,color:'var(--ink3)'}}>{' · '}<span style={{color:'var(--primary)'}}>{inst.nombrePiso}</span></span>;
  const strong=variant==='c';
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:fs,fontWeight:900,letterSpacing:0.2,padding:strong?'2px 8px':'1px 6px',borderRadius:99,background:strong?'var(--primary)':'var(--primary-soft)',color:strong?'#fff':'var(--primary)',whiteSpace:'nowrap'}}><SGTIcon name="home" size={fs-1} color={strong?'#fff':'var(--primary)'}/>{inst.codigoPiso?`${inst.codigoPiso} · `:''}{inst.nombrePiso}</span>;
}

/* ─── PisoSelector (chips) ───────────────────────────────────────────────── */
function PisoSelector({value,onChange}){
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  return(
    <div>
      <span style={lbl}>Asociar a piso / unidad</span>
      <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
        {PISOS.map(p=>{ const sel=String(p.idPiso)===String(value); return(
          <button key={p.idPiso} onClick={()=>onChange(String(p.idPiso))} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 13px',borderRadius:99,cursor:'pointer',fontFamily:'inherit',background:sel?'var(--primary)':'#fff',border:`1.5px solid ${sel?'var(--primary)':'var(--line)'}`,color:sel?'#fff':'var(--ink)',fontSize:13,fontWeight:800}}>
            <SGTIcon name="home" size={13} color={sel?'#fff':'var(--ink3)'}/>{p.nombre}
          </button>
        );})}
      </div>
    </div>
  );
}

/* ─── InyectarConPisoSheet ───────────────────────────────────────────────── */
function InyectarConPisoSheet({open,onClose,onInject,defaultDate}){
  const[idPlantilla,setIdPlantilla]=useState('');
  const[idPiso,setIdPiso]=useState('');
  const[fechaInicio,setFechaInicio]=useState(defaultDate||'2026-05-04');
  const[err,setErr]=useState('');
  useEffect(()=>{ setFechaInicio(defaultDate||'2026-05-04'); },[defaultDate,open]);

  const selectedP=PLANTILLAS.find(p=>String(p.idPlantilla)===idPlantilla);
  const fechaFin=useMemo(()=>{ if(!selectedP||!fechaInicio)return''; const d=parseLocalDate(fechaInicio); d.setDate(d.getDate()+selectedP.semanas*7-1); return toDateStr(d); },[selectedP,fechaInicio]);

  if(!open)return null;

  const handle=()=>{ if(!idPlantilla)return setErr('Selecciona una rotativa.'); if(!idPiso)return setErr('Selecciona el piso.'); setErr(''); onInject({idPlantilla:Number(idPlantilla),fechaInicio,idPiso:Number(idPiso)}); setIdPlantilla(''); setIdPiso(''); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};

  return(
    <Sheet open={open} onClose={onClose} title="Inyectar rotativa" maxHeight="90%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>La rotativa quedará <strong style={{color:'var(--ink)'}}>pendiente de asignación</strong> y asociada al piso que elijas.</div>
        {err&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        <div>
          <span style={lbl}>Rotativa</span>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PLANTILLAS.map(p=>{ const conf=PATRONES[p.nombre]; const c=tipoColor(conf?.tipo||'Mañana'); const selected=String(p.idPlantilla)===idPlantilla; return(
              <button key={p.idPlantilla} onClick={()=>setIdPlantilla(String(p.idPlantilla))} style={{textAlign:'left',cursor:'pointer',fontFamily:'inherit',background:selected?c.soft:'#fff',border:`1.5px solid ${selected?c.bar:'var(--line)'}`,borderRadius:12,padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:c.bar,display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={TIPOS_TURNO[conf?.tipo]?.icon||'sun'} size={18} color="#fff"/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)'}}>{p.nombre}</div><div style={{fontSize:11.5,color:'var(--ink3)',fontWeight:600,marginTop:1}}>{p.semanas} semanas · turno {conf?.tipo}</div></div>
                <div style={{width:18,height:18,borderRadius:99,border:`2px solid ${selected?c.bar:'var(--line)'}`,background:selected?c.bar:'transparent',display:'grid',placeItems:'center',flexShrink:0}}>{selected&&<SGTIcon name="check" size={10} color="#fff" strokeWidth={3.5}/>}</div>
              </button>
            );})}
          </div>
        </div>
        <PisoSelector value={idPiso} onChange={setIdPiso}/>
        <div>
          <span style={lbl}>Fecha de inicio</span>
          <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1px solid var(--line)',fontSize:13.5,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none'}}/>
        </div>
        <div style={{background:'var(--surface2)',borderRadius:12,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.4}}>Termina</div><div style={{fontSize:13,fontWeight:800,color:selectedP?'var(--ink)':'var(--ink3)'}}>{fechaFin||'—'}</div></div>
          <SGTBadge tone="neutral">Pendiente</SGTBadge>
        </div>
        <button onClick={handle} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="plus" size={16} color="#fff"/> Inyectar al calendario
        </button>
      </div>
    </Sheet>
  );
}

/* ─── CargarGuardarPlantillaSheet ────────────────────────────────────────── */
function CargarGuardarPlantillaSheet({open,onClose,onSave,onLoad,instancias,savedPlans}){
  const[tab,setTab]=useState('guardar');
  const[nombre,setNombre]=useState('Planificación Mayo 2026');
  const[err,setErr]=useState('');
  useEffect(()=>{ if(open){ setTab('guardar'); setNombre('Planificación Mayo 2026'); setErr(''); } },[open]);

  if(!open)return null;

  const asignadas=instancias.filter(i=>i.idFuncionario).length;
  const pend=instancias.length-asignadas;

  const handleSave=()=>{ if(!nombre.trim())return setErr('Ponle un nombre a la plantilla.'); setErr(''); onSave(nombre.trim()); };
  const lbl={fontSize:11,fontWeight:800,color:'var(--ink3)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:0.4};
  const tabBtn=(key,icon,label)=>{ const active=tab===key; return <button onClick={()=>setTab(key)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 8px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',background:active?'#fff':'transparent',border:'none',color:active?'var(--primary)':'var(--ink3)',fontSize:13,fontWeight:800,boxShadow:active?'0 1px 3px rgba(15,23,42,0.10)':'none'}}><SGTIcon name={icon} size={15} color={active?'var(--primary)':'var(--ink3)'}/>{label}</button>; };

  return(
    <Sheet open={open} onClose={onClose} title="Plantillas de planificación" maxHeight="86%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',gap:4,background:'var(--surface2)',borderRadius:12,padding:4}}>
          {tabBtn('guardar','check-circle','Guardar')}
          {tabBtn('cargar','calendar',`Cargar${savedPlans.length?` (${savedPlans.length})`:''}`)}
        </div>
        {err&&tab==='guardar'&&<div style={{display:'flex',alignItems:'center',gap:6,background:'var(--warn-soft)',color:'var(--warn)',borderRadius:10,padding:'10px 12px',fontSize:12.5,fontWeight:700}}><SGTIcon name="alert" size={14}/>{err}</div>}
        {tab==='guardar'?(
          <Fragment>
            <div style={{display:'flex',gap:8}}>
              {[['calendar','var(--primary)','var(--primary-soft)',instancias.length,'Rotativas'],['check-circle','var(--success)','var(--success-soft)',asignadas,'Asignadas'],['clock','var(--warn)','var(--warn-soft)',pend,'Pendientes']].map(([icon,ink,bg,n,label])=>(
                <div key={label} style={{flex:1,background:'var(--surface2)',borderRadius:12,padding:'11px 10px',textAlign:'center'}}>
                  <div style={{width:28,height:28,borderRadius:8,background:bg,display:'grid',placeItems:'center',margin:'0 auto 6px'}}><SGTIcon name={icon} size={15} color={ink}/></div>
                  <div style={{fontSize:17,fontWeight:900,color:'var(--ink)',lineHeight:1}}>{n}</div>
                  <div style={{fontSize:9.5,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <div><span style={lbl}>Nombre de la plantilla</span><input value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus placeholder="Ej. UCI · Mayo 2026" style={{width:'100%',padding:'12px 13px',borderRadius:10,border:'1.5px solid var(--line)',fontSize:14,fontWeight:700,color:'var(--ink)',background:'#fff',fontFamily:'inherit',outline:'none'}}/></div>
            <button onClick={handleSave} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}><SGTIcon name="check" size={16} color="#fff"/> Guardar plantilla</button>
          </Fragment>
        ):(
          <Fragment>
            <div style={{fontSize:12.5,color:'var(--ink3)',fontWeight:600,lineHeight:1.4}}>Carga una plantilla guardada. Reemplazará las rotativas actuales.</div>
            {savedPlans.length===0?(
              <div style={{padding:22,background:'var(--surface2)',borderRadius:12,border:'1px dashed var(--line)',textAlign:'center',fontSize:12.5,color:'var(--ink3)',fontWeight:600}}>No hay plantillas guardadas todavía.</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {savedPlans.map(pl=>(
                  <button key={pl.id} onClick={()=>onLoad(pl.id)} style={{display:'flex',alignItems:'center',gap:11,textAlign:'left',padding:'11px 13px',background:'#fff',borderRadius:12,border:'1.5px solid var(--line)',cursor:'pointer',fontFamily:'inherit'}}>
                    <div style={{width:38,height:38,borderRadius:11,background:'var(--primary-soft)',display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="calendar" size={18} color="var(--primary)"/></div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pl.nombre}</div><div style={{fontSize:11,fontWeight:700,color:'var(--ink3)',marginTop:2}}>{pl.totales} rotativas · {pl.asignadas} asignadas</div></div>
                    <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11.5,fontWeight:800,color:'var(--primary)',background:'var(--primary-soft)',padding:'6px 10px',borderRadius:99,flexShrink:0}}>Cargar <SGTIcon name="arrow-right" size={13} color="var(--primary)"/></span>
                  </button>
                ))}
              </div>
            )}
          </Fragment>
        )}
      </div>
    </Sheet>
  );
}

/* ─── DetalleDiaConPisoSheet ─────────────────────────────────────────────── */
function DetalleDiaConPisoSheet({open,onClose,dateStr,instanciasDelDia,onAssignInstance}){
  if(!open||!dateStr)return null;
  const coverage=useMemo(()=>buildDayCoverage(instanciasDelDia),[instanciasDelDia]);
  const agg=buildDayCoverageAggregate(coverage);
  const d=parseLocalDate(dateStr);
  const dayName=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];
  const title=`${dayName} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;

  return(
    <Sheet open={open} onClose={onClose} title={title} maxHeight="88%">
      <div style={{padding:'4px 18px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:agg.faltaAsignar>0?'var(--warn-soft)':'var(--success-soft)',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,border:`1px solid ${agg.faltaAsignar>0?'oklch(0.88 0.06 80)':'oklch(0.88 0.06 150)'}`}}>
          <div style={{width:36,height:36,borderRadius:10,background:'#fff',display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name={agg.faltaAsignar>0?'alert':'check-circle'} size={18} color={agg.faltaAsignar>0?'var(--warn)':'var(--success)'}/></div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:agg.faltaAsignar>0?'var(--warn)':'var(--success)'}}>{agg.faltaAsignar>0?`Faltan ${agg.faltaAsignar} ${agg.faltaAsignar===1?'persona':'personas'}`:'Cobertura completa'}</div><div style={{fontSize:11,color:agg.faltaAsignar>0?'var(--warn)':'var(--success)',opacity:0.8,fontWeight:700,marginTop:1}}>{agg.asignadas} de {agg.objetivo} objetivo · {agg.coberturaPct}% cobertura</div></div>
        </div>
        {Object.entries(coverage).map(([tipo,grp])=>{
          const c=tipoColor(tipo), cfg=TIPOS_TURNO[tipo];
          if(grp.total===0&&grp.objetivo===0)return null;
          return(
            <div key={tipo} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:c.soft}}>
                <div style={{width:32,height:32,borderRadius:9,background:c.bar,display:'grid',placeItems:'center'}}><SGTIcon name={cfg.icon} size={15} color="#fff"/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:c.ink}}>{tipo}</div><div style={{fontSize:10.5,color:c.ink,opacity:0.75,fontWeight:700,marginTop:1}}>{cfg.horaInicio}–{cfg.horaFin}</div></div>
                {grp.faltaAsignar>0?<SGTBadge tone="warn" size="xs">Falta {grp.faltaAsignar}</SGTBadge>:<SGTBadge tone="success" size="xs">Completo</SGTBadge>}
              </div>
              <div style={{padding:'6px 12px 4px'}}>
                <div style={{height:6,background:'var(--line2)',borderRadius:99,overflow:'hidden'}}><div style={{width:`${grp.coberturaPct}%`,background:c.bar,height:'100%'}}/></div>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:2}}><span style={{fontSize:11,fontWeight:800,color:c.ink}}>{grp.asignadas.length} / {grp.objetivo}</span></div>
              </div>
              {grp.asignadas.length>0&&<div style={{padding:'4px 10px 6px',display:'flex',flexDirection:'column',gap:4}}>
                {grp.asignadas.map(inst=>{ const f=FUNCIONARIOS.find(x=>x.idFuncionario===inst.idFuncionario); return(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:'var(--surface2)',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <SGTAvatar person={f} size={30}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.nombre} {f.apellidoPaterno}</div><div style={{display:'flex',alignItems:'center',gap:5,marginTop:2,flexWrap:'wrap'}}><span style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3}}>{f.rol}</span><PisoTag inst={inst} variant="b" size="xs"/></div></div>
                  </button>
                );})}
              </div>}
              {grp.pendientes.length>0&&<div style={{padding:'0 10px 10px',display:'flex',flexDirection:'column',gap:4}}>
                {grp.pendientes.map(inst=>(
                  <button key={inst.id} onClick={()=>onAssignInstance&&onAssignInstance(inst)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',background:`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1px dashed ${c.bar}`,borderRadius:9,cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                    <div style={{width:30,height:30,borderRadius:99,background:'#fff',display:'grid',placeItems:'center',border:`1px solid ${c.bg}`,flexShrink:0}}><SGTIcon name="user" size={14} color={c.ink}/></div>
                    <div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,fontWeight:800,color:c.ink}}>Pendiente</span><PisoTag inst={inst} variant="b" size="xs"/></div><div style={{fontSize:10,fontWeight:700,color:c.ink,opacity:0.7,marginTop:1}}>Toca para asignar funcionario</div></div>
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

/* ─── RotativasListConPiso ────────────────────────────────────────────────── */
function RotativasListConPiso({instancias,onAssign}){
  const grouped=useMemo(()=>{
    const m={};
    instancias.forEach(inst=>{ (m[inst.tipo]??=[]).push(inst); });
    return Object.entries(m).sort(([a],[b])=>{ const o={'Mañana':0,'Tarde':1,'Noche':2}; return(o[a]??9)-(o[b]??9); });
  },[instancias]);

  if(instancias.length===0)return <div style={{padding:20,background:'#fff',borderRadius:12,border:'1px dashed var(--line)',textAlign:'center',fontSize:12,color:'var(--ink3)',fontWeight:600}}>No hay rotativas inyectadas todavía. Toca <strong>Inyectar</strong> para empezar.</div>;

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {grouped.map(([tipo,list])=>{
        const c=tipoColor(tipo), cfg=TIPOS_TURNO[tipo], pend=list.filter(i=>!i.idFuncionario).length;
        return(
          <div key={tipo}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,paddingLeft:2}}>
              <div style={{width:22,height:22,borderRadius:6,background:c.bar,display:'grid',placeItems:'center'}}><SGTIcon name={cfg.icon} size={12} color="#fff"/></div>
              <span style={{fontSize:12,fontWeight:800,color:'var(--ink)'}}>{tipo}</span>
              <span style={{fontSize:10.5,color:'var(--ink3)',fontWeight:700}}>{cfg.horaInicio}–{cfg.horaFin}</span>
              <div style={{flex:1}}/>
              <span style={{fontSize:9.5,fontWeight:900,padding:'2px 7px',borderRadius:99,background:pend>0?'var(--warn-soft)':'var(--success-soft)',color:pend>0?'var(--warn)':'var(--success)',textTransform:'uppercase',letterSpacing:0.3}}>{pend>0?`${pend}/${list.length} pend.`:'Todo asignado'}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {list.map(inst=>{ const assigned=!!inst.idFuncionario; const f=assigned?FUNCIONARIOS.find(x=>x.idFuncionario===inst.idFuncionario):null; return(
                <div key={inst.id} style={{background:'#fff',borderRadius:10,border:'1.5px solid var(--line)',borderLeft:`5px solid ${c.bar}`,overflow:'hidden',display:'flex',alignItems:'stretch'}}>
                  <div style={{flex:1,padding:'9px 10px',minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:10,fontWeight:900,color:'#fff',background:c.bar,padding:'2px 7px',borderRadius:99,letterSpacing:0.3,flexShrink:0}}>{inst.label}</span><span style={{fontSize:12.5,fontWeight:800,color:'var(--ink)',flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.nombrePlantilla}</span></div>
                    {assigned?(
                      <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4}}>
                        <SGTAvatar person={f} size={26}/>
                        <div style={{minWidth:0,flex:1}}><div style={{fontSize:12,fontWeight:800,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.nombre} {f.apellidoPaterno}</div><div style={{display:'flex',alignItems:'center',gap:5,marginTop:2,flexWrap:'wrap'}}><span style={{fontSize:10,fontWeight:800,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:0.3}}>{f.rol}</span><PisoTag inst={inst} variant="b" size="xs"/></div></div>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4}}>
                        <div style={{width:26,height:26,borderRadius:99,background:'var(--warn-soft)',display:'grid',placeItems:'center',flexShrink:0}}><SGTIcon name="user" size={14} color="var(--warn)"/></div>
                        <div style={{minWidth:0,flex:1}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,fontWeight:800,color:'var(--warn)'}}>Pendiente</span><PisoTag inst={inst} variant="b" size="xs"/></div><div style={{fontSize:10,fontWeight:700,color:'var(--ink3)',marginTop:1}}>{inst.fechaInicio} – {inst.fechaFin}</div></div>
                      </div>
                    )}
                  </div>
                  <button onClick={()=>onAssign(inst)} style={{paddingLeft:10,paddingRight:12,background:assigned?'transparent':c.soft,border:'none',borderLeft:'1px solid var(--line2)',display:'grid',placeItems:'center',cursor:'pointer',fontFamily:'inherit'}}>
                    <SGTIcon name={assigned?'more':'arrow-right'} size={15} color={assigned?'var(--ink2)':c.ink}/>
                  </button>
                </div>
              );})}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── BigCalendarGrid ────────────────────────────────────────────────────── */
function BigCalendarGrid({weeks,daysIndex,today,onDayClick}){
  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',position:'sticky',top:0,zIndex:5,background:'#fff',borderBottom:'1px solid var(--line)',borderTop:'1px solid var(--line2)'}}>
        {WEEK_DAYS_LBL.map((d,i)=><div key={d} style={{textAlign:'center',padding:'7px 0',fontSize:10.5,fontWeight:800,letterSpacing:0.5,color:i>=5?'var(--accent)':'var(--ink3)',textTransform:'uppercase'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)'}}>
        {weeks.flat().map(({date,inMonth})=>{
          const ds=toDateStr(date);
          const list=daysIndex[ds]||[];
          const isToday=ds===today, isWeekend=date.getDay()===0||date.getDay()===6;
          const groups=['Mañana','Tarde','Noche'].map(tipo=>({tipo,items:list.filter(i=>i.tipo===tipo)})).filter(g=>g.items.length>0);
          return(
            <div key={ds} style={{minHeight:52+groups.length*38,background:!inMonth?'var(--surface2)':isToday?'var(--primary-soft)':'#fff',borderRight:'1px solid var(--line2)',borderBottom:'1px solid var(--line2)',padding:'5px 4px 7px',opacity:inMonth?1:0.4,display:'flex',flexDirection:'column',gap:4}}>
              <div style={{fontSize:13,fontWeight:isToday?900:700,lineHeight:1,color:isToday?'var(--primary)':isWeekend?'var(--accent)':'var(--ink)',paddingLeft:2,marginBottom:1}}>{date.getDate()}</div>
              {groups.map(({tipo,items})=>{
                const c=tipoColor(tipo), cfg=TIPOS_TURNO[tipo], pend=items.filter(i=>!i.idFuncionario).length, allAssigned=pend===0;
                return(
                  <button key={tipo} onClick={()=>onDayClick(ds)} style={{width:'100%',height:34,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',fontFamily:'inherit',padding:'0 2px',background:allAssigned?c.bg:'#fff',backgroundImage:allAssigned?'none':`repeating-linear-gradient(45deg,${c.soft} 0 5px,transparent 5px 10px)`,border:`1.5px solid ${c.bar}`,borderStyle:allAssigned?'solid':'dashed',position:'relative'}}>
                    <SGTIcon name={cfg.icon} size={12} color={c.ink}/>
                    <span style={{fontSize:13,fontWeight:900,color:c.ink,lineHeight:1}}>{items.length}</span>
                    {pend>0&&<span style={{position:'absolute',top:-5,right:-4,minWidth:15,height:15,padding:'0 3px',borderRadius:99,background:'var(--warn)',color:'#fff',fontSize:9.5,fontWeight:900,lineHeight:'15px',textAlign:'center',boxShadow:'0 0 0 1.5px #fff'}}>{pend}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ghostBtnGB={width:30,height:30,borderRadius:8,background:'var(--surface2)',border:'1px solid var(--line)',display:'grid',placeItems:'center',cursor:'pointer',flexShrink:0};

/* ─── Vista principal ────────────────────────────────────────────────────── */
function PlanGuardarBase({onBack}){
  const{instancias,inject,assign,unassign,daysIndex,savePlan,loadPlan,savedPlans}=usePlanificacionState();
  const[seed,setSeed]=useState('2026-05-01');
  const[injectOpen,setInjectOpen]=useState(false);
  const[saveOpen,setSaveOpen]=useState(false);
  const[assignInstance,setAssignInstance]=useState(null);
  const[detailDate,setDetailDate]=useState(null);
  const[planNombre,setPlanNombre]=useState(null);
  const[toast,setToast]=useState('');

  const{weeks,year,month}=useMemo(()=>buildMonthGrid(seed),[seed]);
  const today='2026-05-14';

  const flash=(msg)=>{ setToast(msg); setTimeout(()=>setToast(''),3200); };

  const onInject=(dto)=>{ const created=inject(dto); setInjectOpen(false); if(created)flash(`${created.label} · ${created.nombrePlantilla}${created.nombrePiso?' · '+created.nombrePiso:''}`); };
  const onAssign=(id,idFunc)=>{ assign(id,idFunc); setAssignInstance(null); flash(`Funcionario asignado`); };
  const onSave=(nombre)=>{ savePlan(nombre); setPlanNombre(nombre); setSaveOpen(false); flash(`Plantilla "${nombre}" guardada`); };
  const onLoad=(planId)=>{ const pl=loadPlan(planId); setSaveOpen(false); if(pl){ setPlanNombre(pl.nombre); flash(`Plantilla "${pl.nombre}" cargada`); } };

  const dayInstancias=detailDate?(daysIndex[detailDate]||[]):[];

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface2)',animation:'sgtSlideLeft .3s ease',overflow:'hidden',position:'relative'}}>

      <TopHeader
        title="Planificación"
        subtitle={planNombre||'Inyectar y asignar rotativas'}
        dense
        leftSlot={<button onClick={onBack} style={{background:'transparent',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SGTIcon name="chevron-left" size={24} color="var(--ink)"/></button>}
        rightSlot={
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setInjectOpen(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 12px',borderRadius:10,background:'var(--primary)',color:'#fff',border:'none',fontSize:12.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
              <SGTIcon name="plus" size={14} color="#fff"/> Inyectar
            </button>
          </div>
        }
      />

      <div style={{padding:'10px 14px 4px',background:'#fff',flexShrink:0}}>
        <KPIBar instancias={instancias} dense/>
      </div>

      <div style={{padding:'8px 14px',background:'#fff',flexShrink:0,display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--line2)'}}>
        <button onClick={()=>setSeed(toDateStr(new Date(year,month-1,1)))} style={ghostBtnGB}><SGTIcon name="chevron-left" size={15} color="var(--ink2)"/></button>
        <div style={{flex:1,textAlign:'center',fontSize:14,fontWeight:800,color:'var(--ink)'}}>{MONTHS_LONG[month]} <span style={{color:'var(--ink3)'}}>{year}</span></div>
        <button onClick={()=>setSeed(toDateStr(new Date(year,month+1,1)))} style={ghostBtnGB}><SGTIcon name="chevron-right" size={15} color="var(--ink2)"/></button>
      </div>

      {toast&&<div style={{margin:'6px 14px 0',background:'var(--success-soft)',color:'var(--success)',borderRadius:8,padding:'8px 12px',fontSize:11.5,fontWeight:700,display:'flex',alignItems:'center',gap:7,flexShrink:0}}><SGTIcon name="check-circle" size={13} color="var(--success)"/>{toast}</div>}

      <div style={{flex:1,overflow:'auto',background:'#fff'}}>
        <BigCalendarGrid weeks={weeks} daysIndex={daysIndex} today={today} onDayClick={(ds)=>(daysIndex[ds]||[]).length&&setDetailDate(ds)}/>
        <div style={{padding:'16px 14px 24px',background:'var(--surface2)',borderTop:'1px solid var(--line)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:11.5,fontWeight:800,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:0.4}}>Rotativas inyectadas</div>
            <span style={{fontSize:11,color:'var(--ink3)',fontWeight:700}}>{instancias.length} total</span>
          </div>
          <RotativasListConPiso instancias={instancias} onAssign={(inst)=>setAssignInstance(inst)}/>
        </div>
      </div>

      <div style={{padding:'10px 14px',background:'#fff',borderTop:'1px solid var(--line)',flexShrink:0}}>
        <button onClick={()=>setSaveOpen(true)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,background:'var(--primary)',color:'#fff',border:'none',fontSize:14.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          <SGTIcon name="calendar" size={17} color="#fff"/> Cargar o guardar plantilla
        </button>
      </div>

      <InyectarConPisoSheet open={injectOpen} onClose={()=>setInjectOpen(false)} onInject={onInject} defaultDate={seed}/>
      <CargarGuardarPlantillaSheet open={saveOpen} onClose={()=>setSaveOpen(false)} onSave={onSave} onLoad={onLoad} instancias={instancias} savedPlans={savedPlans}/>
      <AsignarFuncionarioSheet open={!!assignInstance} onClose={()=>setAssignInstance(null)} instancia={assignInstance?instancias.find(i=>i.id===assignInstance.id):null} onAssign={onAssign} onUnassign={(id)=>{ unassign(id); flash('Asignación retirada'); }}/>
      <DetalleDiaConPisoSheet open={!!detailDate} onClose={()=>setDetailDate(null)} dateStr={detailDate} instanciasDelDia={dayInstancias} onAssignInstance={(inst)=>{ setDetailDate(null); setTimeout(()=>setAssignInstance(inst),220); }}/>
    </div>
  );
}

export default function PlanificacionView({onBack}){
  return <PlanGuardarBase onBack={onBack}/>;
}
