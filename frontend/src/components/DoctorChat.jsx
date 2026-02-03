import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next'; // ✅ Import du hook
import { Send, Bot, FileText, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function DoctorChat({ analysisResult, imageUrl }) {
    // ✅ CORRECTION 1 : On récupère 'i18n' pour avoir la langue actuelle
    const { t, i18n } = useTranslation();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    // Initialisation du message de bienvenue traduit
    useEffect(() => {
        if (analysisResult) {
            const statusText = analysisResult.prediction_class === 1
                ? t('upload.glaucoma_detected')
                : t('upload.healthy_retina');

            setMessages([{
                role: 'assistant',
                content: `**${t('chat.welcome_expert')}**\n${t('chat.intro_analysis')} ${statusText}. ${t('chat.intro_ready')}`
            }]);
        }
    }, [analysisResult, t]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sendMessage = async (textOverride = null) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        // Ajout message utilisateur
        const newMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setIsTyping(true);

        // Préparation des données
        const formData = new FormData();
        formData.append('message', textToSend);

        if (analysisResult) {
            const { gradcamImage, image_url, ...cleanResult } = analysisResult;
            const contextStr = `Données techniques: ${JSON.stringify(cleanResult)}`;
            formData.append('analysis_context', contextStr);
        }

        const cleanHistory = messages.map(m => ({
            role: m.role,
            content: m.content.substring(0, 1000)
        }));
        formData.append('history', JSON.stringify(cleanHistory));

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                body: formData,
                // ✅ CORRECTION 2 : On envoie la langue active au Backend
                // C'est ce qui force l'IA à parler Arabe/Espagnol/etc.
                headers: {
                    'Accept-Language': i18n.language
                }
            });

            if (response.status === 429) {
                throw new Error(t('chat.error_quota'));
            }

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
        } catch (e) {
            console.error(e);
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = `⚠️ ${t('chat.error_generic')}: ${e.message}`;
                return newMsgs;
            });
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-blue-400" />
                    <span className="font-semibold text-sm">{t('chat.assistant_name')}</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-3 rounded-lg text-sm ${
                            m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                        }`}>
                            <div className="markdown-body">
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            {/* Actions Rapides */}
            <div className="px-4 py-2 bg-slate-100 flex gap-2 overflow-x-auto">
                <button
                    onClick={() => sendMessage(t('chat.prompt_obs'))}
                    className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full hover:bg-blue-50 text-slate-700 whitespace-nowrap flex items-center gap-1"
                >
                    <FileText size={12}/> {t('chat.quick_obs')}
                </button>
                <button
                    onClick={() => sendMessage(t('chat.prompt_diff'))}
                    className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full hover:bg-blue-50 text-slate-700 whitespace-nowrap"
                >
                    {t('chat.quick_diff')}
                </button>
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                    className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('chat.input_placeholder')}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                    onClick={() => sendMessage()}
                    disabled={isTyping || !input}
                    className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                    {isTyping ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                </button>
            </div>
        </div>
    );
}