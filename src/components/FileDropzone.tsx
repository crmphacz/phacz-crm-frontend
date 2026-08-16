import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface FileDropzoneProps {
  id: string;
  accept: string;
  hint: string;
  uploading: boolean;
  onFile: (file: File) => void;
}

/** Área de arrastar-e-soltar (ou clicar para escolher) reaproveitada em todo upload de arquivo do CRM. */
export function FileDropzone({ id, accept, hint, uploading, onFile }: FileDropzoneProps) {
  const [isOver, setIsOver] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed text-xs font-semibold transition-colors"
        style={{
          borderColor: isOver ? '#d55006' : '#d1d5db',
          backgroundColor: isOver ? '#fff7ed' : 'transparent',
          color: isOver ? '#d55006' : '#6b7280',
          cursor: uploading ? 'default' : 'pointer',
        }}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Enviando...' : hint}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
