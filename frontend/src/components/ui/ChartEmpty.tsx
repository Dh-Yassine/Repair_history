import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ChartEmpty({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="chart-empty" role="status">
      <BarChart3 size={28} aria-hidden />
      <p>{message || t('analytics.chartEmpty')}</p>
    </div>
  );
}
