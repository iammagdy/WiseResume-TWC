import { useLocale } from '@/i18n/LocaleProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';

interface JobFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedSeniority: string;
  onSeniorityChange: (seniority: string) => void;
  salaryPeriod: string;
  onSalaryPeriodChange: (period: string) => void;
  minSalary: number | undefined;
  onMinSalaryChange: (min: number | undefined) => void;
  hasSalaryOnly: boolean;
  onHasSalaryOnlyChange: (has: boolean) => void;
  showOlder: boolean;
  onShowOlderChange: (show: boolean) => void;
  onReset: () => void;
  activeFilterCount: number;
}

const SOURCES = [
  'remotive',
  'weworkremotely',
  'jobicy',
  'remoteok',
  'arbeitnow',
  'himalayas',
  'greenhouse',
  'lever',
];

export function JobFiltersSheet({
  open,
  onOpenChange,
  selectedSource,
  onSourceChange,
  selectedRegion,
  onRegionChange,
  selectedSeniority,
  onSeniorityChange,
  salaryPeriod,
  onSalaryPeriodChange,
  minSalary,
  onMinSalaryChange,
  hasSalaryOnly,
  onHasSalaryOnlyChange,
  showOlder,
  onShowOlderChange,
  onReset,
  activeFilterCount
}: JobFiltersSheetProps) {
  const { t, direction } = useLocale();
  const isRtl = direction === 'rtl';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] flex flex-col p-0 rounded-t-xl" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="p-4 sm:p-6 pb-2 border-b">
          <SheetHeader className="text-start">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                {t('jobs.filters', 'Filters')}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </SheetTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('common.reset', 'Reset')}
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Source Filter */}
          <div className="space-y-2">
            <Label>{t('jobs.source', 'Data Source')}</Label>
            <Select value={selectedSource} onValueChange={onSourceChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('jobs.allSources', 'All Sources')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('jobs.allSources', 'All Sources')}</SelectItem>
                {SOURCES.map(source => (
                  <SelectItem key={source} value={source}>
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter */}
          <div className="space-y-2">
            <Label>{t('jobs.region', 'Region Fit')}</Label>
            <Select value={selectedRegion} onValueChange={onRegionChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('jobs.allRegions', 'All Regions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('jobs.allRegions', 'All Regions')}</SelectItem>
                <SelectItem value="worldwide">{t('jobs.worldwide', 'Worldwide / Global')}</SelectItem>
                <SelectItem value="egypt_friendly">{t('jobs.egyptFriendly', 'Egypt-Friendly')}</SelectItem>
                <SelectItem value="gulf_friendly">{t('jobs.gulfFriendly', 'Gulf-Friendly')}</SelectItem>
                <SelectItem value="mena">{t('jobs.mena', 'MENA Region')}</SelectItem>
                <SelectItem value="emea">{t('jobs.emea', 'EMEA Region')}</SelectItem>
                <SelectItem value="europe">{t('jobs.europeOnly', 'Europe Friendly')}</SelectItem>
                <SelectItem value="us_only">{t('jobs.usaOnly', 'US Only')}</SelectItem>
                <SelectItem value="timezone_flexible">{t('jobs.timezoneFlexible', 'Timezone Flexible')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seniority Filter */}
          <div className="space-y-2">
            <Label>{t('jobs.seniorityLevel', 'Seniority Level')}</Label>
            <Select value={selectedSeniority} onValueChange={onSeniorityChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('jobs.anySeniority', 'All Seniorities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('jobs.anySeniority', 'All Seniorities')}</SelectItem>
                <SelectItem value="entry_level">{t('jobs.entryLevel', 'Entry Level / Grad')}</SelectItem>
                <SelectItem value="junior">{t('jobs.junior', 'Junior')}</SelectItem>
                <SelectItem value="mid">{t('jobs.midLevel', 'Mid Level')}</SelectItem>
                <SelectItem value="senior">{t('jobs.senior', 'Senior')}</SelectItem>
                <SelectItem value="lead">{t('jobs.lead', 'Lead / Manager')}</SelectItem>
                <SelectItem value="internship">{t('jobs.internship', 'Internship')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salary Minimum */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('jobs.minimumSalary', 'Minimum Salary')}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={minSalary ?? ''}
                  onChange={(e) => onMinSalaryChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 50000"
                  className="flex-1"
                />
                <Select value={salaryPeriod} onValueChange={onSalaryPeriodChange}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">{t('jobs.yearly', 'Yearly')}</SelectItem>
                    <SelectItem value="monthly">{t('jobs.monthly', 'Monthly')}</SelectItem>
                    <SelectItem value="hourly">{t('jobs.hourly', 'Hourly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="has-salary" className="cursor-pointer">
                {t('jobs.hasSalaryOnly', 'Must have salary range')}
              </Label>
              <Switch
                id="has-salary"
                checked={hasSalaryOnly}
                onCheckedChange={onHasSalaryOnlyChange}
              />
            </div>
          </div>

          {/* Freshness Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-older" className="cursor-pointer">
                {t('jobs.showOlder', 'Include jobs older than 30 days')}
              </Label>
            </div>
            <Switch
              id="show-older"
              checked={showOlder}
              onCheckedChange={onShowOlderChange}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t bg-background mt-auto">
          <Button className="w-full" size="lg" onClick={() => onOpenChange(false)}>
            {t('jobs.applyFilters', 'Apply Filters')} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
