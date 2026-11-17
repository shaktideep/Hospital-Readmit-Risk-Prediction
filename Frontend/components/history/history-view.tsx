'use client'

import Link from 'next/link'
import { HardDrive, Stethoscope, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { clearRecords, useHistory, useHydrated } from '@/lib/history'
import { PredictionTable } from './prediction-table'

export function HistoryView() {
  const records = useHistory()
  const hydrated = useHydrated()
  const live = records.filter((r) => r.source === 'live').length
  const demo = records.length - live

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Prediction history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hydrated ? `${live} live · ${demo} demo record${demo === 1 ? '' : 's'}` : 'Loading saved records…'}
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" disabled={records.length === 0}>
                  <Trash2 />
                  Clear all
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all prediction records?</AlertDialogTitle>
                <AlertDialogDescription>
                  {`This permanently removes ${records.length} record${records.length === 1 ? '' : 's'} from this browser. This cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    clearRecords()
                    toast('History cleared')
                  }}
                >
                  Clear all records
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button render={<Link href="/predict" />} nativeButton={false}>
            <Stethoscope />
            New prediction
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
        <HardDrive className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-muted-foreground text-pretty">
          History is stored only in this browser’s localStorage. It is not shared across devices or users and is not a
          hospital record system. No names or contact details are stored — only model features and results.
        </p>
      </div>

      {hydrated ? (
        <PredictionTable
          records={records}
          emptyAction={
            <Button render={<Link href="/predict" />} nativeButton={false}>
              <Stethoscope />
              Run first prediction
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2" aria-label="Loading history">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}
    </div>
  )
}
