import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { JDWriterForm } from '@/components/wisehire/jd-writer/JDWriterForm';
import { JDInlineEditor, JDData } from '@/components/wisehire/jd-writer/JDInlineEditor';
import { JDLibrary } from '@/components/wisehire/jd-writer/JDLibrary';
import { JDSkeleton } from '@/components/wisehire/jd-writer/JDSkeleton';
import { useJDs } from '@/hooks/wisehire/useJDs';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Library } from 'lucide-react';

export default function JDWriterPage() {
  const [generatedJD, setGeneratedJD] = useState<JDData | null>(null);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);
  const { data: roles = [], isLoading: rolesLoading, saveJD, deleteJD } = useJDs();
  const { company } = useWiseHireAccount();

  function handleResult(jd: JDData, roleId: string | null) {
    setGeneratedJD(jd);
    setSavedRoleId(roleId);
  }

  async function handleSave(jdText: string) {
    if (!savedRoleId) return;
    await saveJD.mutateAsync({ roleId: savedRoleId, jdText });
  }

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AI Job Description Writer
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Describe a role and let AI draft a professional job description in seconds.
          </p>
        </div>

        <Tabs defaultValue="write">
          <TabsList className="mb-4">
            <TabsTrigger value="write" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Write
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-1.5">
              <Library className="h-3.5 w-3.5" />
              Saved JDs
              {roles.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-1.5">
                  {roles.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-5">
            <JDWriterForm roles={roles} onResult={handleResult} />

            {generatedJD ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
                  {savedRoleId ? 'Edit below and save to update the role.' : 'Edit below — use Copy to export or save to a role.'}
                </p>
                <JDInlineEditor
                  jd={generatedJD}
                  onSave={savedRoleId ? handleSave : undefined}
                  isSaving={saveJD.isPending}
                />
              </div>
            ) : (
              rolesLoading ? <JDSkeleton /> : (
                <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your generated JD will appear here. Describe the role above to get started.
                  </p>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="library">
            <JDLibrary
              roles={roles}
              isLoading={rolesLoading}
              onDelete={(id) => deleteJD.mutate(id)}
              isDeleting={deleteJD.isPending}
              companySlug={company?.slug ?? null}
            />
          </TabsContent>
        </Tabs>
      </div>
    </WiseHireShell>
  );
}
