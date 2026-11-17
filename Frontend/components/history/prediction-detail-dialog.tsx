'use client'

import { ClipboardCopy, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ResultDetails, ResultHero, useResultActions } from '@/components/prediction/result-view'
import { deleteRecord } from '@/lib/history'
import type { PredictionRecord } from '@/lib/types'

function Body({ record, onClose }: { record: PredictionRecord; onClose: () => void }) {
  const actions = useResultActions(record)
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-mono">{record.ref}</DialogTitle>
        <DialogDescription>
          {record.source === 'demo' ? 'Demo record — synthetic, not a live model result.' : 'Saved live prediction from this browser.'}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6">
        <ResultHero record={record} compact />
        <ResultDetails record={record} />
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive sm:mr-auto"
          onClick={() => {
            deleteRecord(record.ref)
            toast('Record deleted')
            onClose()
          }}
        >
          <Trash2 />
          Delete
        </Button>
        <Button variant="outline" onClick={actions.copySummary}>
          <ClipboardCopy />
          Copy summary
        </Button>
        <Button variant="outline" onClick={actions.download}>
          <Download />
          Download report
        </Button>
      </DialogFooter>
    </>
  )
}

export function PredictionDetailDialog({ record, onClose }: { record: PredictionRecord | null; onClose: () => void }) {
  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        {record && <Body record={record} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
