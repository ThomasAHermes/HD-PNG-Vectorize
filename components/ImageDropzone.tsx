
import React, { useCallback, useState } from 'react';

interface ImageDropzoneProps {
  onImageSelected: (base64: string, mimeType: string) => void;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageSelected }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative group cursor-pointer
        border-2 border-dashed rounded-2xl p-10
        transition-all duration-300 ease-in-out
        flex flex-col items-center justify-center text-center
        h-80 w-full
        ${isDragOver 
          ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
          : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800'
        }
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <div className="h-16 w-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-slate-200 mb-2">
        Upload an image
      </h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Drag and drop here, paste from clipboard (Ctrl+V), or click to browse.
      </p>
    </div>
  );
};
