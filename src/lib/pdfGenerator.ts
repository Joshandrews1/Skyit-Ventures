import jsPDF from 'jspdf';
import { SKYIT_LOGO_BASE64 } from '../assets/logo';
import { Order } from '../types';

export interface AuditReportData {
  auditCounts: {
    bulbs: number;
    fans: number;
    tv: number;
    laptops: number;
    freezer: number;
    ac: number;
    waterPump: number;
    microwave: number;
  };
  totalSustainedWattage: number;
  recommendedMinKva: number;
  bestMatchedPackage: {
    name: string;
    price: number;
    description: string;
    kva: string;
    batteryInfo: string;
    panels: number;
  };
  recommendedBatteryKwh: string;
  recommendedSolarWattage: number;
  backupHours?: number;
  auditRef?: string;

  // Pro Engineering & Solar Inclusion Parameters
  includeDaytimeSolar?: boolean;
  manualSolarWattage?: number | null;
  isProEngineered?: boolean;
  batteryTech?: 'lithium' | 'tubular';
  batterySpecLabel?: string;
  batteryUnitsCount?: number;
  batteryBankAhAtVoltage?: string;
  systemVoltage?: number;
  peakSunHours?: number;
  solarPanelWattage?: number;
  solarPanelType?: string;
  solarPanelCount?: number;
  mpptAmps?: number;
  daytimeHours?: number;
  nighttimeHours?: number;
}

export async function generateEnergyAuditPDF(data: AuditReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const refCode = data.auditRef || `SKY-AUD-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentDateStr = new Date().toLocaleDateString('en-NG', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // --- 1. TOP BRAND HEADER ---
  // Navy Header Box (42mm height for spacious text layout)
  doc.setFillColor(0, 28, 71); // #001C47
  doc.rect(0, 0, 210, 42, 'F');

  // Gold Accent Stripe
  doc.setFillColor(245, 158, 11); // #F59E0B
  doc.rect(0, 42, 210, 2, 'F');

  // SkyIT Official Logo Image directly embedded
  try {
    doc.addImage(SKYIT_LOGO_BASE64, 'PNG', 8, 12, 22, 14);
  } catch (e) {
    // Elegant fallback logo emblem if image fails
    doc.setFillColor(255, 255, 255);
    doc.circle(18, 19, 9, 'F');
    doc.setFillColor(0, 28, 71);
    doc.circle(18, 19, 7, 'F');
    doc.setFillColor(245, 158, 11);
    doc.triangle(16, 22, 20, 14, 18, 19, 'F');
  }

  // Header Title & Company info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SKYIT VENTURES LIMITED', 34, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 210, 255);
  doc.text('SOLAR & RENEWABLE ENERGY ENGINEERING SERVICES', 34, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(220, 235, 255);
  doc.text('Warri HQ: KM 1 DSC Expressway, Effurun | Lagos: Manjo Plaza, Lekki-Epe Exp.', 34, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(253, 224, 71); // #FDE047 Gold
  doc.text('Hotlines: +234-9135396292 | +234-9074444140', 34, 24.5);
  doc.text('Support: +234-9017777773 | +234-9017777774', 34, 28.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 210, 255);
  doc.text('Email: skyitventures01@gmail.com | Website: www.skyitonline.org', 34, 32.5);

  // Audit Reference Badge on Right (x=148, width=52)
  doc.setFillColor(0, 59, 150);
  doc.roundedRect(148, 6, 52, 30, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(148, 6, 52, 30, 2, 2, 'D');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL AUDIT REPORT', 151, 12);

  doc.setTextColor(253, 224, 71); // #FDE047
  doc.setFontSize(9);
  doc.text(refCode, 151, 18);

  doc.setTextColor(200, 220, 255);
  doc.setFontSize(7);
  doc.text(`Date: ${currentDateStr}`, 151, 23.5);

  doc.setTextColor(74, 222, 128); // Green verified status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('STATUS: CERTIFIED AUDIT', 151, 28.5);

  // --- 2. REPORT TITLE & ENGINEER CALLOUT NOTICE ---
  let currentY = 53;

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('SIMULTANEOUS ELECTRICAL LOAD & SOLAR SIZING REPORT', 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sizing based on simultaneous peak operating load demand at 0.8 Power Factor rating.', 14, currentY);

  // Engineer Callout Notification Box
  currentY += 5;
  doc.setFillColor(239, 246, 255); // #EFF6FF
  doc.setDrawColor(37, 99, 235); // #2563EB
  doc.setLineWidth(0.5);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, 'FD');

  doc.setTextColor(30, 58, 138); // #1E3A8A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ATTENTION CLIENT — PRESENT THIS REPORT TO A SKYIT VENTURES ENGINEER:', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const noticeLines = [
    'This audit calculates your simultaneous peak wattage. Please present this document to a SkyIT Ventures Engineer',
    'for a full site inspection. Our engineering desk will build a 100% custom solar-inverter package for your exact needs.'
  ];
  doc.text(noticeLines[0], 18, currentY + 11);
  doc.text(noticeLines[1], 18, currentY + 16);

  // --- 3. CONNECTED APPLIANCES BREAKDOWN TABLE ---
  currentY += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 28, 71);
  doc.text('1. CONNECTED APPLIANCES LOAD PROFILE', 14, currentY);

  currentY += 4;

  // Table Header
  doc.setFillColor(0, 43, 117); // #002B75
  doc.rect(14, currentY, 182, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Appliance Description', 18, currentY + 5);
  doc.text('Quantity', 98, currentY + 5);
  doc.text('Unit Rating (W)', 130, currentY + 5);
  doc.text('Simultaneous Wattage', 160, currentY + 5);

  currentY += 7;

  // Appliance list data
  const appliancesList = [
    { name: 'Energy-Saving LED Bulbs / Fittings', qty: data.auditCounts.bulbs, unit: 15 },
    { name: 'Ceiling / Standing Fans', qty: data.auditCounts.fans, unit: 65 },
    { name: 'Smart TVs & Audio Systems', qty: data.auditCounts.tv, unit: 150 },
    { name: 'Laptops / Workstations & WiFi Routers', qty: data.auditCounts.laptops, unit: 80 },
    { name: 'Deep Freezers / Refrigerators', qty: data.auditCounts.freezer, unit: 250 },
    { name: 'Inverter Air Conditioners (1.5HP)', qty: data.auditCounts.ac, unit: 1200 },
    { name: 'Water Pumping Motor (1HP)', qty: data.auditCounts.waterPump, unit: 1000 },
    { name: 'Microwave / High-Power Kitchen App.', qty: data.auditCounts.microwave, unit: 1200 },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  appliancesList.forEach((app, idx) => {
    const totalW = app.qty * app.unit;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252); // #F8FAFC
      doc.rect(14, currentY, 182, 6, 'F');
    }

    // Border line bottom
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(14, currentY + 6, 196, currentY + 6);

    doc.setTextColor(app.qty > 0 ? 30 : 140, app.qty > 0 ? 41 : 150, app.qty > 0 ? 59 : 160);
    doc.text(app.name, 18, currentY + 4.5);
    doc.text(`${app.qty} pcs`, 98, currentY + 4.5);
    doc.text(`${app.unit} W`, 130, currentY + 4.5);
    
    doc.setFont('helvetica', app.qty > 0 ? 'bold' : 'normal');
    doc.text(`${totalW.toLocaleString()} W`, 160, currentY + 4.5);
    doc.setFont('helvetica', 'normal');

    currentY += 6;
  });

  // Total Row
  doc.setFillColor(224, 242, 254); // #E0F2FE
  doc.rect(14, currentY, 182, 8, 'F');
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.3);
  doc.rect(14, currentY, 182, 8, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(3, 105, 161);
  doc.text('TOTAL SIMULTANEOUS RUNNING LOAD DEMAND:', 18, currentY + 5.5);

  doc.setTextColor(2, 44, 117);
  doc.setFontSize(11);
  doc.text(`${data.totalSustainedWattage.toLocaleString()} Watts`, 155, currentY + 5.5);

  currentY += 14;

  // --- 4. SYSTEM SIZING ANALYSIS & PACKAGE RECOMMENDATION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 28, 71);
  const section2Title = data.isProEngineered 
    ? '2. PRO ENGINEER SYSTEM SIZING & CATALOGUE RECOMMENDATION' 
    : '2. TECHNICAL SYSTEM SIZING & CATALOGUE RECOMMENDATION';
  doc.text(section2Title, 14, currentY);

  currentY += 5;

  // Left Column: Technical Specifications
  const boxHeight = data.isProEngineered ? 60 : 54;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 88, boxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 88, boxHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(data.isProEngineered ? 'Pro Engineer System Parameters:' : 'Calculated Technical Specifications:', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  if (data.isProEngineered) {
    doc.text('• Peak Operating Demand:', 18, currentY + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.totalSustainedWattage.toLocaleString()} W`, 58, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.text('• Target Night Autonomy:', 18, currentY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.backupHours || 8} Hours (${data.recommendedBatteryKwh} kWh)`, 58, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text('• Battery Bank Specs:', 18, currentY + 21);
    doc.setFont('helvetica', 'bold');
    const batLines = doc.splitTextToSize(`${data.batteryUnitsCount || 1}x ${data.batterySpecLabel || 'Lithium Module'}`, 40);
    doc.text(batLines, 58, currentY + 21);

    doc.setFont('helvetica', 'normal');
    doc.text('• System DC Voltage:', 18, currentY + 26);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.systemVoltage || 48}V DC Bus (${data.batteryBankAhAtVoltage || '200 Ah'})`, 58, currentY + 26);

    doc.setFont('helvetica', 'normal');
    doc.text('• Inverter Capacity:', 18, currentY + 31);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.recommendedMinKva.toFixed(1)} kVA Rating`, 58, currentY + 31);

    doc.setFont('helvetica', 'normal');
    doc.text('• Solar PV Array:', 18, currentY + 36);
    doc.setFont('helvetica', 'bold');
    if (data.recommendedSolarWattage > 0) {
      const typeStr = data.solarPanelType ? ` ${data.solarPanelType}` : '';
      const solarText = `${data.solarPanelCount || Math.ceil(data.recommendedSolarWattage / (data.solarPanelWattage || 550))}x ${data.solarPanelWattage || 550}W${typeStr} (${data.recommendedSolarWattage.toLocaleString()}W)`;
      const solarLines = doc.splitTextToSize(solarText, 40);
      doc.text(solarLines, 58, currentY + 36);
    } else {
      doc.text('0 W (Inverter & Battery Only)', 58, currentY + 36);
    }

    doc.setFont('helvetica', 'normal');
    doc.text('• Charge Controller MPPT:', 18, currentY + 41);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.mpptAmps || 0}A MPPT @ ${data.systemVoltage || 48}V`, 58, currentY + 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const proFootnote = `* Engineer Model: ${data.batteryTech === 'tubular' ? 'Tubular Lead-Acid (50% DoD)' : 'Lithium LFP (85% DoD)'} | ${data.peakSunHours || 5.0} PSH`;
    const proFootnoteLines = doc.splitTextToSize(proFootnote, 80);
    doc.text(proFootnoteLines, 18, currentY + 48);
  } else {
    doc.text('• Peak Operating Demand:', 18, currentY + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.totalSustainedWattage.toLocaleString()} W`, 58, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.text('• Target Backup Hours:', 18, currentY + 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.backupHours || 8} Hours Autonomy`, 58, currentY + 17);

    doc.setFont('helvetica', 'normal');
    doc.text('• Battery Bank (LFP):', 18, currentY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.recommendedBatteryKwh} kWh Capacity`, 58, currentY + 23);

    doc.setFont('helvetica', 'normal');
    doc.text('• Minimum Inverter Rating:', 18, currentY + 29);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.recommendedMinKva.toFixed(1)} kVA`, 58, currentY + 29);

    doc.setFont('helvetica', 'normal');
    doc.text('• Recommended Solar Array:', 18, currentY + 35);
    doc.setFont('helvetica', 'bold');
    if (data.recommendedSolarWattage > 0) {
      doc.text(`${data.recommendedSolarWattage.toLocaleString()} W Mono Array`, 58, currentY + 35);
    } else {
      doc.text('0 W (Inverter + Battery Only)', 58, currentY + 35);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const footnoteText = data.includeDaytimeSolar === false
      ? '* Mode: Inverter & Battery Only (No Solar Panels). Add PV array for daytime generation.'
      : '* Formula: Daytime loads offset by solar. Battery covers target night autonomy.';
    const footnoteLines = doc.splitTextToSize(footnoteText, 80);
    doc.text(footnoteLines, 18, currentY + 43);
  }

  // Right Column: Recommended Solar Package (Uses 'NGN' to avoid '¦' character corruption)
  doc.setFillColor(0, 43, 117);
  doc.roundedRect(106, currentY, 90, boxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.text('OPTIMAL MATCHED SOLAR PACKAGE:', 110, currentY + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  const pkgNameLines = doc.splitTextToSize(data.bestMatchedPackage.name, 82);
  doc.text(pkgNameLines, 110, currentY + 13);

  doc.setFontSize(13);
  doc.setTextColor(253, 224, 71);
  // NGN Prefix ensures standard PDF fonts render correctly without ¦ corruption
  doc.text(`NGN ${data.bestMatchedPackage.price.toLocaleString()}`, 110, currentY + 26);

  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Inverter: ${data.bestMatchedPackage.kva}`, 110, currentY + 33);
  doc.text(`Battery Bank: ${data.bestMatchedPackage.batteryInfo}`, 110, currentY + 38);
  doc.text(`Solar Panels: ${data.bestMatchedPackage.panels}x High-Yield Panels`, 110, currentY + 43);

  currentY += (boxHeight + 6);

  // --- 5. SKYIT CERTIFICATION SEAL & CONTACT FOOTER ---
  // Engineering Stamp & Verification Box
  doc.setFillColor(254, 243, 199); // #FEF3C7
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, 182, 24, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14); // #92400E
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SKYIT VENTURES CERTIFIED ENGINEERING DESK', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  doc.text('For custom component selection, three-phase commercial balancing, or on-site engineering surveys,', 18, currentY + 11);
  doc.text('please contact our lead engineers directly or visit our Lekki or Warri offices.', 18, currentY + 15.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('Direct Engineer Hotlines: +234-9135396292 | +234-9074444140 | +234-9017777773 | +234-9017777774', 18, currentY + 20);

  // Verification Seal Graphic - Centered properly inside circle
  const sealX = 180;
  const sealY = currentY + 12;
  doc.setFillColor(245, 158, 11);
  doc.circle(sealX, sealY, 8, 'F');
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 8, 'D');

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('SKYIT', sealX, sealY - 0.5, { align: 'center' });
  doc.setFontSize(6);
  doc.text('VERIFIED', sealX, sealY + 2.5, { align: 'center' });

  // Footer Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 278, 196, 278);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 28, 71);
  doc.text('SkyIT Ventures Limited • Solar & Electrical Power Systems Engineering', 14, 282.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Warri HQ: KM 1 DSC Expressway, Ebrumede, Effurun | Lagos: Manjo Plaza, Lekki-Epe Expressway', 14, 286.5);
  doc.text('Hotlines: +234-9135396292 | +234-9074444140 | +234-9017777773 | +234-9017777774', 14, 290.5);

  doc.setTextColor(37, 99, 235);
  doc.text('Email: skyitventures01@gmail.com • www.skyitonline.org', 196, 290.5, { align: 'right' });

  // Save PDF
  doc.save(`SkyIT_Energy_Audit_${refCode}.pdf`);
}

// --- ORDER RECEIPT PDF GENERATOR ---
export async function generateOrderReceiptPDF(order: Order): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currentDateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-NG', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // --- 1. TOP BRAND HEADER (42mm height) ---
  doc.setFillColor(0, 28, 71); // #001C47 Navy
  doc.rect(0, 0, 210, 42, 'F');

  // Gold Stripe
  doc.setFillColor(245, 158, 11); // #F59E0B Gold
  doc.rect(0, 42, 210, 2, 'F');

  // Logo
  try {
    doc.addImage(SKYIT_LOGO_BASE64, 'PNG', 8, 12, 22, 14);
  } catch (e) {
    doc.setFillColor(255, 255, 255);
    doc.circle(18, 19, 9, 'F');
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SKYIT VENTURES LIMITED', 34, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 210, 255);
  doc.text('SOLAR & RENEWABLE ENERGY ENGINEERING SERVICES', 34, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(220, 235, 255);
  doc.text('Warri HQ: KM 1 DSC Expressway, Effurun | Lagos: Manjo Plaza, Lekki-Epe Exp.', 34, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(253, 224, 71); // Gold
  doc.text('Hotlines: +234-9135396292 | +234-9074444140', 34, 24.5);
  doc.text('Support: +234-9017777773 | +234-9017777774', 34, 28.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 210, 255);
  doc.text('Email: skyitventures01@gmail.com | Website: www.skyitonline.org', 34, 32.5);

  // Badge on Right
  doc.setFillColor(0, 59, 150);
  doc.roundedRect(144, 6, 56, 30, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(144, 6, 56, 30, 2, 2, 'D');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL PAYMENT RECEIPT', 147, 12);

  doc.setTextColor(253, 224, 71);
  doc.setFontSize(8.5);
  doc.text(`REF: ${order.id}`, 147, 18);

  doc.setTextColor(200, 220, 255);
  doc.setFontSize(7);
  doc.text(`Date: ${currentDateStr}`, 147, 23.5);

  doc.setTextColor(74, 222, 128); // Green
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(`STATUS: ${order.status === 'cancelled' ? 'CANCELLED' : 'PAID / CONFIRMED'}`, 147, 28.5);

  // --- 2. CLIENT & ORDER DETAILS BOXES ---
  let currentY = 50;

  // Left Box: Prepared For
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 88, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 88, 32, 2, 2, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CUSTOMER / CLIENT PROFILE', 18, currentY + 6);

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.customerDetails.name || 'Valued Client', 18, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  if (order.customerDetails.phone) {
    doc.text(`Tel: ${order.customerDetails.phone}`, 18, currentY + 16);
  }
  if (order.customerDetails.email) {
    doc.text(`Email: ${order.customerDetails.email}`, 18, currentY + 20.5);
  }
  const addrText = `${order.customerDetails.address || ''}, ${order.customerDetails.city || 'Lagos'}`;
  const addrLines = doc.splitTextToSize(addrText, 80);
  doc.text(addrLines, 18, currentY + 25);

  // Right Box: Payment & Order Summary Metadata
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, currentY, 88, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(108, currentY, 88, 32, 2, 2, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TRANSACTION METADATA', 112, currentY + 6);

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Order Ref ID: ${order.id}`, 112, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Payment Method: ${order.paymentMethod || 'Online Transfer'}`, 112, currentY + 16);
  doc.text(`Order Status: ${order.status.toUpperCase().replace(/_/g, ' ')}`, 112, currentY + 20.5);
  doc.text(`Terminal: SkyIT Logistics Terminal`, 112, currentY + 25);

  // --- 3. ITEMS / HARDWARE PURCHASED TABLE ---
  currentY += 37;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 28, 71);
  doc.text('EQUIPMENT & SERVICES PURCHASED', 14, currentY);

  currentY += 4;

  // Table Header
  doc.setFillColor(0, 43, 117);
  doc.rect(14, currentY, 182, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item Description & Specifications', 18, currentY + 5);
  doc.text('Qty', 125, currentY + 5);
  doc.text('Unit Price (NGN)', 142, currentY + 5);
  doc.text('Total (NGN)', 172, currentY + 5);

  currentY += 7;

  // Render items
  order.items.forEach((item, idx) => {
    const unitPrice = item.product.price;
    const itemTotal = unitPrice * item.quantity;

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 7, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(14, currentY + 7, 196, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(item.product.name.substring(0, 52), 18, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.text(`${item.quantity}`, 125, currentY + 4.8);
    doc.text(`NGN ${unitPrice.toLocaleString()}`, 142, currentY + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.text(`NGN ${itemTotal.toLocaleString()}`, 172, currentY + 4.8);

    currentY += 7;
  });

  // --- 4. FINANCIAL BREAKDOWN LEDGER ---
  currentY += 3;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(108, currentY, 88, 30, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(108, currentY, 88, 30, 2, 2, 'D');

  let ledgerY = currentY + 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 112, ledgerY);
  doc.text(`NGN ${order.subtotal.toLocaleString()}`, 192, ledgerY, { align: 'right' });

  if (order.deliveryFee > 0) {
    ledgerY += 4.5;
    doc.text('Delivery & Logistics:', 112, ledgerY);
    doc.text(`NGN ${order.deliveryFee.toLocaleString()}`, 192, ledgerY, { align: 'right' });
  }

  if (order.discount > 0) {
    ledgerY += 4.5;
    doc.setTextColor(225, 29, 72); // Rose
    doc.text('Campaign Discount:', 112, ledgerY);
    doc.text(`-NGN ${order.discount.toLocaleString()}`, 192, ledgerY, { align: 'right' });
  }

  ledgerY += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(112, ledgerY - 1, 192, ledgerY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 28, 71);
  doc.text('Total Amount Paid:', 112, ledgerY + 3);
  doc.setTextColor(37, 99, 235);
  doc.text(`NGN ${order.total.toLocaleString()}`, 192, ledgerY + 3, { align: 'right' });

  currentY += 35;

  // --- 5. BANK PAYMENT DETAILS BOX ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 182, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 28, 71);
  doc.text('OFFICIAL BANK PAYMENT ACCOUNTS (VERIFIED CORPORATE ACCOUNTS)', 18, currentY + 5);

  // UBA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('UBA BANK:', 18, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Name: SKYITVENTURES', 18, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text('Account No: 1019649972', 18, currentY + 18);

  // Moniepoint
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MONIEPOINT MICROFINANCE BANK:', 108, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Name: SKYITVENTURE LTD', 108, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text('Account No: 8197495545', 108, currentY + 18);

  currentY += 28;

  // Verification Seal
  const sealX = 180;
  const sealY = currentY + 9;
  doc.setFillColor(245, 158, 11);
  doc.circle(sealX, sealY, 8, 'F');
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 8, 'D');

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('SKYIT', sealX, sealY - 0.5, { align: 'center' });
  doc.setFontSize(6);
  doc.text('VERIFIED', sealX, sealY + 2.5, { align: 'center' });

  // Notice box
  doc.setFillColor(254, 243, 199); // Light gold
  doc.roundedRect(14, currentY, 150, 16, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 150, 16, 2, 2, 'D');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SKYIT GUARANTEE & SERVICE DISPATCH NOTICE:', 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(120, 53, 15);
  doc.text('This receipt confirms payment for the solar hardware / equipment listed above. All units are backed by', 18, currentY + 8.5);
  doc.text('SkyIT Ventures certified hardware warranty and dedicated technical field commissioning team.', 18, currentY + 12);

  // Footer Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 278, 196, 278);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 28, 71);
  doc.text('SkyIT Ventures Limited • Official Payment Receipt Document', 14, 282.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Warri HQ: KM 1 DSC Expressway, Effurun | Lagos: Manjo Plaza, Lekki-Epe Expressway', 14, 286.5);
  doc.text('Hotlines: +234-9135396292 | +234-9074444140 | +234-9017777773 | +234-9017777774', 14, 290.5);

  doc.setTextColor(37, 99, 235);
  doc.text('Email: skyitventures01@gmail.com • www.skyitonline.org', 196, 290.5, { align: 'right' });

  doc.save(`SkyIT_Receipt_${order.id}.pdf`);
}


// --- AI QUOTATION & PROPOSAL RECEIPT PDF GENERATOR ---
export interface QuoteReceiptPDFData {
  documentType: 'receipt' | 'quotation';
  docCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  state: string;
  systemKva: string;
  batteryTech: 'tubular' | 'lithium';
  batteryInfo: string;
  batteriesCount: number;
  panelsCount: number;
  panelsInfo: string;
  inverterInfo: string;
  accessories: string[];
  accessoriesPrices?: Record<string, number>;
  appliancesMatched: string[];
  serviceFee: number;
  price: number;
  proposalText: string;
}

export async function generateQuoteOrReceiptPDF(data: QuoteReceiptPDFData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currentDateStr = new Date().toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isReceipt = data.documentType === 'receipt';
  const codePrefix = isReceipt ? 'SKY-REC' : 'SKY-QTY';
  const fullCode = `${codePrefix}-${data.docCode}`;

  // --- 1. TOP BRAND HEADER (42mm height) ---
  doc.setFillColor(0, 28, 71);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setFillColor(245, 158, 11);
  doc.rect(0, 42, 210, 2, 'F');

  try {
    doc.addImage(SKYIT_LOGO_BASE64, 'PNG', 8, 12, 22, 14);
  } catch (e) {
    doc.setFillColor(255, 255, 255);
    doc.circle(18, 19, 9, 'F');
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SKYIT VENTURES LIMITED', 34, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 210, 255);
  doc.text('SOLAR & RENEWABLE ENERGY ENGINEERING SERVICES', 34, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(220, 235, 255);
  doc.text('Warri HQ: KM 1 DSC Expressway, Effurun | Lagos: Manjo Plaza, Lekki-Epe Exp.', 34, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(253, 224, 71);
  doc.text('Hotlines: +234-9135396292 | +234-9074444140', 34, 24.5);
  doc.text('Support: +234-9017777773 | +234-9017777774', 34, 28.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 210, 255);
  doc.text('Email: skyitventures01@gmail.com | Website: www.skyitonline.org', 34, 32.5);

  // Badge Box on Right
  doc.setFillColor(isReceipt ? 5 : 0, isReceipt ? 150 : 59, isReceipt ? 105 : 150);
  doc.roundedRect(142, 6, 58, 30, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(142, 6, 58, 30, 2, 2, 'D');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isReceipt ? 'OFFICIAL PAYMENT RECEIPT' : 'PROPOSAL & QUOTATION', 145, 12);

  doc.setTextColor(253, 224, 71);
  doc.setFontSize(8.5);
  doc.text(fullCode, 145, 18);

  doc.setTextColor(200, 220, 255);
  doc.setFontSize(7);
  doc.text(`Date: ${currentDateStr}`, 145, 23.5);

  doc.setTextColor(74, 222, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(isReceipt ? 'STATUS: PAID (FULL)' : 'VALIDITY: 14 DAYS', 145, 28.5);

  // --- 2. EXECUTIVE SUMMARY / NARRATIVE BOX ---
  let currentY = 50;

  if (data.proposalText) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(isReceipt ? 'TRANSACTION NARRATIVE & REFERENCE:' : 'EXECUTIVE SUMMARY & PROPOSAL BRIEF:', 18, currentY + 5);

    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    const narrativeLines = doc.splitTextToSize(`"${data.proposalText}"`, 174);
    doc.text(narrativeLines[0], 18, currentY + 9.5);
    if (narrativeLines[1]) {
      doc.text(narrativeLines[1], 18, currentY + 13.2);
    }
    currentY += 21;
  }

  // --- 3. CLIENT PROFILE & SYSTEM CLASSIFICATION GRID ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 88, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 88, 30, 2, 2, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PREPARED FOR CLIENT', 18, currentY + 5.5);

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(data.customerName || 'Valued Client', 18, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  if (data.customerPhone) doc.text(`Tel: ${data.customerPhone}`, 18, currentY + 15);
  if (data.customerEmail) doc.text(`Email: ${data.customerEmail}`, 18, currentY + 19);
  const clientLoc = `${data.customerAddress ? data.customerAddress + ', ' : ''}${data.city || 'Lagos'}, ${data.state || ''}`;
  const clientLocLines = doc.splitTextToSize(clientLoc, 80);
  doc.text(clientLocLines, 18, currentY + 23);

  // Right Box: System Engineering Classification
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, currentY, 88, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(108, currentY, 88, 30, 2, 2, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ENGINEERING CLASSIFICATION', 112, currentY + 5.5);

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`${data.systemKva || '3.5KVA'} SYSTEM DEPLOYMENT`, 112, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Inverter: ${data.inverterInfo || 'Pure Sine Wave MPPT'}`, 112, currentY + 15);
  doc.text(`Storage: ${data.batteryInfo || 'Battery Bank'} (${data.batteriesCount || 1} Units)`, 112, currentY + 19);
  doc.text(`PV Array: ${data.panelsInfo || 'Solar Panels'} (${data.panelsCount || 0} Units)`, 112, currentY + 23);

  currentY += 35;

  // --- 4. BILL OF MATERIALS (BOM) & PRICING TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 28, 71);
  doc.text('BILL OF MATERIALS (BOM) & PRICING', 14, currentY);

  currentY += 4;

  doc.setFillColor(0, 43, 117);
  doc.rect(14, currentY, 182, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item Description', 18, currentY + 5);
  doc.text('Qty', 132, currentY + 5);
  doc.text('Ext Value (NGN)', 160, currentY + 5);

  currentY += 7;

  // Calculate prices
  const totalAccessoriesPrice = (data.accessories || []).reduce((sum, acc) => {
    return sum + (data.accessoriesPrices?.[acc] || 0);
  }, 0);
  const hardwareBaseValue = Math.max(0, data.price - data.serviceFee - totalAccessoriesPrice);

  const bomRows = [
    { desc: `${data.inverterInfo || 'Smart Pure Sine Wave Inverter'} (MPPT Built-in)`, qty: '1 Unit', ext: 'Included' },
    ...(data.batteriesCount > 0 ? [{ desc: `${data.batteryInfo} (${data.batteryTech === 'tubular' ? 'Tubular' : 'Lithium'})`, qty: `${data.batteriesCount} Units`, ext: 'Included' }] : []),
    ...(data.panelsCount > 0 ? [{ desc: `${data.panelsInfo} (Tier-1 high efficiency solar cells)`, qty: `${data.panelsCount} Units`, ext: 'Included' }] : []),
    { desc: 'Balance of System (DC/AC Cabling, Trunking, Breakers, Surge Protectors)', qty: '1 Lot', ext: 'Included' },
    ...(data.accessories || []).filter(a => (data.accessoriesPrices?.[a] || 0) > 0).map(a => ({
      desc: `Accessory: ${a}`,
      qty: '1 Lot',
      ext: `NGN ${(data.accessoriesPrices?.[a] || 0).toLocaleString()}`
    })),
    { desc: 'Site transport, mounting, dynamic calibration & commissioning engineering fee', qty: '1 Job', ext: `NGN ${data.serviceFee.toLocaleString()}` },
    { desc: 'System Machinery & Hardware Base Value', qty: '1 Lot', ext: `NGN ${hardwareBaseValue.toLocaleString()}` }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  bomRows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 6, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(14, currentY + 6, 196, currentY + 6);

    doc.setTextColor(30, 41, 59);
    doc.text(row.desc.substring(0, 68), 18, currentY + 4.2);
    doc.text(row.qty, 132, currentY + 4.2);
    
    const isNumber = row.ext.startsWith('NGN');
    if (isNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 28, 71);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
    }
    doc.text(row.ext, 160, currentY + 4.2);
    doc.setFont('helvetica', 'normal');

    currentY += 6;
  });

  // Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 8, 'F');
  doc.setDrawColor(0, 43, 117);
  doc.setLineWidth(0.4);
  doc.rect(14, currentY, 182, 8, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 28, 71);
  doc.text('FULLY SIZED CONTRACT SUM (ALL TAXES INCL.):', 18, currentY + 5.5);

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(10.5);
  doc.text(`NGN ${data.price.toLocaleString()}`, 160, currentY + 5.5);

  currentY += 13;

  // --- 5. OFFICIAL BANK ACCOUNTS BOX ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 182, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 28, 71);
  doc.text('OFFICIAL BANK PAYMENT DETAILS (CORPORATE ACCOUNTS)', 18, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('UBA BANK:', 18, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Name: SKYITVENTURES', 18, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text('Account No: 1019649972', 18, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MONIEPOINT MICROFINANCE BANK:', 108, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Name: SKYITVENTURE LTD', 108, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text('Account No: 8197495545', 108, currentY + 18);

  currentY += 28;

  // Verification Seal
  const sealX = 180;
  const sealY = currentY + 8;
  doc.setFillColor(245, 158, 11);
  doc.circle(sealX, sealY, 8, 'F');
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.circle(sealX, sealY, 8, 'D');

  doc.setTextColor(0, 28, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('SKYIT', sealX, sealY - 0.5, { align: 'center' });
  doc.setFontSize(6);
  doc.text('VERIFIED', sealX, sealY + 2.5, { align: 'center' });

  // Notice Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, currentY, 150, 16, 2, 2, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 150, 16, 2, 2, 'D');

  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZATION & WARRANTY GUARANTEE:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('All engineering designs and hardware packages are covered by SkyIT certified hardware warranties', 18, currentY + 9);
  doc.text('and direct technical support. Please use document code as payment description for auto-verification.', 18, currentY + 12.5);

  // Footer Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 278, 196, 278);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 28, 71);
  doc.text(`SkyIT Ventures Limited • Official ${isReceipt ? 'Payment Receipt' : 'Proposal & Quotation'}`, 14, 282.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Warri HQ: KM 1 DSC Expressway, Effurun | Lagos: Manjo Plaza, Lekki-Epe Expressway', 14, 286.5);
  doc.text('Hotlines: +234-9135396292 | +234-9074444140 | +234-9017777773 | +234-9017777774', 14, 290.5);

  doc.setTextColor(37, 99, 235);
  doc.text('Email: skyitventures01@gmail.com • www.skyitonline.org', 196, 290.5, { align: 'right' });

  doc.save(`SkyIT_Solar_${isReceipt ? 'Receipt' : 'Quote'}_${(data.customerName || 'Client').replace(/\s+/g, '_')}.pdf`);
}


