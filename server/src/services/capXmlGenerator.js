/**
 * OASIS CAP v1.2 (Common Alerting Protocol) Standards Generator
 * Generates standards-compliant XML payloads for integration with NDMA SACHET,
 * national disaster gateways, and emergency cell broadcast servers.
 *
 * Standard Reference: OASIS Common Alerting Protocol Version 1.2
 * http://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html
 */

export const generateOASISCapXml = ({
  alertCode = 'RAKSHA-2026-001',
  villageName = 'Sohra',
  districtName = 'East Khasi Hills',
  districtId = 'EKH',
  hazardType = 'LANDSLIDE',
  tier = 'DANGER',
  confidencePct = 85,
  coordinates = [91.7324, 25.2986], // [lon, lat]
  officerName = 'Dr. Banlumlang Khongwir (EOC Lead)',
  notes = 'Slope shear failure and high antecedent precipitation verified on site.',
}) => {
  const [lon, lat] = coordinates;
  const sentIso = new Date().toISOString();
  const identifier = `URN:CEWS:RAKSHA-NER:${districtId}:${alertCode}:${Date.now()}`;
  const sender = `eoc-operations@sdma.${districtId === 'DH' ? 'assam' : 'meghalaya'}.gov.in`;

  const severity = tier === 'DANGER' ? 'Extreme' : tier === 'WARNING' ? 'Severe' : 'Moderate';
  const urgency = tier === 'DANGER' ? 'Immediate' : 'Expected';
  const certainty = confidencePct >= 80 ? 'Observed' : 'Likely';

  const headline = `OFFICIAL DISASTER ALERT: ${tier} Level ${hazardType} in ${villageName}, ${districtName}`;
  const description = `RAKSHA-NER Geological AI and IoT Telemetry detected high risk (${confidencePct}% confidence). Structural shear, steep terrain gradient, and severe soil saturation recorded. ${notes}`;
  const instruction = tier === 'DANGER'
    ? 'Evacuate high-risk slope zones immediately and report to the designated Multi-Purpose Disaster Shelter. Avoid unreinforced road embankments.'
    : 'Maintain vigilance, monitor official broadcasts, and prepare emergency kits.';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${identifier}</identifier>
  <sender>${sender}</sender>
  <sent>${sentIso}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <source>RAKSHA-NER Early Warning &amp; Operations Command</source>
  <scope>Public</scope>
  <restriction>None</restriction>
  <info>
    <language>en-IN</language>
    <category>Geo</category>
    <category>Safety</category>
    <event>${hazardType === 'LANDSLIDE' ? 'Landslide and Slope Deformation' : 'Flash Flood Inundation'}</event>
    <responseType>${tier === 'DANGER' ? 'Evacuate' : 'Monitor'}</responseType>
    <urgency>${urgency}</urgency>
    <severity>${severity}</severity>
    <certainty>${certainty}</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>${tier === 'DANGER' ? 'EVI' : 'LAE'}</value>
    </eventCode>
    <headline>${headline}</headline>
    <description>${description}</description>
    <instruction>${instruction}</instruction>
    <web>https://raksha-ner.gov.in/alerts/${alertCode}</web>
    <contact>${officerName} | SDMA State Emergency Operations Center</contact>
    <parameter>
      <valueName>ConfidencePercentage</valueName>
      <value>${confidencePct}%</value>
    </parameter>
    <parameter>
      <valueName>StandardCompliance</valueName>
      <value>OASIS-CAP-v1.2 / ITU-T X.1303</value>
    </parameter>
    <area>
      <areaDesc>${villageName} Catchment, District of ${districtName}</areaDesc>
      <circle>${lat},${lon},3.5</circle>
    </area>
  </info>
</alert>`.trim();

  return {
    identifier,
    sender,
    sentIso,
    xml,
    standard: 'OASIS CAP v1.2',
    gatewayTarget: 'NDMA SACHET (Pending Government Authorization & Live Credentials)',
  };
};
