import { jsPDF } from "jspdf";

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

    // --- EN-TÊTE CLINIQUE ---
    doc.setFillColor(248, 250, 252); // Gris très clair
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(30, 58, 138); // Bleu foncé professionnel
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(data.clinicName || "Clinique Ophtalmologique", 20, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Dr. ${data.doctorName || "Médecin Traitant"}`, 20, 22);
    doc.text(`Date du rapport : ${new Date().toLocaleDateString()}`, 20, 27);

    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text("COMPTE-RENDU D'EXAMEN", pageWidth - 20, 25, { align: "right" });

    // --- INFO PATIENT ---
    doc.setDrawColor(200);
    doc.line(20, 45, pageWidth - 20, 45);

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`Patient : ${data.patientName}`, 20, 55);
    doc.text(`ID : #${data.patientId}`, 100, 55);
    doc.text(`Âge : ${data.patientAge} ans`, 160, 55);
    doc.text(`Sexe : ${data.patientGender}`, pageWidth - 20, 55, { align: "right" });

    // --- IMAGE & TECHNIQUE ---
    let yPos = 70;
    if (imageUrl) {
        try {
            doc.text("Imagerie Rétinienne :", 20, yPos);
            const base64Original = await getImageData(imageUrl);
            // Image carrée à gauche
            doc.addImage(base64Original, 'JPEG', 20, yPos + 5, 50, 50);

            // Détails techniques à droite de l'image
            doc.setFontSize(10);
            doc.text(`• Œil examiné : ${data.eyeSide || "Non spécifié"}`, 80, yPos + 10);
            doc.text(`• Qualité image : ${data.imageQuality || "Bonne"}`, 80, yPos + 18);
            doc.text(`• Analyse IA : ${data.aiResult}`, 80, yPos + 26);
            doc.text(`• Confiance : ${data.aiConfidence}%`, 80, yPos + 34);

            yPos += 65;
        } catch (err) {
            console.error(err);
        }
    }

    // --- OBSERVATIONS CLINIQUES (Le cœur du rapport) ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("OBSERVATIONS CLINIQUES", 20, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    yPos += 7;

    // Gestion du texte long (Observation)
    const splitObservations = doc.splitTextToSize(data.observations || "Aucune observation particulière.", pageWidth - 40);
    doc.text(splitObservations, 20, yPos);
    yPos += splitObservations.length * 5 + 10;

    // --- DIAGNOSTIC & CONCLUSION ---
    doc.setFillColor(240, 249, 255); // Fond bleu très léger
    doc.rect(15, yPos, pageWidth - 30, 25, 'F');

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("CONCLUSION / DIAGNOSTIC :", 20, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(data.diagnosis || "À définir", 20, yPos + 18);

    yPos += 35;

    // --- CONDUITE À TENIR (Recommandations) ---
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CONDUITE À TENIR :", 20, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    yPos += 7;

    if (data.recommendations && data.recommendations.length > 0) {
        data.recommendations.forEach(rec => {
            doc.text(`• ${rec}`, 25, yPos);
            yPos += 6;
        });
    } else {
        doc.text("• Voir recommandations habituelles.", 25, yPos);
    }

    // --- FOOTER / SIGNATURE ---
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(10);
    doc.text("Signature du Médecin :", pageWidth - 60, pageHeight - 40);
    // Ligne de signature
    doc.line(pageWidth - 60, pageHeight - 25, pageWidth - 20, pageHeight - 25);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Rapport généré par GlaucomaAI - Aide au diagnostic.", 20, pageHeight - 10);

    doc.save(`CR_${data.patientName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};