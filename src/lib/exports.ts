import Papa from 'papaparse';
import type { FeatureCollection } from 'geojson';
import type { CrmRecord, SpatialProject } from '../types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectsCsv(
  projects: SpatialProject[],
  crmMap: Record<string, CrmRecord>,
  filename = `regen-twin-ccc-outreach-${new Date().toISOString().slice(0, 10)}.csv`
) {
  const rows = projects.map((p) => {
    const crm = crmMap[p.id];
    return {
      'SCH / Project ID': p.schNumber,
      'Project Title': p.title,
      Source: p.source,
      Status: p.status,
      'CEQA Pathway': p.ceqaPathway,
      'Document / Authority': p.exemptStatus,
      County: p.counties.join('; '),
      'Lead Agency': p.leadAgency,
      'Contact Name': crm?.contactNameOverride || p.contactName,
      'Contact Email': crm?.contactEmailOverride || p.contactEmail,
      'Contact Phone': crm?.contactPhoneOverride || p.contactPhone,
      'Treatment Categories': p.treatmentCategories.join('; '),
      'Total Acres': p.totalAcres,
      'Rx Broadcast Acres': p.rxBroadcastAcres,
      'Rx Pile Acres': p.rxPileAcres,
      'Manual Prep Acres': p.manualAcres,
      'Distance From Origin (mi)': p.distanceFromOriginMiles,
      'Distance From 3 Suns (mi)': p.distanceFromThreeSunsMiles,
      'Outreach Status': crm?.outreachStatus ?? 'Not Contacted',
      'Outreach Notes': crm?.notes ?? '',
      'PSA / CEQAnet Link': p.psaLink,
    };
  });

  const csv = Papa.unparse(rows);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportProjectsGeoJson(
  projects: SpatialProject[],
  crmMap: Record<string, CrmRecord>,
  filename = `regen-twin-spatial-layer-${new Date().toISOString().slice(0, 10)}.geojson`
) {
  const fc: FeatureCollection = {
    type: 'FeatureCollection',
    features: projects.map((p) => {
      const crm = crmMap[p.id];
      return {
        type: 'Feature',
        geometry: p.geometry,
        properties: {
          id: p.id,
          schNumber: p.schNumber,
          title: p.title,
          source: p.source,
          status: p.status,
          ceqaPathway: p.ceqaPathway,
          exemptStatus: p.exemptStatus,
          county: p.county,
          counties: p.counties,
          leadAgency: p.leadAgency,
          contactName: crm?.contactNameOverride || p.contactName,
          contactEmail: crm?.contactEmailOverride || p.contactEmail,
          contactPhone: crm?.contactPhoneOverride || p.contactPhone,
          treatmentCategories: p.treatmentCategories,
          totalAcres: p.totalAcres,
          rxBroadcastAcres: p.rxBroadcastAcres,
          manualAcres: p.manualAcres,
          distanceFromOriginMiles: p.distanceFromOriginMiles,
          distanceFromThreeSunsMiles: p.distanceFromThreeSunsMiles,
          outreachStatus: crm?.outreachStatus ?? 'Not Contacted',
          outreachNotes: crm?.notes ?? '',
          psaLink: p.psaLink,
        },
      };
    }),
  };

  triggerDownload(
    new Blob([JSON.stringify(fc, null, 2)], {
      type: 'application/geo+json;charset=utf-8;',
    }),
    filename
  );
}

export function exportJsonBackup(payload: unknown) {
  const filename = `regen-twin-m1-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    }),
    filename
  );
}

export function generateReturnCaOutreachEmail(
  project: SpatialProject,
  crm?: CrmRecord
): { subject: string; body: string; to: string } {
  const contactName = crm?.contactNameOverride || project.contactName;
  const to = crm?.contactEmailOverride || project.contactEmail || '';
  const greeting = contactName ? `Dear ${contactName},` : `Hello ${project.leadAgency} Team,`;
  const acresText =
    project.totalAcres > 0
      ? `${project.totalAcres.toLocaleString()} acres`
      : 'your permitted treatment footprint';
  const pathwayText = `${project.ceqaPathway} (${project.exemptStatus})`;

  const subject = `CCC Project Sponsor / Burn-Prep Crew Partnership — ${project.title} (SCH / ID: ${project.schNumber})`;

  const body = `${greeting}

I am reaching out on behalf of Return California and 3 Suns Farm (based in Nevada City, CA — ${project.distanceFromThreeSunsMiles.toFixed(
    1
  )} miles from your project footprint in ${project.county} County).

We noticed ${project.title} (SCH / Project ID: ${
    project.schNumber
  }), cleared under ${pathwayText} covering ${acresText} (${project.treatmentCategories.join(
    ', '
  )}).

Return California is assembling Project Sponsor letters and shovel-ready site commitments for the upcoming January California Conservation Corps (CCC) grant cycle, alongside our trained Indigenous/cultural burn-prep and manual hand-crew capacity out of 3 Suns Farm. Because your project already holds active environmental clearance, we would love to explore serving as a contracted or grant-supported hand-crew / prescribed-burn prep partner to accelerate on-the-ground implementation at zero additional CEQA delay.

Would you have 15 minutes this week or next to discuss current implementation timelines, unit priorities, and whether a CCC Project Sponsor alignment makes sense for ${
    project.schNumber
  }?

Warm regards,
Return California // 3 Suns Farm Field Operations
13418 McKitrick Ranch Rd, Nevada City, CA 95959`;

  return { subject, body, to };
}
