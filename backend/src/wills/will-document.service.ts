import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { Will } from './entities/will.entity';

@Injectable()
export class WillDocumentService {
  private readonly logger = new Logger(WillDocumentService.name);

  /**
   * Generates a PDF buffer from the given will data.
   * Throws if the will is not complete enough.
   */
  async generatePdf(will: Will): Promise<Buffer> {
    const html = this.buildHtml(will);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // needed for some environments
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '40px', bottom: '40px', left: '60px', right: '60px' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildHtml(will: Will): string {
    // Format date/place if present
    const date = will.signature_date || '_________________________';
    const place = will.signature_place || '_________________________';

    // Executor name
    const executor = will.executor?.full_name || 'Not yet named';

    // Guardian name (if needed)
    const guardian = will.guardian?.full_name || 'Not applicable';

    // Witness names
    const witnesses = (will.beneficiaries || [])
      .filter(b => b.is_witness)
      .map(b => b.full_name);

    // Assets & shares table
    const assetRows = (will.assets || []).map(asset => {
      const shares = (asset.asset_shares || []).map(share => {
        const beneficiaryName = share.beneficiary?.full_name || 'Unknown';
        return `<li>${beneficiaryName} – ${share.share_percentage}%</li>`;
      }).join('');
      return `
        <tr>
          <td>${asset.description}</td>
          <td>${asset.type}</td>
          <td><ul>${shares || '<li>No shares assigned</li>'}</ul></td>
        </tr>`;
    }).join('');

    const revocation = will.revocation_line || 'I hereby revoke all previous wills and codicils.';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Last Will and Testament</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #000; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
    h2 { font-size: 18px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    ul { margin: 0; padding-left: 20px; }
    .signature-line { margin-top: 40px; }
    .signature-line div { margin-bottom: 30px; }
    .signature-line span { border-bottom: 1px solid #000; display: inline-block; width: 250px; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>LAST WILL AND TESTAMENT</h1>

  <h2>1. Declaration</h2>
  <p>
    I, <strong>${will.person_name || '________________________'}</strong>, 
    aged ${will.person_age || '___'}, 
    residing at ${will.person_address || '________________________'}, 
    being of sound mind, do hereby declare this to be my last will and testament.
  </p>

  <h2>2. Revocation</h2>
  <p>${revocation}</p>

  <h2>3. Appointment of Executor</h2>
  <p>I appoint <strong>${executor}</strong> as the executor of this will.</p>

  <h2>4. Guardian</h2>
  <p>${guardian}</p>

  <h2>5. Distribution of Assets</h2>
  <table>
    <thead>
      <tr><th>Asset</th><th>Type</th><th>Beneficiaries & Shares</th></tr>
    </thead>
    <tbody>
      ${assetRows || '<tr><td colspan="3">No assets listed</td></tr>'}
    </tbody>
  </table>

  <h2>6. Witnesses</h2>
  <p>
    ${witnesses.length > 0 
      ? witnesses.map((name, i) => `${i+1}. ${name}`).join('<br>') 
      : 'No witnesses yet.'}
  </p>

  <div class="signature-line">
    <h2>7. Signatures</h2>
    <p>Signed on <strong>${date}</strong> at <strong>${place}</strong>.</p>
    <div><strong>Testator:</strong><span></span></div>
    <div><strong>Witness 1:</strong><span></span></div>
    <div><strong>Witness 2:</strong><span></span></div>
  </div>
</body>
</html>`;
  }
}