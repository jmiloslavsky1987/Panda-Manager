'use client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  isFullScreen?: boolean;
}

export default function CodeMirrorEditor({ value, onChange, isFullScreen }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      height={isFullScreen ? '70vh' : '400px'}
      extensions={[markdown()]}
      theme={oneDark}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false }}
    />
  );
}
