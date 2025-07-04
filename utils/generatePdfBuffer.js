import PDFDocument from 'pdfkit'
import path from 'path'

const generatePdfBuffer = (data, startDate = null, endDate = null, groupBy = 'locality') => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = []

        try {
            const fontPath = path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', 'DejaVuSans.ttf')
            doc.registerFont('DejaVu', fontPath)
            doc.font('DejaVu')
        } catch (err) {
            console.warn('Could not load DejaVu font, using default font')
        } const garbageStatusPerZone = {};
        data.forEach(report => {
            const zone = report[groupBy] || 'Unknown';
            if (!garbageStatusPerZone[zone]) {
                garbageStatusPerZone[zone] = {
                    [groupBy]: zone,
                    reportsCount: 0,
                    totalSeverity: 0,
                };
            }
            garbageStatusPerZone[zone].reportsCount += 1;
            garbageStatusPerZone[zone].totalSeverity += parseInt(report.severity) || 0;
        });

        const garbageStatusSorted = Object.values(garbageStatusPerZone).sort((a, b) => (b.reportsCount + parseInt(b.totalSeverity)) - (a.reportsCount + parseInt(a.totalSeverity))); if (data.length === 0) {
            doc.fontSize(16).text('No reports available for the selected criteria', { align: 'center' });
            doc.end();
            return;
        }

        doc.on('data', chunk => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        const areaName = data[0]?.[groupBy === 'locality' ? 'county' : 'locality'] || 'Unknown';
        const groupLabel = groupBy === 'locality' ? 'Locality' : 'Neighbourhood';

        doc.fontSize(18).text(`Garbage Situation for ${areaName}`, { align: 'center' })
        doc.moveDown()

        doc.fontSize(14).text(`Garbage Status by ${groupLabel}`, { underline: true })
        doc.moveDown(0.5)

        doc.fillColor('#000000'); const minScore = garbageStatusSorted.reduce((min, zone) => Math.min(min, parseInt(zone.totalSeverity) + zone.reportsCount), Infinity);
        const maxScore = garbageStatusSorted.reduce((max, zone) => Math.max(max, parseInt(zone.totalSeverity) + zone.reportsCount), -Infinity);

        const scoreRange = maxScore - minScore; const scoreToColor = (score) => {
            let normalizedScore;
            if (scoreRange === 0 || garbageStatusSorted.length === 1) {
                normalizedScore = 0.5;
            } else {
                normalizedScore = (score - minScore) / scoreRange;
            }
            const lightRed = [250, 230, 230];
            const lightGreen = [230, 250, 230];
            const red = Math.floor(lightRed[0] * normalizedScore + lightGreen[0] * (1 - normalizedScore));
            const green = Math.floor(lightRed[1] * normalizedScore + lightGreen[1] * (1 - normalizedScore));
            const blue = Math.floor(lightRed[2] * normalizedScore + lightGreen[2] * (1 - normalizedScore));
            return [Math.min(255, Math.max(0, red)), Math.min(255, Math.max(0, green)), Math.min(255, Math.max(0, blue))];
        };

        const pageWidth = doc.page.width;
        const margin = 50;

        const x = margin;
        const width = pageWidth - margin * 2;


        let startY = 110;
        doc.fillColor('#e8e8e8');
        doc.rect(x, startY, width, 22).fill();
        doc.fillColor('#000000');
        doc.text(groupLabel, x + 10, startY + 5);
        doc.text("Severity Score", x + width / 2 - 100, startY + 5, { align: 'center', width: 200 });
        doc.text("Nr of Reports", x + width - 200, startY + 5, { align: 'right', width: 200 });

        startY += 5; garbageStatusSorted.forEach((zone, index) => {
            const yPos = startY + (index + 1) * 25;
            doc.fillColor(scoreToColor(zone.reportsCount + parseInt(zone.totalSeverity)));
            doc.rect(x, yPos - 5, width, 25).fill();
            doc.fillColor('#000000'); doc.text(zone[groupBy], x + 10, yPos);
            doc.text(parseInt(zone.totalSeverity).toString(), x + width / 2 - 100, yPos, { align: 'center', width: 200 });
            doc.text(zone.reportsCount, x + width - 10, yPos, { align: 'right' });
        });

        const newY = 110 + (garbageStatusSorted.length + 1) * 25 + 25;
        doc.y = newY;
        doc.x = margin;

        doc.fillColor('#871d1d');
        doc.fontSize(14).text(`Dirtiest ${groupLabel.toLowerCase()}: ` + garbageStatusSorted[0][groupBy]);
        doc.fillColor('#21871d');
        doc.fontSize(14).text(`Cleanest ${groupLabel.toLowerCase()}: ` + garbageStatusSorted[garbageStatusSorted.length - 1][groupBy]); doc.fillColor('black');
        doc.moveDown();

        doc.fontSize(16).text('Detailed Reports');
        doc.moveDown(0.5);

        let detailStartY = doc.y;
        doc.fillColor('#e8e8e8');
        doc.rect(x, detailStartY, width, 22).fill();
        doc.fillColor('#000000');
        doc.fontSize(10);
        doc.text("#", x + 5, detailStartY + 5, { width: width * 0.05 });
        doc.text("Category", x + width * 0.05, detailStartY + 5, { width: width * 0.25 });
        doc.text("Severity", x + width * 0.3, detailStartY + 5, { width: width * 0.1, align: 'center' });
        doc.text(groupLabel, x + width * 0.4, detailStartY + 5, { width: width * 0.25 });
        doc.text(groupBy === 'locality' ? 'County' : 'Locality', x + width * 0.65, detailStartY + 5, { width: width * 0.35 });

        detailStartY += 22;

        data.forEach((item, index) => {
            const yPos = detailStartY + index * 25;

            if (index % 2 === 0) {
                doc.fillColor('#f8f8f8');
                doc.rect(x, yPos, width, 25).fill();
            }

            doc.fillColor('#000000');
            doc.fontSize(9);
            doc.text((index + 1).toString(), x + 5, yPos + 5, { width: width * 0.05 });
            doc.text(item.category || 'N/A', x + width * 0.05, yPos + 5, { width: width * 0.25 - 5 });
            doc.text(parseInt(item.severity).toString(), x + width * 0.3, yPos + 5, { width: width * 0.1, align: 'center' });
            doc.text(item[groupBy] || 'Unknown', x + width * 0.4, yPos + 5, { width: width * 0.25 - 5 });
            doc.text(item[groupBy === 'locality' ? 'county' : 'locality'] || 'Unknown', x + width * 0.65, yPos + 5, { width: width * 0.35 - 5 });
        });

        doc.end()
    })
}

export default generatePdfBuffer;
