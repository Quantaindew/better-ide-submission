'use client'

import { useEffect, useState, useRef, useLayoutEffect, memo, useCallback } from 'react'
import Draggable from 'react-draggable'
import { X, Send, FileText, Copy, Plus, Database } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from 'react-markdown'
import * as shiki from 'shiki'
import { useEditorContent } from '@/context/EditorContext';

type Message = {
  id: string
  type: 'user' | 'ai'
  content: string
  fileSize?: string
  isMarkdown?: boolean
  isStreaming?: boolean
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type FileContext = {
  path: string
  content: string
}

type VisibleRange = {
  startLine: number
  endLine: number
}

let highlighterPromise: Promise<shiki.Highlighter> | null = null;

const getHighlighterInstance = () => {
  if (!highlighterPromise) {
    highlighterPromise = shiki.getHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'jsx', 'tsx', 'html', 'css', 'json', 'lua', 'markdown']
    });
  }
  return highlighterPromise;
};

const CodeBlock = ({ language, value, filename }: { language: string, value: string, filename?: string }) => {
  const [highlighted, setHighlighted] = useState('')
  const [highlighter, setHighlighter] = useState<shiki.Highlighter | null>(null)
  const { editorContent, setEditorContent } = useEditorContent();

  console.log('CodeBlock props:', { language, value, filename });

  useEffect(() => {
    const initHighlighter = async () => {
      const hl = await getHighlighterInstance()
      setHighlighter(hl)
    }
    initHighlighter()
  }, [])

  useEffect(() => {
    const highlight = async () => {
      if (!highlighter) return
      try {
        const html = highlighter.codeToHtml(value, {
          lang: language || 'lua',
          theme: 'github-dark'
        })
        setHighlighted(html)
      } catch (error) {
        console.error('Highlighting error:', error)
        setHighlighted(value)
      }
    }
    highlight()
  }, [value, language, highlighter])

  const copyCode = () => {
    navigator.clipboard.writeText(value)
  }

  const applyCode = () => {
    if (setEditorContent) {
      setEditorContent(value);
      console.log('Applying code:', value);
    }
  };

  const lines = value.split('\n')
  const lineCount = lines.length
  const lineNumberWidth = Math.max(2, String(lineCount).length) * 12

  return (
    <div className="relative rounded-md overflow-hidden my-2 bg-[#0d1117] max-w-full">
      {filename && (
        <div className="bg-zinc-900/50 px-4 py-1 text-sm border-b border-zinc-800 break-words">
          {filename}
        </div>
      )}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-zinc-900/50 hover:bg-zinc-900/80"
          onClick={applyCode}
          title="Apply code to editor"
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-zinc-900/50 hover:bg-zinc-900/80"
          onClick={copyCode}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative font-mono text-sm">
        <div 
          className="absolute top-0 left-0 bottom-0 flex flex-col items-end px-4 py-4 select-none text-zinc-600 bg-black/20"
          style={{ width: lineNumberWidth + 'px' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        {!highlighted ? (
          <div className="p-4 overflow-auto animate-pulse">
            Loading syntax highlighting...
          </div>
        ) : (
          <div
            className="p-4 overflow-x-auto whitespace-pre-wrap break-words shiki"
            style={{ paddingLeft: (lineNumberWidth + 16) + 'px' }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        )}
      </div>
    </div>
  )
}
CodeBlock.displayName = 'CodeBlock';

const ChatMessage = memo(({ message }: { message: Message }) => {
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`inline-block p-2 rounded-lg break-words overflow-hidden ${
        message.type === 'user' ? 'bg-primary text-primary-foreground max-w-[85%]' : 'bg-muted max-w-[85%]'
      }`}>
        {message.isMarkdown ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const {className, children, ...rest} = props
                  const fullClassName = className || ''
                  const [langPart, ...filenameParts] = fullClassName.split(':')
                  const match = /language-(\w+)/.exec(langPart)
                  const language = match ? match[1] : ''
                  const filename = filenameParts.join(':')
                  
                  console.log('Debug - className:', className);
                  console.log('Debug - language:', language);
                  console.log('Debug - filename:', filename);
                  
                  if (className && match) {
                    return (
                      <CodeBlock
                        language={language}
                        value={String(children).replace(/\n$/, '')}
                        filename={filename || undefined}
                        {...rest}
                      />
                    )
                  }
                  return <code className={className} {...rest}>{children}</code>
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
      {message.fileSize && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
          <FileText className="h-3 w-3" />
          {message.fileSize}
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.message.content === nextProps.message.content && 
         prevProps.message.type === nextProps.message.type &&
         prevProps.message.fileSize === nextProps.message.fileSize
})
ChatMessage.displayName = 'ChatMessage';  // ADD THIS LINE HERE

const MessagesContainer = memo(({ messages }: { messages: Message[] }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
})
MessagesContainer.displayName = 'MessagesContainer';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export default function FloatingChat() {
  const { editorContent } = useEditorContent();

  const [isVisible, setIsVisible] = useState(false)
  const [size, setSize] = useState({ width: 500, height: 400 })
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const nodeRef = useRef(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 5 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const startPosition = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const [currentFileContext, setCurrentFileContext] = useState<FileContext | null>(null)
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      const userMessage: Message = { 
        id: Date.now().toString(),
        type: 'user', 
        content: input.trim(),
        isMarkdown: false
      }
      if (isCodeSnippet(input)) {
        userMessage.fileSize = calculateFileSize(input)
      }
      
      setMessages(prev => [...prev, userMessage])
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setIsLoading(true)

      try {
        const chatHistory: ChatMessage[] = messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))

        chatHistory.push({
          role: 'user',
          content: input
        })

        const response = await fetch('https://monacoautocompleteserver-production.up.railway.app/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            message: input,
            chat: chatHistory,
            fileContext: currentFileContext,
            visibleRange: visibleRange
          })
        })

        const data = await response.json()
        setMessages(prev => [...prev, { 
          id: Date.now().toString(),
          type: 'ai', 
          content: data.response,
          isMarkdown: true 
        }])
      } catch (error) {
        console.error('Error:', error)
        setMessages(prev => [...prev, { 
          id: Date.now().toString(),
          type: 'ai', 
          content: 'Sorry, there was an error processing your request.',
          isMarkdown: false
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCodeSnippet = (text: string) => {
    return text.includes('{') && text.includes('}')
  }

  const calculateFileSize = (text: string) => {
    const bytes = new Blob([text]).size
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
  }

  const handleNewChat = () => {
    setMessages([])
  }

  const handleDragStop = (e: any, data: any) => {
    setPosition({ x: data.x, y: data.y })
  }

  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizing || !chatRef.current) return

    const deltaX = e.clientX - startPosition.current.x
    const deltaY = e.clientY - startPosition.current.y
    const rect = chatRef.current.getBoundingClientRect()

    let newWidth = startPosition.current.width
    let newHeight = startPosition.current.height

    if (resizing.includes('e')) {
      newWidth = Math.max(300, startPosition.current.width + deltaX)
    }
    if (resizing.includes('w')) {
      newWidth = Math.max(300, startPosition.current.width - deltaX)
    }
    if (resizing.includes('s')) {
      newHeight = Math.max(200, startPosition.current.height + deltaY)
    }
    if (resizing.includes('n')) {
      newHeight = Math.max(200, startPosition.current.height - deltaY)
    }

    setSize({ width: newWidth, height: newHeight })
  }, [resizing])

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResize)
      window.addEventListener('mouseup', () => setResizing(null))
    }
    return () => {
      window.removeEventListener('mousemove', handleResize)
      window.removeEventListener('mouseup', () => setResizing(null))
    }
  }, [resizing, handleResize])

  const startResize = (handle: ResizeHandle) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (chatRef.current) {
      startPosition.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height
      }
      setResizing(handle)
    }
  }

  const updateFileContext = useCallback((path: string, content: string) => {
    setCurrentFileContext({ path, content })
  }, [])

  const updateVisibleRange = useCallback((startLine: number, endLine: number) => {
    setVisibleRange({ startLine, endLine })
  }, [])

  const handleSendCodebase = async () => {
    if (messages.length > 0 || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const introMessage = "This is my entire codebase. Please understand this code for now, and I will ask for help related to this code in the next prompts.";
      
      const codebaseMessage = { 
        id: Date.now().toString(),
        type: 'user' as const, 
        content: `${introMessage}\n\n${editorContent || 'No code in editor'}`,
        isMarkdown: false,
        fileSize: calculateFileSize(editorContent || '')
      };
      
      setMessages(prev => [...prev, codebaseMessage]);

      const response = await fetch('https://monacoautocompleteserver-production.up.railway.app/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          message: introMessage,
          chat: [{
            role: 'user',
            content: `${introMessage}\n\n${editorContent || ''}`
          }],
          fileContext: {
            path: currentFileContext?.path || 'unknown',
            content: editorContent || ''
          },
          visibleRange: visibleRange
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        type: 'ai', 
        content: data.response,
        isMarkdown: true 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        type: 'ai', 
        content: 'Sorry, there was an error processing your request.',
        isMarkdown: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null

  return (
    <Draggable 
      handle=".drag-handle" 
      nodeRef={nodeRef}
      defaultPosition={position}
      onStop={handleDragStop}
      bounds="body"
    >
      <div
        ref={nodeRef}
        className="fixed z-50 min-w-[300px] max-w-[90vw]"
        style={{
          width: size.width,
          height: size.height,
        }}
      >
        <div 
          ref={chatRef}
          className="rounded-lg overflow-hidden backdrop-blur-md bg-background/80 border shadow-lg flex flex-col h-full relative"
        >
          <div className="drag-handle px-4 py-2 flex justify-between items-center bg-muted/50 cursor-move">
            <h3 className="text-sm font-medium">Composer</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={isLoading}
                onClick={handleSendCodebase}
                title={messages.length > 0 ? "Only available in new chat" : "Analyze codebase"}
              >
                <Database className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleNewChat}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <MessagesContainer messages={messages} />
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex items-start gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="resize-none bg-transparent min-h-[38px]"
                rows={1}
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
              >
                <Send className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 left-0 right-0 h-1 cursor-n-resize pointer-events-auto"
              onMouseDown={startResize('n')}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize pointer-events-auto"
              onMouseDown={startResize('s')}
            />
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize pointer-events-auto"
              onMouseDown={startResize('w')}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize pointer-events-auto"
              onMouseDown={startResize('e')}
            />
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize pointer-events-auto"
              onMouseDown={startResize('nw')}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize pointer-events-auto"
              onMouseDown={startResize('ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize pointer-events-auto"
              onMouseDown={startResize('sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize pointer-events-auto"
              onMouseDown={startResize('se')}
            />
          </div>
        </div>
      </div>
    </Draggable>
  )
}