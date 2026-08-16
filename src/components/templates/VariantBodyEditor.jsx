import { useRef, useState, useCallback } from 'react';

export default function VariantBodyEditor({ value, onChange, showToolbar = false }) {
  const textareaRef = useRef(null);
  const [preview, setPreview] = useState('');

  const updatePreview = useCallback((text) => {
    let formatted = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    setPreview(formatted);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    updatePreview(val);
  };

  const wrapSelection = (wrapperStart, wrapperEnd = wrapperStart) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newText =
      value.slice(0, start) + wrapperStart + selected + wrapperEnd + value.slice(end);
    onChange(newText);
    updatePreview(newText);
    setTimeout(() => {
      el.focus();
      if (start === end) {
        el.setSelectionRange(start + wrapperStart.length, start + wrapperStart.length);
      } else {
        el.setSelectionRange(start + wrapperStart.length, start + wrapperStart.length + selected.length);
      }
    }, 0);
  };

  const insertText = (text, cursorOffset = 0) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newValue = value.slice(0, start) + text + value.slice(end);
    onChange(newValue);
    updatePreview(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + cursorOffset,
        start + cursorOffset
      );
    }, 0);
  };

  // Insert {{}} and place cursor between the braces
  const insertVariablePlaceholder = () => {
    insertText('{{}}', 3); // cursor after {{
  };

  return (
    <div className={showToolbar ? 'border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm' : ''}>
      {/* Toolbar – only when showToolbar is true */}
      {showToolbar && (
        <div className="flex items-center gap-0.5 bg-gradient-to-b from-gray-50 to-gray-100 px-2 py-1 border-b border-gray-200 flex-wrap">
          <button type="button" onClick={() => wrapSelection('*')} className="px-2 py-1 text-xs font-bold hover:bg-white rounded transition-colors" title="Bold"><strong>B</strong></button>
          <button type="button" onClick={() => wrapSelection('_')} className="px-2 py-1 text-xs italic hover:bg-white rounded transition-colors" title="Italic"><em>I</em></button>
          <button type="button" onClick={() => wrapSelection('~')} className="px-2 py-1 text-xs line-through hover:bg-white rounded transition-colors" title="Strikethrough"><span className="line-through">S</span></button>
          <span className="w-px h-5 bg-gray-300 mx-1"></span>
          <button type="button" onClick={() => wrapSelection('`')} className="px-2 py-1 text-xs font-mono hover:bg-white rounded transition-colors" title="Inline code">&lt;/&gt;</button>
          <button type="button" onClick={() => wrapSelection('```\n', '\n```')} className="px-2 py-1 text-xs font-mono hover:bg-white rounded transition-colors" title="Code block">&lt;/&gt; block</button>
          <span className="w-px h-5 bg-gray-300 mx-1"></span>
          {/* Insert variable placeholder */}
          <button
            type="button"
            onClick={insertVariablePlaceholder}
            className="px-1.5 py-0.5 text-[10px] border border-orange-300 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
            title="Insert variable placeholder"
          >
            {'{{ }}'}
          </button>
          <span className="flex-1"></span>
          <button type="button" onClick={() => document.execCommand('undo')} className="px-1.5 py-0.5 text-xs hover:bg-white rounded transition-colors" title="Undo"><i className="fas fa-undo"></i></button>
          <button type="button" onClick={() => document.execCommand('redo')} className="px-1.5 py-0.5 text-xs hover:bg-white rounded transition-colors" title="Redo"><i className="fas fa-redo"></i></button>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={showToolbar ? 8 : 5}
        value={value}
        onChange={handleChange}
        placeholder="Type your message… Use {{variable}} for placeholders."
        className={`w-full border-gray-300 px-3 py-2 text-xs resize-y focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow ${
          showToolbar ? 'border-0' : 'border rounded'
        }`}
      />

      {/* Live preview */}
      {preview && (
        <div className="mt-2 bg-gradient-to-b from-gray-50 to-white p-2 rounded border text-xs shadow-sm">
          <p className="text-gray-400 mb-1 uppercase text-[10px] font-semibold">Preview</p>
          <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      )}
    </div>
  );
}