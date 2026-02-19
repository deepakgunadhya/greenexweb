import React, { forwardRef, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
  className?: string;
}

// Custom toolbar configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: [] }, { background: [] }],
    [
      { list: 'ordered' },
      { list: 'bullet' },
      { indent: '-1' },
      { indent: '+1' },
    ],
    ['link', 'image', 'video'],
    [{ align: [] }],
    ['code-block'],
    ['clean'],
  ],
};

const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
  'link',
  'image',
  'video',
  'align',
  'code-block',
];

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, readOnly = false, error, className }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current = quillRef.current;
      }
    }, [ref]);

    return (
      <div className={className}>
        <div
          className={`border rounded-lg overflow-hidden ${
            error
              ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-200'
              : 'border-slate-300 focus-within:border-primary-500 focus-within:ring-primary-200'
          } focus-within:ring-2 focus-within:ring-opacity-50 transition-all duration-200`}
        >
          <ReactQuill
            ref={quillRef}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            modules={readOnly ? { toolbar: false } : modules}
            formats={formats}
            style={{
              height: readOnly ? 'auto' : '200px',
            }}
            theme="snow"
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <style dangerouslySetInnerHTML={{__html: `
          .ql-editor {
            min-height: 150px;
            font-family: inherit;
          }
          .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }
          .ql-toolbar.ql-snow {
            border-top: none;
            border-left: none;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }
          .ql-container.ql-snow {
            border: none;
          }
          .ql-editor p {
            margin-bottom: 0.75em;
          }
          .ql-editor h1 {
            font-size: 2em;
            margin-bottom: 0.5em;
            font-weight: 600;
          }
          .ql-editor h2 {
            font-size: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
          }
          .ql-editor h3 {
            font-size: 1.25em;
            margin-bottom: 0.5em;
            font-weight: 600;
          }
          .ql-editor blockquote {
            border-left: 4px solid #e2e8f0;
            padding-left: 1rem;
            margin-left: 0;
            margin-right: 0;
            color: #6b7280;
            font-style: italic;
          }
          .ql-editor pre {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            padding: 1rem;
            margin: 1rem 0;
            overflow-x: auto;
          }
          .ql-editor code {
            background-color: #f1f5f9;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
          }
        `}} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

// Pure HTML renderer for displaying rich text content
export const RichTextDisplay: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className }) => {
  return (
    <div 
      className={`prose prose-slate max-w-none ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: content || '' }}
      style={{
        // Override prose styles to match our design
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#374151',
      }}
    />
  );
};