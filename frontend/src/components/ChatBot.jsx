import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Loader2, Bot, HelpCircle } from 'lucide-react'; // J'ai remplacé Bot par HelpCircle pour différencier

// ✅ On pointe vers la nouvelle route
const API_URL = 'http://localhost:8000/chat/guide';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    // ✅ Message d'accueil orienté "Aide"
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Bonjour Docteur. Je suis votre guide. Une question sur le fonctionnement de l\'application ? (ex: "Comment créer un patient ?")' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const userMsg = { role: 'user', content: inputText };

        // On garde l'historique propre
        const historyClean = messages.map(m => ({ role: m.role, content: m.content }));

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        const formData = new FormData();
        formData.append('message', inputText);
        formData.append('history', JSON.stringify(historyClean));
        // ❌ Plus d'envoi de fichier ici, c'est juste du support textuel

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.body) throw new Error("Pas de réponse");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                aiText += decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = aiText;
                    return newMsgs;
                });
            }

        } catch (err) {
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = "⚠️ Je rencontre un problème technique.";
                return newMsgs;
            });
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">

            {isOpen && (
                <div className="bg-white w-80 md:w-96 h-[450px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">

                    {/* Header Orange/Bleu pour différencier du chat médical */}
                    <div className="bg-slate-800 p-4 flex justify-between items-center text-white shadow-md z-10">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <HelpCircle size={20} />
                            </div>
                            <div>
                                <span className="font-bold block text-sm">Guide d'utilisation</span>
                                <span className="text-xs text-slate-300">Support GlaucomaAI</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-slate-700 p-1 rounded transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-2 flex-shrink-0 text-slate-600">
                                        <HelpCircle size={16}/>
                                    </div>
                                )}

                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                                    msg.role === 'user'
                                        ? 'bg-slate-800 text-white rounded-br-none'
                                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                }`}>
                                    <div className="markdown-body">
                                        <ReactMarkdown components={{
                                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                            strong: ({node, ...props}) => <span className="font-bold text-slate-900" {...props} />
                                        }}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area Simplifiée (Pas de trombone) */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Comment faire pour..."
                            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none transition-all placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!inputText || isTyping}
                            className="p-2.5 bg-slate-800 text-white rounded-full hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95 shadow-md"
                        >
                            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}

            {/* Bouton FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'bg-red-500 rotate-90' : 'bg-slate-800 hover:bg-slate-900'} 
        text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center`}
                title="Aide & Support"
            >
                {isOpen ? <X size={24} /> : <HelpCircle size={24} />}
            </button>
        </div>
    );
};

export default ChatBot;