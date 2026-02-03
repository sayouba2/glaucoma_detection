import jsPDF from 'jspdf';
import QRCode from 'qrcode';
// ✅ 1. Import de la police
import { amiriFontBase64 } from './AmiriFont';

// ✅ Signature mise à jour pour accepter gradcamImage
export const generateGlaucomaReport = async (data, imageUrl, gradcamImage, t) => {
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

    if (isArabic) {
        doc.text(`${data.patientName} : ${t('dashboard.table_name')}`, pageWidth - 20, yPos, { align: 'right' });
        doc.text(`${data.patientAge} ${t('common.years')} : ${t('dashboard.table_age')}`, pageWidth - 80, yPos, { align: 'right' });
    } else {
        doc.text(`${t('dashboard.table_name')} : ${data.patientName}`, 20, yPos);
        doc.text(`${t('dashboard.table_age')} : ${data.patientAge} ${t('common.years')}`, 100, yPos);
        doc.text(`${t('dashboard.table_gender')} : ${data.patientGender === 'M' ? t('dashboard.gender_m') : t('dashboard.gender_f')}`, 160, yPos);
    }

    if (isArabic) {
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
            // Image originale
            doc.addImage(imageUrl, 'JPEG', 20, yPos, 50, 50);

            // ✅ Insertion GradCAM
            if (gradcamImage) {
                try {
                    // Positionné à x=80 (à droite de l'image originale)
                    doc.addImage(gradcamImage, 'PNG', 80, yPos, 50, 50);
                } catch (e) {
                    try { doc.addImage(gradcamImage, 'JPEG', 80, yPos, 50, 50); } catch(_) {}
                }
            }

            // Calcul de la position du texte (si GradCAM existe, on déplace le texte à droite pour ne pas écrire dessus)
            // 20 (img1) + 50 (width) + 10 (gap) + 50 (img2 width) + 10 (gap) = 140
            const textXPos = gradcamImage ? 140 : 80;

            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text(`${t('report.eye_examined')} : ${data.eyeSide}`, textXPos, yPos + 10);
            doc.text(`${t('report.image_quality')} : ${data.imageQuality}`, textXPos, yPos + 20);

            doc.text(`${t('report.ai_analysis')} :`, textXPos, yPos + 35);
            doc.setFontSize(12);
            if (data.aiResult.includes(t('upload.glaucoma_detected'))) {
                doc.setTextColor(220, 53, 69);
            } else {
                doc.setTextColor(40, 167, 69);
            }
            doc.text(`${data.aiResult} (${data.aiConfidence}%)`, textXPos, yPos + 42);

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
    const footerY = pageHeight - 40;

    doc.setDrawColor(200);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    try {
        const qrData = JSON.stringify({
            doc: data.doctorName,
            patient: data.patientName,
            date: new Date().toLocaleDateString(),
            result: data.aiResult,
            id: data.patientId
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
        doc.addImage(qrCodeUrl, 'PNG', pageWidth - 50, footerY, 30, 30);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(t('report.signature'), pageWidth - 55, footerY + 10, { align: 'right' });
        doc.text(`Dr. ${data.doctorName}`, pageWidth - 55, footerY + 15, { align: 'right' });
        doc.text(t('report.digital_validation'), pageWidth - 55, footerY + 20, { align: 'right' });

    } catch (err) {
        console.error("Erreur QR Code", err);
    }

    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text(`${t('report.generated_by')} - ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`Rapport_${data.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};