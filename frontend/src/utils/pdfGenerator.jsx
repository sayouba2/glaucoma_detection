// src/utils/pdfGenerator.js
import { jsPDF } from "jspdf";

// Fonction helper pour convertir l'image en Base64
const getImageData = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = (error) => reject(error);
        img.src = url;
    });
};

export const generateGlaucomaReport = async (data, imageUrl) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- EN-TÊTE ---
    doc.setFillColor(41, 128, 185); // Bleu médical
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Rapport d'Analyse - Glaucome IA", 105, 20, { align: "center" });

    doc.setFontSize(12);
    // On utilise la date fournie ou la date du jour
    const dateStr = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Date : ${dateStr} - ID: ${data.id || Math.floor(Math.random() * 10000)}`, 105, 30, { align: "center" });

    // --- RÉSULTATS ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Résultat de l'analyse :", 20, 55);

    const confidencePercent = (data.confidence * 100).toFixed(1);

    doc.setFontSize(18);
    if (data.hasGlaucoma) {
        doc.setTextColor(231, 76, 60); // Rouge
        doc.text(`⚠️ RISQUE DÉTECTÉ (${confidencePercent}%)`, 20, 65);
    } else {
        doc.setTextColor(39, 174, 96); // Vert
        doc.text(`✅ AUCUNE ANOMALIE DÉTECTÉE (${confidencePercent}%)`, 20, 65);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    const message = data.hasGlaucoma ? "Signes de glaucome détectés par l'IA" : "L'analyse ne révèle pas de signes évidents";
    doc.text(`Message : ${message}`, 20, 75);

    // --- IMAGES ---
    if (imageUrl) {
        try {
            doc.text("Image analysée :", 20, 95);
            const base64Original = await getImageData(imageUrl);
            doc.addImage(base64Original, 'JPEG', 20, 100, 70, 70);
            doc.setFontSize(10);
            doc.text("Fond d'œil", 55, 175, { align: "center" });
        } catch (err) {
            console.error("Impossible d'ajouter l'image au PDF (peut-être expirée ?)", err);
            doc.text("(Image non disponible ou expirée)", 20, 110);
        }
    }

    // --- RECOMMANDATIONS (Générées dynamiquement) ---
    const recommendations = data.hasGlaucoma
        ? [
            "Consulter un ophtalmologue dans les plus brefs délais",
            "Effectuer un examen complet (fond d'œil, OCT)",
            "Vérifier la pression intraoculaire"
        ]
        : [
            "Aucune anomalie détectée pour le moment",
            "Continuer les visites de contrôle annuelles",
            "Surveiller l'apparition de troubles visuels"
        ];

    doc.setFontSize(14);
    doc.text("Recommandations :", 20, 195);

    doc.setFontSize(11);
    let yPos = 205;
    recommendations.forEach((rec) => {
        doc.text(`• ${rec}`, 25, yPos);
        yPos += 8;
    });

    // --- FOOTER ---
    doc.setTextColor(150);
    doc.setFontSize(10);
    const disclaimer = "AVERTISSEMENT : Ce document est généré par une intelligence artificielle à titre indicatif. Il ne remplace PAS un diagnostic médical réalisé par un professionnel de santé.";
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
    doc.text(splitDisclaimer, 20, 270);

    // Nom du fichier
    doc.save(`Rapport_Glaucome_${data.id || 'scan'}.pdf`);
};