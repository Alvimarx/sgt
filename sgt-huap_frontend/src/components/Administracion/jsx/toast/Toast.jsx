// Componente: Toast
// Descripción: Mensajes temporales (toasts) para notificaciones de la UI.
// Props: `message` (texto a mostrar), `type` en {'info','success','error'}
import React from 'react'

export default function Toast({message, type='info'}){
  if(!message) return null
  const color = type==='error'? 'bg-red-600' : (type==='success'? 'bg-green-600':'bg-indigo-600')
  return (
    <div className={`${color} text-white px-4 py-3 rounded-lg fixed right-6 bottom-6 shadow-lg max-w-md`}> 
      <div className="font-medium">{type === 'error' ? 'Error' : (type==='success' ? 'Éxito' : 'Información')}</div>
      <div className="text-sm mt-1">{message}</div>
    </div>
  )
}
