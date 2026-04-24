import React, { useState } from 'react';
import { Button } from './Button';
import { Type } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, onClear }) => {
  const [typedName, setTypedName] = useState('');

  const clear = () => {
    setTypedName('');
    onClear();
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTypedName(name);
    
    // Create a canvas with the typed name to save as image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Professional signature font style
      ctx.font = 'italic 48px "Libre Baskerville", serif';
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw a subtle line under the signature
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
        <Type className="w-3 h-3 text-slate-500" />
      </div>

      <div className="border-b-2 border-slate-200 bg-slate-50/50 p-4 transition-all focus-within:border-indigo-500 focus-within:bg-white flex flex-col items-center">
        <input
          type="text"
          value={typedName}
          onChange={handleTypeChange}
          placeholder="Escriba nombre completo..."
          className="w-full text-center text-xl font-serif italic border-none bg-transparent focus:ring-0 outline-none placeholder:text-slate-300 text-slate-900"
        />
        <div className="mt-2 text-[8px] text-slate-600 font-bold uppercase tracking-widest">
          Firma Digitalizada (Solo Texto)
        </div>
      </div>
      
      <button
        type="button"
        onClick={clear}
        className="self-end text-[9px] uppercase font-black tracking-widest text-slate-500 hover:text-red-500 transition-colors"
      >
        Limpiar Firma
      </button>
    </div>
  );
};
