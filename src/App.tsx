/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  FileUp, 
  FileText, 
  Settings, 
  Download, 
  Trash2, 
  Maximize2, 
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Eye,
  Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore - html2pdf.js doesn't have official types
import html2pdf from 'html2pdf.js';
import { cn } from './lib/utils';

type PageSize = 'letter' | 'a4' | 'legal';
type MarginType = 'none' | 'narrow' | 'normal' | 'wide';

const MARGIN_VALUES: Record<MarginType, number | number[]> = {
  none: 0,
  narrow: 0.5,
  normal: 1,
  wide: 1.5,
};

export default function App() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [margin, setMargin] = useState<MarginType>('narrow');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // DPI for calculation
  const DPI = 96;
  const PAGE_HEIGHTS: Record<PageSize, number> = {
    letter: 11,
    a4: 11.69,
    legal: 14,
  };

  const getEffectivePageHeight = () => {
    const totalHeight = PAGE_HEIGHTS[pageSize];
    const marginVal = typeof MARGIN_VALUES[margin] === 'number' 
      ? (MARGIN_VALUES[margin] as number) 
      : (MARGIN_VALUES[margin] as number[])[0]; // Assuming top margin if array
    return (totalHeight - (marginVal * 2)) * DPI;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
      setError('Please upload a valid .html file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlContent(content);
      setFileName(file.name);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileUpload({ target: { files: dataTransfer.files } } as any);
      }
    }
  };

  const clearFile = () => {
    setHtmlContent(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const syncContent = useCallback(() => {
    if (isEditing && previewRef.current) {
      const currentContent = previewRef.current.innerHTML;
      if (currentContent !== htmlContent) {
        setHtmlContent(currentContent);
      }
    }
  }, [isEditing, htmlContent]);

  const toggleEditing = () => {
    syncContent();
    setIsEditing(!isEditing);
  };

  const toggleExpand = () => {
    syncContent();
    setIsPreviewExpanded(!isPreviewExpanded);
  };

  const updatePageSize = (size: PageSize) => {
    syncContent();
    setPageSize(size);
  };

  const updateMargin = (m: MarginType) => {
    syncContent();
    setMargin(m);
  };

  const generatePdf = async () => {
    // Ensure we have the latest content from the ref if currently editing
    const currentHtml = isEditing && previewRef.current ? previewRef.current.innerHTML : htmlContent;
    if (!currentHtml) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const element = document.createElement('div');
      element.innerHTML = currentHtml;
      // Apply some basic styles to ensure it looks good in PDF
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.fontFamily = 'Inter, sans-serif';

      const options = {
        margin: MARGIN_VALUES[margin],
        filename: fileName?.replace('.html', '.pdf') || 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: pageSize, orientation: 'portrait' }
      } as any;

      await html2pdf().set(options).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setError('An error occurred while generating the PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [numPages, setNumPages] = useState(1);
  const effectivePageHeight = getEffectivePageHeight();

  React.useEffect(() => {
    if (!previewRef.current) return;

    const observer = new ResizeObserver(() => {
      if (previewRef.current && !isEditing) { // Only update page count when not editing
        const height = previewRef.current.scrollHeight;
        setNumPages(Math.ceil(height / effectivePageHeight));
      }
    });

    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [htmlContent, effectivePageHeight, isEditing]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              HTML to PDF
            </h1>
          </div>
          <p className="text-slate-500 max-w-2xl">
            Convert your LLM-generated HTML files into clean, professional PDF documents.
            Everything stays in your browser.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileUp className="w-4 h-4" /> Upload
              </h2>
              
              {!htmlContent ? (
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".html"
                    className="hidden"
                  />
                  <div className="bg-slate-100 p-3 rounded-full w-fit mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                    <FileUp className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Click or drag .html file</p>
                  <p className="text-xs text-slate-400 mt-1">Simple text-based HTML preferred</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-700 truncate">{fileName}</p>
                      <p className="text-xs text-slate-400 uppercase">Ready to convert</p>
                    </div>
                  </div>
                  <button 
                    onClick={clearFile}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>

            {/* Settings Area */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Page Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['letter', 'a4', 'legal'] as PageSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => updatePageSize(size)}
                        className={cn(
                          "py-2 px-3 text-xs font-medium rounded-lg border transition-all capitalize",
                          pageSize === size 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Margins</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['none', 'narrow', 'normal', 'wide'] as MarginType[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => updateMargin(m)}
                        className={cn(
                          "py-2 px-3 text-xs font-medium rounded-lg border transition-all capitalize",
                          margin === m 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {m} ({MARGIN_VALUES[m]}in)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={!htmlContent || isGenerating}
                onClick={generatePdf}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200/50",
                  !htmlContent || isGenerating
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export to PDF
                  </>
                )}
              </button>
            </section>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-2">
            <section className={cn(
              "bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col transition-all duration-300",
              isPreviewExpanded ? "fixed inset-4 z-50 m-0" : "h-[600px]"
            )}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Preview
                  </h2>
                  {htmlContent && (
                    <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-md">
                      <Scissors className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {htmlContent && (
                    <button 
                      onClick={toggleEditing}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                        isEditing 
                          ? "bg-amber-100 text-amber-700 border border-amber-200" 
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {isEditing ? (
                        <><Eye className="w-4 h-4" /> View Mode</>
                      ) : (
                        <><Edit3 className="w-4 h-4" /> Edit Content</>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={toggleExpand}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    {isPreviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-8 bg-slate-50/50 relative">
                {htmlContent ? (
                  <div className="relative mx-auto" style={{ width: pageSize === 'letter' ? '8.5in' : pageSize === 'a4' ? '8.27in' : '8.5in' }}>
                    {/* Page Break Indicators */}
                    {!isEditing && Array.from({ length: numPages - 1 }).map((_, i) => (
                      <div 
                        key={i}
                        className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400/30 z-10 pointer-events-none flex items-center justify-center"
                        style={{ top: `${(i + 1) * effectivePageHeight}px` }}
                      >
                        <span className="bg-blue-50 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full -translate-y-1/2 uppercase tracking-widest">
                          Page Break {i + 2}
                        </span>
                      </div>
                    ))}

                    <div 
                      ref={previewRef}
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      className={cn(
                        "bg-white shadow-xl min-h-full p-12 prose prose-slate max-w-none focus:outline-none transition-all",
                        isEditing ? "ring-2 ring-amber-400/50 cursor-text" : ""
                      )}
                      style={{
                        padding: `${MARGIN_VALUES[margin]}in`
                      }}
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="p-4 bg-slate-100 rounded-full">
                      <FileText className="w-12 h-12 opacity-20" />
                    </div>
                    <p className="text-sm">Upload a file to see preview</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[60]"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            Built for personal use. No data is sent to any server.
          </p>
        </footer>
      </div>
    </div>
  );
}
