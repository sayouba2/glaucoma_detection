import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, FileText, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function DoctorChat({ analysisResult, imageUrl }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    // Au démarrage, on initialise avec un message système caché ou une intro
    useEffect(() => {
        if (analysisResult) {
            setMessages([{
                role: 'assistant',
                content: `**Mode Expert Activé.**\nJ'ai analysé l'image. ${analysisResult.prediction_class === 1 ? 'Risque de glaucome détecté' : 'Fond d\'œil apparemment sain'}. Je suis prêt à rédiger le rapport ou approfondir l'analyse.`
            }]);
        }
    }, [analysisResult]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // src/components/DoctorChat.jsx

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

        // ⚠️ CORRECTION ICI : On crée une version "légère" du résultat pour l'IA
        if (analysisResult) {
            // On exclut 'gradcamImage' et 'image_url' s'ils sont trop longs (base64)
            const { gradcamImage, image_url, ...cleanResult } = analysisResult;

            // On envoie uniquement les données textuelles (id, confidence, hasGlaucoma, etc.)
            const contextStr = `Données techniques: ${JSON.stringify(cleanResult)}`;
            formData.append('analysis_context', contextStr);
        }

        // Historique
        // On s'assure aussi de ne pas renvoyer d'images dans l'historique
        const cleanHistory = messages.map(m => ({
            role: m.role,
            content: m.content.substring(0, 1000) // Sécurité : on tronque les messages trop longs si jamais
        }));
        formData.append('history', JSON.stringify(cleanHistory));

        // Placeholder réponse
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch(`${API_URL}/chat`, { method: 'POST', body: formData });

            // Si erreur 429 (Quota dépassé), on l'affiche proprement
            if (response.status === 429) {
                throw new Error("Trop de demandes (Quota OpenAI dépassé). Attendez une minute.");
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
                newMsgs[newMsgs.length - 1].content = `⚠️ Erreur : ${e.message}`;
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
                    <span className="font-semibold text-sm">Assistant Clinique IA</span>
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

            {/* Actions Rapides pour Médecin */}
            <div className="px-4 py-2 bg-slate-100 flex gap-2 overflow-x-auto">
                <button
                    onClick={() => sendMessage("Rédige une observation clinique pour le rapport.")}
                    className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full hover:bg-blue-50 text-slate-700 whitespace-nowrap flex items-center gap-1"
                >
                    <FileText size={12}/> Rédiger Observation
                </button>
                <button
                    onClick={() => sendMessage("Quels sont les diagnostics différentiels possibles ?")}
                    className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full hover:bg-blue-50 text-slate-700 whitespace-nowrap"
                >
                    Diagnostics Diff.
                </button>
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                    className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Instructions pour l'assistant..."
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