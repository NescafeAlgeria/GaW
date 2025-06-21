import PDFDocument from 'pdfkit'
import path from 'path'

const generatePdfBuffer = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = []

        try {
            const fontPath = path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', 'DejaVuSans.ttf')
            doc.registerFont('DejaVu', fontPath)
            doc.font('DejaVu')
        } catch (err) {
            console.warn('Could not load DejaVu font, using default font')
        }

        const garbageStatusPerZone = {};
        data.forEach(report => {
            const zone = report.locality || 'Unknown';
            if (!garbageStatusPerZone[zone]) {
                garbageStatusPerZone[zone] = {
                    locality: zone,
                    reportsCount: 0,
                    totalSeverity: 0,
                };
            }
            garbageStatusPerZone[zone].reportsCount += 1;
            garbageStatusPerZone[zone].totalSeverity += report.severity || 0;
        });        
        
        const garbageStatusSorted = Object.values(garbageStatusPerZone).sort((a, b) => (b.reportsCount + b.totalSeverity) - (a.reportsCount + a.totalSeverity));

        if (data.length === 0) {
            doc.fontSize(16).text('No reports available for the selected criteria', {align: 'center'});
            doc.end();
            return;
        }

        console.log(data);

        doc.on('data', chunk => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        doc.fontSize(18).text(`Garbage Situation for ${data[0].county}`, {align: 'center'})
        doc.moveDown()

        doc.fontSize(14).text('Garbage Status by Locality', {underline: true})
        doc.moveDown(0.5)

        doc.fillColor('#000000');        const minScore = garbageStatusSorted.reduce((min, zone) => Math.min(min, zone.totalSeverity + zone.reportsCount), Infinity);
        const maxScore = garbageStatusSorted.reduce((max, zone) => Math.max(max, zone.totalSeverity + zone.reportsCount), -Infinity);
        const scoreRange = maxScore - minScore;
        const scoreToColor = (score) => {
            let normalizedScore;
            if (scoreRange === 0 || garbageStatusSorted.length === 1) {
                normalizedScore = 0.5;
            } else {
                normalizedScore = (score - minScore) / scoreRange;
            }
            const base = 210;
            const red = Math.min(255, Math.max(0, base + Math.floor(35 * normalizedScore)));
            const green = Math.min(255, Math.max(0, base + Math.floor(35 * (1 - normalizedScore))));
            return [red, green, 190];
        };

        const pageWidth = doc.page.width;
        const margin = 50;

        const x = margin;
        const width = pageWidth - margin * 2;


        let startY = 110;
        doc.fillColor('#e8e8e8');
        doc.rect(x, startY, width, 22).fill();
        doc.fillColor('#000000');
        doc.text("Locality", x + 10, startY + 5);
        doc.text("Severity Score", x + width / 2 - 100, startY + 5, {align: 'center', width: 200});
        doc.text("Nr of Reports", x + width - 200, startY + 5, {align: 'right', width: 200});

        startY += 5;

        garbageStatusSorted.forEach((zone, index) => {
            const yPos = startY + (index + 1) * 25;
            doc.fillColor(scoreToColor(zone.reportsCount + zone.totalSeverity));
            console.log("Fill colour: ", scoreToColor(zone.reportsCount + zone.totalSeverity));
            console.log("Zone: ", zone.locality, "Score: ", zone.reportsCount + zone.totalSeverity);
            doc.rect(x, yPos - 5, width, 25).fill();
            doc.fillColor('#000000');
            doc.text(zone.locality, x + 10, yPos);
            doc.text(zone.totalSeverity, x + width / 2 - 100, yPos, {align: 'center', width: 200});
            doc.text(zone.reportsCount, x + width - 10, yPos, {align: 'right'});
        });

        const newY = 110 + (garbageStatusSorted.length + 1) * 25 + 25;
        doc.y = newY;
        doc.x = margin;

        doc.fillColor('#871d1d');
        doc.fontSize(14).text('Dirtiest locality: ' + garbageStatusSorted[0].locality);
        doc.fillColor('#21871d');
        doc.fontSize(14).text('Cleanest locality: ' + garbageStatusSorted[garbageStatusSorted.length - 1].locality);        doc.fillColor('black');
        doc.moveDown();

        doc.fontSize(16).text('Detailed Reports');
        doc.moveDown(0.5);

        let detailStartY = doc.y;
        doc.fillColor('#e8e8e8');
        doc.rect(x, detailStartY, width, 22).fill();
        doc.fillColor('#000000');
        doc.fontSize(10);
        doc.text("#", x + 5, detailStartY + 5, {width: width * 0.05});
        doc.text("Category", x + width * 0.05, detailStartY + 5, {width: width * 0.25});
        doc.text("Severity", x + width * 0.3, detailStartY + 5, {width: width * 0.1, align: 'center'});
        doc.text("Locality", x + width * 0.4, detailStartY + 5, {width: width * 0.25});
        doc.text("County", x + width * 0.65, detailStartY + 5, {width: width * 0.35});

        detailStartY += 22;

        data.forEach((item, index) => {
            const yPos = detailStartY + index * 25;
            
            if (index % 2 === 0) {
                doc.fillColor('#f8f8f8');
                doc.rect(x, yPos, width, 25).fill();
            }
            
            doc.fillColor('#000000');
            doc.fontSize(9);
            
            doc.text((index + 1).toString(), x + 5, yPos + 5, {width: width * 0.05});
            doc.text(item.category || 'N/A', x + width * 0.05, yPos + 5, {width: width * 0.25 - 5});
            doc.text(item.severity.toString(), x + width * 0.3, yPos + 5, {width: width * 0.1, align: 'center'});
            doc.text(item.locality || 'Unknown', x + width * 0.4, yPos + 5, {width: width * 0.25 - 5});
            doc.text(item.county || 'Unknown', x + width * 0.65, yPos + 5, {width: width * 0.35 - 5});
        });

        doc.end()
    })
}

export default generatePdfBuffer;
