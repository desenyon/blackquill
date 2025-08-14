import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { AnalysisResponse, EssayInputs } from './types';
import { getEssayCritique, sampleEssays } from './services/geminiService';
import { LogoIcon, SparklesIcon, ChevronDownIcon, CheckCircleIcon, AlertTriangleIcon, TargetIcon, ClipboardIcon, HelpCircleIcon, CheckIcon, XIcon, FileTextIcon, BoldIcon, ItalicIcon, UnderlineIcon, Heading2Icon, QuoteIcon, ListIcon, MaximizeIcon, MinimizeIcon, SunIcon, MoonIcon, TypeIcon, UploadCloudIcon, FocusIcon, TypewriterIcon, FontSizeIcon, LineHeightIcon, SoundOnIcon, SoundOffIcon } from './components/icons';

// --- STYLES, CONFIGS, & HOOKS ---

const priorityColors: { [key: string]: string } = { P0: 'border-red-500 bg-red-500/10', P1: 'border-orange-500 bg-orange-500/10', P2: 'border-yellow-500 bg-yellow-500/10' };
const themes = [{ name: 'dark', icon: MoonIcon, className: '' }, { name: 'dim', icon: MoonIcon, className: 'theme-dim' }, { name: 'paper', icon: SunIcon, className: 'theme-paper' }];
const fonts = [{ name: 'Inter', className: 'font-sans' }, { name: 'Merriweather', className: 'font-serif' }, { name: 'Roboto Mono', className: 'font-mono' }];

const useTypingSound = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const playSound = useCallback((soundType: 'click' | 'space' | 'delete') => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
                return;
            }
        }
        const audioCtx = audioCtxRef.current;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        const freq = soundType === 'click' ? 440 : soundType === 'space' ? 220 : 110;
        const duration = soundType === 'click' ? 0.05 : 0.07;
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }, []);
    return playSound;
};

// --- UTILITY & LAYOUT COMPONENTS ---

const GlassCard: React.FC<{ children: React.ReactNode; className?: string, style?: React.CSSProperties, cardRef?: React.RefObject<HTMLDivElement> }> = ({ children, className, style, cardRef }) => (
    <div ref={cardRef} style={style} className={`bg-[var(--color-surface,rgba(28,28,30,0.5))] border border-[var(--color-border,rgba(255,255,255,0.1))] rounded-2xl shadow-glass backdrop-blur-xl ${className}`}>
        {children}
    </div>
);

const Header: React.FC = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-end, #111)]/80 backdrop-blur-lg border-b border-[var(--color-border,rgba(255,255,255,0.1))]">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <LogoIcon className="h-7 w-7 text-[var(--color-primary,#4F46E5)]" />
                <h1 className="text-xl font-bold text-[var(--color-text,#E4E4E7)]">BlackQuill<span className="text-[var(--color-text-dim,#A0A0A5)] font-normal hidden sm:inline"> — Ultra Essay Critic</span></h1>
            </div>
        </div>
    </header>
);

const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative flex items-center">{children}<div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-auto min-w-max p-2 bg-[var(--color-bg-end,#111)] border border-[var(--color-border,rgba(255,255,255,0.1))] rounded-md shadow-lg text-xs text-[var(--color-text-dim,#A0A0A5)] scale-0 group-hover:scale-100 transition-transform origin-bottom z-30 pointer-events-none">{text}</div></div>
);

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(textToCopy); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return <button onClick={handleCopy} className="p-1.5 hover:bg-[var(--color-primary,#4F46E5)]/20 rounded-md transition-colors" aria-label="Copy to clipboard">{copied ? <CheckIcon className="w-4 h-4 text-brand-accent"/> : <ClipboardIcon className="w-4 h-4 text-[var(--color-text-dim,#A0A0A5)]"/>}</button>;
};

// --- ANALYSIS COMPONENTS ---

const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
    const color = score > 7 ? 'bg-green-500' : score > 4 ? 'bg-yellow-500' : 'bg-red-500';
    return <div><div className="flex justify-between items-baseline mb-1"><span className="text-sm font-medium text-[var(--color-text-dim,#A0A0A5)]">{label}</span><span className="text-base font-bold text-[var(--color-text,#E4E4E7)]">{score}/10</span></div><div className="w-full bg-black/20 rounded-full h-2.5"><div className={`${color} h-2.5 rounded-full`} style={{ width: `${score * 10}%` }}></div></div></div>;
};

const FeedbackAccordion: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (<div className="border border-[var(--color-border,rgba(255,255,255,0.1))] rounded-xl bg-[var(--color-surface,rgba(28,28,30,0.5))]/50 overflow-hidden"><button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center bg-[var(--color-surface-light,rgba(38,38,40,0.7))] hover:bg-white/5 transition-colors"><div className="flex items-center gap-3">{icon}<h4 className="font-bold text-[var(--color-text,#E4E4E7)]">{title}</h4></div><ChevronDownIcon className={`w-5 h-5 text-[var(--color-text-dim,#A0A0A5)] transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <div className="p-6 border-t border-[var(--color-border,rgba(255,255,255,0.1))]">{children}</div>}</div>);
};

const AnalysisDashboard: React.FC<{ analysis: AnalysisResponse }> = ({ analysis }) => (
    <div className="space-y-6"><GlassCard className="p-6"><h3 className="text-lg font-bold mb-4 text-[var(--color-text,#E4E4E7)]">Overall Scores</h3><div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4"><ScoreBar score={analysis.scores.thesis} label="Thesis" /><ScoreBar score={analysis.scores.argumentation} label="Argument" /><ScoreBar score={analysis.scores.evidence} label="Evidence" /><ScoreBar score={analysis.scores.organization} label="Organization" /><ScoreBar score={analysis.scores.style_and_voice} label="Style" /><ScoreBar score={analysis.scores.mechanics} label="Mechanics" /></div></GlassCard><GlassCard className="p-6"><h3 className="text-lg font-bold mb-4 text-[var(--color-text,#E4E4E7)] flex items-center gap-2"><TargetIcon className="w-5 h-5 text-[var(--color-primary,#4F46E5)]"/> Prioritized Action Plan</h3><div className="space-y-4">{analysis.prioritized_action_plan.sort((a,b) => a.priority.localeCompare(b.priority)).map((item, index) => (<div key={index} className={`p-4 rounded-xl border-l-4 ${priorityColors[item.priority]}`}><div className="flex justify-between items-center"><h4 className="font-bold text-[var(--color-text,#E4E4E7)]">{item.title}</h4><span className={`text-xs font-mono font-bold px-2 py-1 rounded-full`}>{item.priority}</span></div><p className="text-sm text-[var(--color-text-dim,#A0A0A5)] mt-1">{item.why}</p></div>))}</div></GlassCard><FeedbackAccordion title="One-Pass Polish" icon={<SparklesIcon className="w-5 h-5 text-green-400"/>}><div className="p-4 rounded-lg bg-black/20 border border-[var(--color-border,rgba(255,255,255,0.1))]/50"><div className="flex justify-between items-start mb-2"><h5 className="font-bold text-[var(--color-text,#E4E4E7)]">Thesis + Roadmap Rewrite</h5><CopyButton textToCopy={analysis.one_pass_polish.thesis_plus_map_rewrite} /></div><p className="text-sm font-mono text-brand-accent pr-4">{analysis.one_pass_polish.thesis_plus_map_rewrite}</p></div></FeedbackAccordion></div>
);

// --- RICH TEXT EDITOR & TOOLBAR ---

const FloatingToolbar: React.FC<{ editorRef: React.RefObject<HTMLDivElement>, isVisible: boolean, position: { top: number, left: number } }> = ({ editorRef, isVisible, position }) => {
    if (!isVisible) return null;
    const execCmd = (cmd: string, value?: string) => { document.execCommand(cmd, false, value); editorRef.current?.focus(); };
    const formatBlock = (tag: string) => execCmd('formatBlock', `<${tag}>`);
    const buttons = [{ cmd: 'bold', icon: BoldIcon, tooltip: 'Bold' }, { cmd: 'italic', icon: ItalicIcon, tooltip: 'Italic' }, { cmd: 'underline', icon: UnderlineIcon, tooltip: 'Underline' }, { action: () => formatBlock('h2'), icon: Heading2Icon, tooltip: 'Heading' }, { action: () => formatBlock('blockquote'), icon: QuoteIcon, tooltip: 'Blockquote' }, { cmd: 'insertUnorderedList', icon: ListIcon, tooltip: 'Bulleted List' }];
    return (<div className="absolute z-30" style={{ top: position.top, left: position.left }}><div className="flex items-center space-x-1 bg-[var(--color-bg-end,#111)] border border-[var(--color-border,rgba(255,255,255,0.1))] rounded-lg shadow-lg px-2 py-1">{buttons.map(({ cmd, action, icon: Icon, tooltip }) => (<Tooltip key={tooltip} text={tooltip}><button onMouseDown={(e) => { e.preventDefault(); action ? action() : execCmd(cmd!); }} className="p-2 rounded-md text-[var(--color-text-dim,#A0A0A5)] hover:bg-[var(--color-surface-light,rgba(38,38,40,0.7))] hover:text-[var(--color-text,#E4E4E7)]"><Icon className="w-4 h-4" /></button></Tooltip>))}</div></div>);
};

const RichTextEditor: React.FC<{ htmlContent: string; onContentChange: (plainText: string, html: string) => void; placeholder: string; settings: any; editorContainerRef: React.RefObject<HTMLDivElement>; pulseEditor: () => void }> = ({ htmlContent, onContentChange, placeholder, settings, editorContainerRef, pulseEditor }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(false);
    const [toolbarState, setToolbarState] = useState({ isVisible: false, position: { top: 0, left: 0 } });
    const [isDragging, setIsDragging] = useState(false);
    const playTypingSound = useTypingSound();

    useEffect(() => { setIsPlaceholderVisible(htmlContent.trim() === '' || htmlContent === '<p><br></p>'); }, [htmlContent]);
    const handleInput = () => { if (editorRef.current) onContentChange(editorRef.current.innerText, editorRef.current.innerHTML); };
    
    useEffect(() => {
        const editorNode = editorRef.current;
        if (!editorNode) return;
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const container = editorContainerRef.current;
            if(!container) return;
            
            if (settings.isFocusMode) {
                editorNode.querySelectorAll('.is-focused').forEach(el => el.classList.remove('is-focused'));
                if (selection && selection.anchorNode) {
                    let parent = selection.anchorNode.parentElement;
                    while(parent && parent !== editorNode) {
                        if(['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI'].includes(parent.tagName)) {
                            parent.classList.add('is-focused');
                            break;
                        }
                        parent = parent.parentElement;
                    }
                }
            }

            if (settings.isTypewriterMode && selection && selection.rangeCount > 0) {
                 const range = selection.getRangeAt(0);
                 const rect = range.getBoundingClientRect();
                 const containerRect = container.getBoundingClientRect();
                 const scrollOffset = (rect.top - containerRect.top) - (container.clientHeight / 2) + (rect.height / 2);
                 container.scrollBy({ top: scrollOffset, behavior: 'smooth' });
            }

            if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) { setToolbarState(t => ({...t, isVisible: false})); return; }
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setToolbarState({ isVisible: true, position: { top: rect.top - 50 + window.scrollY, left: rect.left + rect.width / 2 - 100 + window.scrollX } });
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [settings.isFocusMode, settings.isTypewriterMode]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (settings.typingSound !== 'none') {
            const soundMap: {[key: string]: 'space' | 'delete'} = {' ': 'space', 'Backspace': 'delete', 'Enter': 'space'};
            playTypingSound(soundMap[e.key] || 'click');
        }
        pulseEditor();

        if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); }
        const pairs: {[key: string]: string} = { '(': ')', '[': ']', '{': '}' };
        if (pairs[e.key]) {
            e.preventDefault();
            document.execCommand('insertText', false, e.key + pairs[e.key]);
            const sel = window.getSelection();
            if(sel) sel.modify('move', 'backward', 'character');
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === "text/plain") {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                if (editorRef.current) { editorRef.current.innerHTML = `<p>${(loadEvent.target?.result as string).replace(/\n/g, '</p><p>')}</p>`; handleInput(); }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className={`relative h-full w-full flex flex-col ${settings.isFocusMode ? 'focus-mode' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <FloatingToolbar editorRef={editorRef} isVisible={toolbarState.isVisible} position={toolbarState.position} />
            {isPlaceholderVisible && <div className="absolute top-4 left-4 text-[var(--color-text-dim,#A0A0A5)] italic pointer-events-none">{placeholder}</div>}
            {isDragging && (<div className="absolute inset-0 bg-[var(--color-primary,#4F46E5)]/20 border-2 border-dashed border-[var(--color-primary,#4F46E5)] rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10"><UploadCloudIcon className="w-12 h-12 text-[var(--color-primary,#4F46E5)]" /><p className="mt-2 font-bold text-[var(--color-primary,#4F46E5)]">Drop .txt file to import</p></div>)}
            <div ref={editorRef} contentEditable onInput={handleInput} onKeyDown={handleKeyDown} dangerouslySetInnerHTML={{ __html: htmlContent }} className={`prose prose-lg max-w-none h-full p-4 focus:outline-none ${settings.fontClass}`} style={{ caretColor: 'var(--color-primary, #4F46E5)' }} spellCheck="true" />
        </div>
    );
};

const EditorToolbar: React.FC<{ wordCount: number, sentenceCount: number, settings: any, onSettingsChange: (newSettings: any) => void }> = (props) => {
    const { settings, onSettingsChange } = props;
    const SettingButton = ({ tooltip, children, onClick, isActive = false }: any) => (<Tooltip text={tooltip}><button onClick={onClick} className={`p-1.5 rounded-md ${isActive ? 'text-[var(--color-primary,#4F46E5)] bg-[var(--color-primary,#4F46E5)]/20' : 'text-[var(--color-text-dim,#A0A0A5)]'} hover:bg-[var(--color-surface-light,rgba(38,38,40,0.7))]`}>{children}</button></Tooltip>);

    return (
        <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-center text-xs border-t border-[var(--color-border,rgba(255,255,255,0.1))] bg-[var(--color-surface,rgba(28,28,30,0.5))]">
            <div className="flex items-center gap-1">
                <SettingButton tooltip={settings.isZen ? "Exit Zen" : "Zen Mode"} isActive={settings.isZen} onClick={() => onSettingsChange({ ...settings, isZen: !settings.isZen })}>{settings.isZen ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}</SettingButton>
                <div className="w-px h-5 bg-[var(--color-border,rgba(255,255,255,0.1))] mx-1"></div>
                <SettingButton tooltip="Theme" onClick={() => onSettingsChange({ ...settings, theme: themes[(themes.findIndex(t => t.name === settings.theme) + 1) % themes.length].name })}>{settings.theme === 'paper' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}</SettingButton>
                <SettingButton tooltip="Font Style" onClick={() => onSettingsChange({ ...settings, font: fonts[(fonts.findIndex(f => f.className === settings.font) + 1) % fonts.length].className })}><TypeIcon className="w-4 h-4" /></SettingButton>
                 <SettingButton tooltip="Focus Mode" isActive={settings.isFocusMode} onClick={() => onSettingsChange({ ...settings, isFocusMode: !settings.isFocusMode })}><FocusIcon className="w-4 h-4" /></SettingButton>
                <SettingButton tooltip="Typewriter Mode" isActive={settings.isTypewriterMode} onClick={() => onSettingsChange({ ...settings, isTypewriterMode: !settings.isTypewriterMode })}><TypewriterIcon className="w-4 h-4" /></SettingButton>
                <SettingButton tooltip="Typing Sounds" isActive={settings.typingSound !== 'none'} onClick={() => onSettingsChange({ ...settings, typingSound: settings.typingSound === 'none' ? 'click' : 'none' })}>{settings.typingSound !== 'none' ? <SoundOnIcon className="w-4 h-4" /> : <SoundOffIcon className="w-4 h-4" />}</SettingButton>
                 <div className="w-px h-5 bg-[var(--color-border,rgba(255,255,255,0.1))] mx-1"></div>
                 <SettingButton tooltip="Decrease Font Size" onClick={() => onSettingsChange({ ...settings, fontSize: Math.max(12, settings.fontSize - 1) })}><FontSizeIcon className="w-4 h-4" /></SettingButton>
                 <span className="font-mono w-6 text-center">{settings.fontSize}</span>
                 <SettingButton tooltip="Increase Font Size" onClick={() => onSettingsChange({ ...settings, fontSize: Math.min(24, settings.fontSize + 1) })}><FontSizeIcon className="w-5 h-5" /></SettingButton>
                 <div className="w-px h-5 bg-[var(--color-border,rgba(255,255,255,0.1))] mx-1"></div>
                 <SettingButton tooltip="Decrease Line Height" onClick={() => onSettingsChange({ ...settings, lineHeight: Math.max(1.2, settings.lineHeight - 0.1) })}><LineHeightIcon className="w-4 h-4" /></SettingButton>
                 <span className="font-mono w-8 text-center">{settings.lineHeight.toFixed(1)}</span>
                 <SettingButton tooltip="Increase Line Height" onClick={() => onSettingsChange({ ...settings, lineHeight: Math.min(2.0, settings.lineHeight + 0.1) })}><LineHeightIcon className="w-5 h-5" /></SettingButton>
            </div>
            <div className="font-mono">{props.wordCount} words / {props.sentenceCount} sentences</div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [htmlContent, setHtmlContent] = useState<string>(localStorage.getItem('bq_draft') || sampleEssays[0].text.replace(/\n/g, '<br>'));
    const [plainText, setPlainText] = useState<string>('');
    const [inputs, setInputs] = useState<Omit<EssayInputs, 'ultra' | 'essay_text'>>({ prompt: '', rubric: '', style_target: 'AP Lang 9/9', constraints: '' });
    const [isUltra, setIsUltra] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [editorSettings, setEditorSettings] = useState({
        isZen: false,
        theme: localStorage.getItem('bq_theme') || 'dark',
        font: localStorage.getItem('bq_font') || 'font-sans',
        fontSize: parseInt(localStorage.getItem('bq_fs') || '18'),
        lineHeight: parseFloat(localStorage.getItem('bq_lh') || '1.6'),
        isFocusMode: false,
        isTypewriterMode: false,
        typingSound: 'none',
    });
    const editorCardRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const [loadingMessage, setLoadingMessage] = useState("BlackQuill is thinking...");

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isLoading) {
            const messages = [
                "Analyzing argument structure...",
                "Stress-testing the thesis...",
                "Scanning for grammatical weak points...",
                "Crafting sentence-level improvements...",
                "Checking for thematic depth...",
                "Polishing prose and style...",
                "Assembling the action plan..."
            ];
            let i = 0;
            setLoadingMessage(messages[i]);
            interval = setInterval(() => {
                i = (i + 1) % messages.length;
                setLoadingMessage(messages[i]);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--editor-font-size', `${editorSettings.fontSize}px`);
        root.style.setProperty('--editor-line-height', `${editorSettings.lineHeight}`);
        document.body.className = `font-sans antialiased ${themes.find(t => t.name === editorSettings.theme)?.className || ''}`;
        localStorage.setItem('bq_theme', editorSettings.theme);
        localStorage.setItem('bq_font', editorSettings.font);
        localStorage.setItem('bq_fs', String(editorSettings.fontSize));
        localStorage.setItem('bq_lh', String(editorSettings.lineHeight));
    }, [editorSettings.theme, editorSettings.font, editorSettings.fontSize, editorSettings.lineHeight]);
    
    useEffect(() => { const handler = setTimeout(() => localStorage.setItem('bq_draft', htmlContent), 1000); return () => clearTimeout(handler); }, [htmlContent]);
    useEffect(() => { if(analysis) setAnalysis(null); }, [htmlContent, inputs, isUltra]);

    const handleContentChange = useCallback((text: string, html: string) => { setPlainText(text); setHtmlContent(html); }, []);
    const handleAnalyze = useCallback(async () => {
        if (!plainText.trim()) { setError("Essay text cannot be empty."); return; }
        setIsLoading(true); setError(null); setAnalysis(null);
        try {
            const result = await getEssayCritique({ ...inputs, essay_text: plainText, ultra: isUltra });
            setAnalysis(result);
            if(editorSettings.isZen) setEditorSettings(s => ({...s, isZen: false}));
        } catch (err) { setError(err instanceof Error ? err.message : "An unknown error occurred."); } 
        finally { setIsLoading(false); }
    }, [inputs, isUltra, plainText, editorSettings.isZen]);

    const { wordCount, sentenceCount } = useMemo(() => {
        const words = plainText.trim().split(/\s+/).filter(Boolean).length;
        const sentences = plainText.match(/[^.!?]+[.!?]+/g)?.length || (words > 0 ? 1 : 0);
        return { wordCount: words, sentenceCount: sentences };
    }, [plainText]);

    const loadSample = (index: number) => { handleContentChange(sampleEssays[index].text, sampleEssays[index].text.replace(/\n/g, '<br>')); setAnalysis(null); setError(null); };
    
    const pulseEditor = useCallback(() => {
        const card = editorCardRef.current;
        if (card) {
            card.classList.remove('editor-pulse');
            void card.offsetWidth; // Trigger reflow
            card.classList.add('editor-pulse');
            setTimeout(() => card.classList.remove('editor-pulse'), 200);
        }
    }, []);

    const zenClasses = editorSettings.isZen ? 'fixed inset-0 z-40' : 'relative h-[75vh]';

    return (<><Header /><main className={`container mx-auto px-4 sm:px-6 pt-24 pb-12 transition-all duration-300 ${editorSettings.isZen ? 'max-w-none px-0' : ''}`}><div className={`grid grid-cols-1 ${analysis ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>{/* --- EDITOR PANE --- */}<div className={`${zenClasses} flex flex-col`}><GlassCard cardRef={editorCardRef} className={`flex-grow flex flex-col transition-all duration-300 ${editorSettings.isZen ? 'rounded-none border-none' : ''}`}><div ref={editorContainerRef} className="flex-grow overflow-y-auto scroll-smooth"><RichTextEditor htmlContent={htmlContent} onContentChange={handleContentChange} placeholder="Paste or drag your essay here..." settings={{ fontClass: editorSettings.font, isFocusMode: editorSettings.isFocusMode, isTypewriterMode: editorSettings.isTypewriterMode, typingSound: editorSettings.typingSound }} editorContainerRef={editorContainerRef} pulseEditor={pulseEditor}/></div><EditorToolbar wordCount={wordCount} sentenceCount={sentenceCount} settings={editorSettings} onSettingsChange={setEditorSettings}/></GlassCard></div>{/* --- CONTROLS & ANALYSIS PANE --- */}<div className={`${editorSettings.isZen ? 'hidden' : 'block'}`}>{isLoading ? (<GlassCard className="h-full flex flex-col items-center justify-center p-8"><svg className="animate-spin h-12 w-12 text-[var(--color-primary,#4F46E5)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="text-[var(--color-text-dim,#A0A0A5)] mt-4 text-center fade-in" key={loadingMessage}>{loadingMessage}</p></GlassCard>) : error ? (<GlassCard className="p-4 flex items-center gap-3 text-red-400 border-red-500/50"><AlertTriangleIcon className="w-5 h-5"/><p>{error}</p></GlassCard>) : analysis ? (<div className="h-[75vh] overflow-y-auto pr-2"><AnalysisDashboard analysis={analysis} /></div>) : (<GlassCard className="p-6 h-full flex flex-col"><h2 className="text-lg font-bold text-[var(--color-text,#E4E4E7)] mb-4">Parameters</h2><div className="space-y-4 flex-grow"><input name="style_target" value={inputs.style_target} onChange={(e) => setInputs(p => ({...p, style_target: e.target.value}))} placeholder="e.g., AP Lang 9/9" className="w-full p-3 bg-black/20 rounded-lg border border-[var(--color-border-focus,rgba(255,255,255,0.2))] focus:ring-2 focus:ring-[var(--color-primary,#4F46E5)] focus:outline-none transition-all" /><textarea name="prompt" value={inputs.prompt} onChange={(e) => setInputs(p => ({...p, prompt: e.target.value}))} placeholder="Optional: Paste the assignment prompt..." className="w-full h-24 p-3 bg-black/20 rounded-lg border border-[var(--color-border-focus,rgba(255,255,255,0.2))] focus:ring-2 focus:ring-[var(--color-primary,#4F46E5)] focus:outline-none transition-all resize-y" /><div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-[var(--color-border-focus,rgba(255,255,255,0.2))]"><label htmlFor="ultra-toggle" className="font-medium flex items-center gap-2 cursor-pointer text-[var(--color-text,#E4E4E7)]"><SparklesIcon className="w-5 h-5 text-purple-400" /> Ultra Mode</label><button id="ultra-toggle" onClick={() => setIsUltra(!isUltra)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isUltra ? 'bg-[var(--color-primary,#4F46E5)]' : 'bg-gray-600'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUltra ? 'translate-x-6' : 'translate-x-1'}`} /></button></div><div><label className="block text-sm font-medium text-[var(--color-text-dim,#A0A0A5)] mb-1.5">Load a Sample</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{sampleEssays.map((sample, index) => (<button key={index} onClick={() => loadSample(index)} className="text-left p-2 rounded-md bg-[var(--color-surface,rgba(28,28,30,0.5))] hover:bg-[var(--color-surface-light,rgba(38,38,40,0.7))] border border-transparent hover:border-[var(--color-border,rgba(255,255,255,0.1))] transition-all"><p className="text-sm font-semibold text-[var(--color-text,#E4E4E7)] truncate">{sample.title}</p></button>))}</div></div></div><button onClick={handleAnalyze} disabled={isLoading || !plainText.trim()} className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary,#4F46E5)] hover:bg-[var(--color-primary-hover,#6366F1)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all mt-4">{isLoading ? 'Analyzing...' : 'Critique Essay'}</button></GlassCard>)}</div></div></main></>);
};

export default App;
