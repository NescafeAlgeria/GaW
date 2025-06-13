import PDFDocument from 'pdfkit'

const generatePdfBuffer = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument()
        const buffers = []

        const garbageStatusPerZone = {};

        data.forEach((report)=> garbageStatusPerZone[])

        doc.on('data', chunk => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        doc.fontSize(18).text('Garbage Report', { align: 'center' })
        doc.moveDown()

        data.forEach((item, index) => {
            doc.fontSize(12).text(
                `${index + 1}. ${item.category} | Severity: ${item.severity} | ${item.locality}, ${item.county}`
            )
        })

        doc.end()
    })
}

export default generatePdfBuffer;
