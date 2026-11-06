import { buildReportHtml, type ReportMember } from './engine/report';
import { toIsoDate } from './engine/format';

/**
 * Render the benchmark report to a landscape PDF and open the share sheet.
 * expo-print / expo-sharing are loaded on demand so an app binary built
 * without them only fails this action, not the screens that import this file.
 */
export async function shareBenchmarkPdf(opts: {
  title: string;
  members: ReportMember[];
  includeGroupTable: boolean;
}): Promise<void> {
  let Print: typeof import('expo-print');
  let Sharing: typeof import('expo-sharing');
  try {
    Print = await import('expo-print');
    Sharing = await import('expo-sharing');
  } catch {
    throw new Error('PDF export needs the latest version of the app. Please update and try again.');
  }
  const html = buildReportHtml({ ...opts, generatedOn: toIsoDate(new Date()) });
  // US Letter, landscape: 14 test columns need the width.
  const { uri } = await Print.printToFileAsync({ html, width: 792, height: 612 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: opts.title });
}
