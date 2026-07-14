/** Map English share-meta strings from the API to localized labels. */
export function translateShareMeta(
  t: (key: string) => string,
  meta: {
    accessLabel?: string;
    detailLabel?: string;
    description?: string;
    accessDescription?: string;
  }
) {
  const accessMap: Record<string, string> = {
    'Partner access': t('share.partnerAccess'),
    'Public listing': t('share.publicListing'),
    'Private link': t('share.privateLink'),
  };
  const detailMap: Record<string, string> = {
    'Trust summary': t('share.summary'),
    'Full history': t('share.full'),
    Hidden: t('share.hidden'),
  };
  const descMap: Record<string, string> = {
    'Dates, mileage, service types, and verification status only.': t('share.summaryDescApi'),
    'Includes garage names, costs, notes, shop verification details, and proof counts.':
      t('share.fullDescApi'),
  };
  const accessDescMap: Record<string, string> = {
    'Opened with a valid partner key (insurer, dealer, or integration).': t('share.accessPartnerDesc'),
    'Intended for classified ads and listings — VIN visible even in summary mode.':
      t('share.accessPublicDesc'),
    'Unlisted — only people you send the link to can open this page.': t('share.accessPrivateDesc'),
  };

  return {
    accessLabel: (meta.accessLabel && accessMap[meta.accessLabel]) || meta.accessLabel || '',
    detailLabel: (meta.detailLabel && detailMap[meta.detailLabel]) || meta.detailLabel || '',
    description: (meta.description && descMap[meta.description]) || meta.description || '',
    accessDescription:
      (meta.accessDescription && accessDescMap[meta.accessDescription]) ||
      meta.accessDescription ||
      '',
  };
}
