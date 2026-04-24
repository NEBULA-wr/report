import React from 'react';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-50 text-red-600' : 
            variant === 'warning' ? 'bg-orange-50 text-orange-600' : 
            'bg-indigo-50 text-indigo-600'
          }`}>
            <AlertTriangle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="primary"
              onClick={onConfirm}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest ${
                variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                variant === 'warning' ? 'bg-orange-600 hover:bg-orange-700' : 
                'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {confirmText}
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
