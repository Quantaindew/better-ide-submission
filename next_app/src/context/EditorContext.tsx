import { createContext, useContext, useState } from 'react';

export const EditorContext = createContext<{
  editorContent: string;
  setEditorContent: (content: string) => void;
}>({
  editorContent: '',
  setEditorContent: () => {},
});

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editorContent, setEditorContent] = useState('');

  return (
    <EditorContext.Provider value={{ editorContent, setEditorContent }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContent() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContent must be used within an EditorProvider');
  }
  return context;
} 