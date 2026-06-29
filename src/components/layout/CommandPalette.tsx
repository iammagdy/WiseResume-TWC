import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SearchHighlight } from '@/components/ui/SearchHighlight';
import { useResumes } from '@/hooks/useResumes';
import { useAppwriteTailoredIds } from '@/hooks/useTailorHistory';
import {
  getWorkspaceGroupLabel,
  searchResumes,
  searchWorkspaceItems,
  type WorkspaceSearchGroup,
  type WorkspaceSearchItem,
} from '@/lib/workspaceSearch';
import {
  SEARCH_OPEN_INTENT_KEY,
  SEARCH_PREFILL_KEY,
  type WorkspaceSearchOpenDetail,
} from '@/lib/workspaceSearchEvents';
import { haptics } from '@/lib/haptics';

function WorkspaceResultItem({
  item,
  query,
  onSelect,
}: {
  item: WorkspaceSearchItem;
  query: string;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <CommandItem
      value={`${item.id}-${item.label}`}
      onSelect={onSelect}
      className="items-start gap-3 py-2.5"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          <SearchHighlight text={item.label} query={query} />
        </p>
        {item.description ? (
          <p className="truncate text-xs text-muted-foreground">
            <SearchHighlight text={item.description} query={query} />
          </p>
        ) : null}
      </div>
    </CommandItem>
  );
}

export function CommandPalette() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();
  const { data: resumes = [] } = useResumes();
  const { data: tailoredIds = new Set<string>() } = useAppwriteTailoredIds();

  const openWithPrefill = useCallback((prefill = '') => {
    setInputValue(prefill);
    sessionStorage.removeItem(SEARCH_PREFILL_KEY);
    sessionStorage.removeItem(SEARCH_OPEN_INTENT_KEY);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SEARCH_OPEN_INTENT_KEY)) {
      const prefill = sessionStorage.getItem(SEARCH_PREFILL_KEY) ?? '';
      openWithPrefill(prefill);
    }

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setInputValue('');
            return false;
          }
          openWithPrefill('');
          return true;
        });
      }
    };

    const openHandler = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceSearchOpenDetail>).detail;
      openWithPrefill(detail?.prefill ?? sessionStorage.getItem(SEARCH_PREFILL_KEY) ?? '');
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('open-command-palette', openHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-command-palette', openHandler);
    };
  }, [openWithPrefill]);

  const resumeResults = useMemo(
    () => searchResumes(resumes, inputValue, tailoredIds),
    [resumes, inputValue, tailoredIds],
  );

  const workspaceResults = useMemo(
    () => searchWorkspaceItems(inputValue),
    [inputValue],
  );

  const groupedWorkspace = useMemo(() => {
    const groups: Record<Exclude<WorkspaceSearchGroup, 'resumes'>, WorkspaceSearchItem[]> = {
      actions: [],
      ai: [],
      navigation: [],
    };
    for (const item of workspaceResults) {
      groups[item.group].push(item);
    }
    return groups;
  }, [workspaceResults]);

  const hasResults = resumeResults.length > 0 || workspaceResults.length > 0;

  const go = useCallback((path: string) => {
    haptics.light();
    setOpen(false);
    setInputValue('');
    navigate(path);
  }, [navigate]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setInputValue('');
  }, []);

  const renderWorkspaceGroup = (group: Exclude<WorkspaceSearchGroup, 'resumes'>) => {
    const items = groupedWorkspace[group];
    if (items.length === 0) return null;
    return (
      <CommandGroup key={group} heading={t(`search.groups.${group}`, getWorkspaceGroupLabel(group))}>
        {items.map((item) => {
          const localizedItem = {
            ...item,
            label: t(`search.items.${item.id}.label`, item.label),
            description: item.description ? t(`search.items.${item.id}.description`, item.description) : undefined,
          };
          return (
            <WorkspaceResultItem
              key={item.id}
              item={localizedItem}
              query={inputValue}
              onSelect={() => go(item.path)}
            />
          );
        })}
      </CommandGroup>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder={t('app.dashboardPage.searchPlaceholderCommand', 'Search resumes, keywords, tools...')}
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList className="max-h-[min(60vh,28rem)]">
        {!hasResults ? <CommandEmpty>{t('common.noMatchesFound', 'No results found.')}</CommandEmpty> : null}

        {resumeResults.length > 0 ? (
          <CommandGroup heading={t('search.groups.resumes', getWorkspaceGroupLabel('resumes'))}>
            {resumeResults.map((result) => {
              const localizedResult = {
                ...result,
                label: result.label === 'Untitled resume' ? t('search.untitledResume', 'Untitled resume') : result.label,
                description: result.description === 'Tailored resume' ? t('search.tailoredResume', 'Tailored resume') : result.description,
              };
              return (
                <CommandItem
                  key={localizedResult.id}
                  value={`resume-${localizedResult.id}-${localizedResult.label}`}
                  onSelect={() => go(localizedResult.path)}
                  className="items-start gap-3 py-2.5"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="truncate text-sm font-medium">
                        <SearchHighlight text={localizedResult.label} query={inputValue} />
                      </p>
                      {localizedResult.tailored ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {t('search.tailoredBadge', 'Tailored')}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      <SearchHighlight text={localizedResult.description} query={inputValue} />
                    </p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        {renderWorkspaceGroup('actions')}
        {renderWorkspaceGroup('ai')}
        {renderWorkspaceGroup('navigation')}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
