'use client';
import React from 'react';
export default function Modal({ open, onClose, children }){
  if(!open) return null;
  return (<div className="modal-backdrop grid place-items-center" onClick={onClose}>
    <div className="card w-[520px] max-w-[95vw]" onClick={e=>e.stopPropagation()}>
      {children}
    </div>
  </div>);
}
