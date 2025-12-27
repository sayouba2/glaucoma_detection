import jsPDF from 'jspdf';
import QRCode from 'qrcode';
// ✅ 1. Import de la police
import { amiriFontBase64 } from './AmiriFont';

export const generateGlaucomaReport = async (data, imageUrl, t) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ✅ 2. ENREGISTREMENT DE LA POLICE ARABE
    // On ajoute le fichier virtuel
    doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
    // On ajoute la police au système
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    // On active la police pour tout le document
    doc.setFont("Amiri");

    // --- PETITE ASTUCE POUR L'ARABE (RTL) ---
    // Si le titre contient des caractères arabes, on considère que c'est un doc arabe
    const isArabic = /[\u0600-\u06FF]/.test(t('report.doc_title'));

    // Fonction helper pour aligner le texte correctement selon la langue
    const alignText = (text, x, y, align = 'left') => {
        // Si c'est de l'arabe, jsPDF a parfois besoin d'aide.
        // Mais avec la police Amiri, l'affichage devrait être correct.
        // Si tu veux inverser l'alignement pour l'arabe (droite au lieu de gauche):
        if (isArabic && align === 'left') align = 'right';
        if (isArabic && align === 'right') align = 'left';

        // Note: Pour un support RTL parfait (lettres attachées), jsPDF est parfois capricieux.
        // La police Amiri résout les caractères bizarres. Si les lettres sont détachées,
        // il faudra inverser le texte, mais commençons déjà par afficher les bons caractères.
        doc.text(text, x, y, { align: align });
    };

    // --- 1. EN-TÊTE ---
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    // Utilise "Amiri"
    doc.text(t('report.doc_title'), isArabic ? pageWidth - 20 : 20, 20, { align: isArabic ? 'right' : 'left' });

    doc.setFontSize(10);
    doc.setTextColor(100);

    // Pour l'arabe, on inverse souvent la position X
    const leftX = isArabic ? pageWidth - 20 : 20;
    const rightX = isArabic ? 20 : pageWidth - 20;
    const alignL = isArabic ? 'right' : 'left';
    const alignR = isArabic ? 'left' : 'right';

    doc.text(`${t('report.date_label')} ${new Date().toLocaleDateString()}`, leftX, 28, { align: alignL });
    doc.text(`${t('report.folder_id')} : #${data.patientId}`, leftX, 33, { align: alignL });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(data.clinicName, rightX, 20, { align: alignR });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dr. ${data.doctorName}`, rightX, 26, { align: alignR });

    doc.setDrawColor(200);
    doc.line(20, 40, pageWidth - 20, 40);

    // --- 2. INFORMATION PATIENT ---
    let yPos = 55;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(t('report.patient_section'), leftX, yPos, { align: alignL });

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(80);

    // En arabe, on aligne tout à droite
    if (isArabic) {
        doc.text(`${data.patientName} : ${t('dashboard.table_name')}`, pageWidth - 20, yPos, { align: 'right' });
        doc.text(`${data.patientAge} ${t('common.years')} : ${t('dashboard.table_age')}`, pageWidth - 80, yPos, { align: 'right' });
        // ... adapter les positions X pour l'arabe est fastidieux manuellement
        // Pour faire simple, on garde la structure gauche-droite mais avec la bonne police
        // Si tu veux un VRAI mode miroir, c'est beaucoup de calculs X.
        // Ici, on s'assure juste que les CARACTÈRES s'affichent.
    } else {
        doc.text(`${t('dashboard.table_name')} : ${data.patientName}`, 20, yPos);
        doc.text(`${t('dashboard.table_age')} : ${data.patientAge} ${t('common.years')}`, 100, yPos);
        doc.text(`${t('dashboard.table_gender')} : ${data.patientGender === 'M' ? t('dashboard.gender_m') : t('dashboard.gender_f')}`, 160, yPos);
    }

    // NOTE : J'ai remis le code standard ci-dessous, car la priorité est d'afficher les caractères.
    // La police "Amiri" va corriger les carrés.
    if (isArabic) {
        // Fallback simple pour l'arabe : on écrit tout, jsPDF avec Amiri va afficher les lettres.
        // Si les lettres sont inversées (gauche à droite), c'est un autre souci technique de jsPDF
        // mais les "caractères bizarres" seront partis.
        doc.text(`${t('dashboard.table_name')} : ${data.patientName}`, 180, yPos, {align:'right'});
    }
    // --- 3. IMAGE & DONNÉES TECHNIQUES ---
    yPos += 20;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(t('report.tech_section'), 20, yPos);

    yPos += 10;
    if (imageUrl) {
        try {
            doc.addImage(imageUrl, 'JPEG', 20, yPos, 50, 50);

            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text(`${t('report.eye_examined')} : ${data.eyeSide}`, 80, yPos + 10);
            doc.text(`${t('report.image_quality')} : ${data.imageQuality}`, 80, yPos + 20);

            doc.text(`${t('report.ai_analysis')} :`, 80, yPos + 35);
            doc.setFontSize(12);
            if (data.aiResult.includes(t('upload.glaucoma_detected'))) {
                doc.setTextColor(220, 53, 69);
            } else {
                doc.setTextColor(40, 167, 69);
            }
            doc.text(`${data.aiResult} (${data.aiConfidence}%)`, 80, yPos + 42);

            yPos += 60;
        } catch (e) {
            console.error("Erreur image PDF", e);
        }
    }

    // --- 4. OBSERVATIONS ---
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(t('report.observations'), 20, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const obsLines = doc.splitTextToSize(data.observations, pageWidth - 40);
    doc.text(obsLines, 20, yPos);

    yPos += (obsLines.length * 5) + 10;

    // --- 5. DIAGNOSTIC ---
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(t('report.diagnosis'), 20, yPos);

    yPos += 7;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(data.diagnosis, 20, yPos);
    doc.setFont(undefined, 'normal');

    // --- 6. RECOMMANDATIONS ---
    yPos += 20;
    doc.setFillColor(240, 248, 255);
    doc.rect(20, yPos - 5, pageWidth - 40, (data.recommendations.length * 7) + 15, 'F');

    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text(t('report.recommendations'), 25, yPos + 2);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0);

    data.recommendations.forEach((rec) => {
        doc.text(`• ${rec}`, 30, yPos);
        yPos += 7;
    });

    // --- 7. PIED DE PAGE & SIGNATURE QR ---
    // On fixe la position en bas de page (par exemple à 40 unités du bas)
    const footerY = pageHeight - 40;

    doc.setDrawColor(200);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    // GÉNÉRATION DU QR CODE
    try {
        // Données à encoder dans le QR
        const qrData = JSON.stringify({
            doc: data.doctorName,
            patient: data.patientName,
            date: new Date().toLocaleDateString(),
            result: data.aiResult,
            id: data.patientId
        });

        // Création de l'image QR
        const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });

        // Affichage du QR à droite
        doc.addImage(qrCodeUrl, 'PNG', pageWidth - 50, footerY, 30, 30);

        // Texte explicatif à côté
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(t('report.signature'), pageWidth - 55, footerY + 10, { align: 'right' }); // "Signature"
        doc.text(`Dr. ${data.doctorName}`, pageWidth - 55, footerY + 15, { align: 'right' });
        doc.text(t('report.digital_validation'), pageWidth - 55, footerY + 20, { align: 'right' });

    } catch (err) {
        console.error("Erreur QR Code", err);
    }

    // Copyright centré tout en bas
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text(`${t('report.generated_by')} - ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Sauvegarde
    doc.save(`Rapport_${data.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};