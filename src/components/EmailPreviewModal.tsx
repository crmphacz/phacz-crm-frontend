import { useState } from 'react';
import { X, Monitor, Smartphone, Mail } from 'lucide-react';
import type { EmailBlock } from '../types';
import { EmailBlockRenderer } from './EmailBlockRenderer';

interface EmailPreviewModalProps {
  assunto: string;
  preheader: string;
  blocks: EmailBlock[];
  onClose: () => void;
  footer?: React.ReactNode;
}

export function EmailPreviewModal({ assunto, preheader, blocks, onClose, footer }: EmailPreviewModalProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <Mail size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-base text-gray-900">Pré-visualização</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Como o e-mail será exibido para o destinatário</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: '#f1f5f9' }}>
              <button
                onClick={() => setDevice('desktop')}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={device === 'desktop' ? { backgroundColor: '#fff', color: '#d55006', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { color: '#9ca3af' }}
                title="Visualização desktop"
              >
                <Monitor size={15} />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={device === 'mobile' ? { backgroundColor: '#fff', color: '#d55006', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { color: '#9ca3af' }}
                title="Visualização mobile"
              >
                <Smartphone size={15} />
              </button>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto py-8 px-4" style={{ backgroundColor: '#e9ebee' }}>
          <div
            className="mx-auto bg-white rounded-xl overflow-hidden transition-all"
            style={{ width: device === 'desktop' ? 560 : 340, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: '#e6e3de' }}>
              <p className="text-xs text-gray-400">De: PHACZ Gestão Comercial &lt;marketing@phacz.com.br&gt;</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{assunto || '(sem assunto)'}</p>
              {preheader && <p className="text-xs text-gray-400 mt-0.5 truncate">{preheader}</p>}
            </div>
            <div className="px-6 py-6 space-y-4">
              {blocks.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-10">Este e-mail ainda não tem conteúdo.</p>
              ) : (
                blocks.map((block) => <EmailBlockRenderer key={block.id} block={block} />)
              )}
            </div>
          </div>
        </div>

        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
