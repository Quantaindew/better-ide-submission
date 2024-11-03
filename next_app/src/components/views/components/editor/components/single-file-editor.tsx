import { Editor } from "@monaco-editor/react";
import { useGlobalState, useProjectManager } from "@/hooks"
import notebookTheme from "@/monaco-themes/notebook.json";
import { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { registerCompletion } from 'monacopilot';
import { useEditorContent } from '@/context/EditorContext';

const monacoConfig: editor.IStandaloneEditorConstructionOptions = {
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    inlineSuggest: { enabled: true },
    quickSuggestions: true, 
    suggestOnTriggerCharacters: true, 
}

export default function SingleFileEditor() {
    const manager = useProjectManager();
    const globalState = useGlobalState();
    const { theme } = useTheme();
    const { editorContent, setEditorContent } = useEditorContent();

    const project = globalState.activeProject ? manager.getProject(globalState.activeProject) : null;
    const file = project && globalState.activeFile ? project.getFile(globalState.activeFile) : null;

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (editorContent && file && project) {  // Added project check
            const newContent = { ...file.content };
            newContent.cells[file.content.cellOrder[0]] = {
                ...file.content.cells[file.content.cellOrder[0]],
                code: editorContent,
            };
            manager.updateFile(project, { file, content: newContent });
        }
    }, [editorContent]);

    useEffect(() => {
        if (file?.content?.cells?.[file.content.cellOrder[0]]?.code) {
            setEditorContent(file.content.cells[file.content.cellOrder[0]].code);
        }
    }, [file]);

    if (!project || !file) {
        return null;
    }

    return <>
        <Editor
            className="font-btr-code"
            height="100%"
            onMount={(editor, monaco) => {
                monaco.editor.defineTheme(
                    "notebook",
                    notebookTheme as editor.IStandaloneThemeData
                );
                if (theme == "dark") monaco.editor.setTheme("notebook");
                else monaco.editor.setTheme("vs-light");

                // Register Monacopilot completion
                const completion = registerCompletion(monaco, editor, {
                    endpoint: 'https://monacoautocompleteserver-production.up.railway.app/complete',
                    language: file?.language || 'lua',
                    trigger: 'onTyping',
                    maxContextLines: 60,
                    enableCaching: true,
                });

                // Add Left Arrow key binding to accept the current suggestion
                editor.addCommand(monaco.KeyCode.LeftArrow, () => {
                    const suggestWidget = editor.getContribution('editor.contrib.suggestController');
                    if (suggestWidget) {
                        // @ts-ignore - the type definitions are incomplete but this works
                        suggestWidget.acceptSelectedSuggestion();
                    }
                });

                // Add format code action
                editor.addAction({
                    id: "format-code",  
                    label: "Format Code",
                    contextMenuGroupId: "navigation",
                    run: async function (editor) {
                        const luamin = require('lua-format')
                        const input = editor.getValue()
                        console.log("formatting code")
                        const output: string = luamin.Beautify(input, {
                            RenameVariables: false,
                            RenameGlobals: false,
                            SolveMath: true
                        })
                        editor.setValue(output.split("\n").slice(1).join("\n").trimStart())
                    },
                })
            }}
            value={editorContent || file.content.cells[file.content.cellOrder[0]].code}
            onChange={(value) => {
                if (!value) return;
                setEditorContent(value);
            }}
            language={file.language}
            options={monacoConfig}
        />
    </>
}