import { useState } from "react"
import { Dialog } from "radix-ui"
import { Check, Copy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { buildIntegrationInstructions } from "@/lib/react-export"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComponentExportDialog({ open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false)
  const instructions = buildIntegrationInstructions()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-4 shadow-lg outline-none">
          <div className="mb-1 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">
              Component downloaded
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
              >
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Two files: <code>holo-sticker.tsx</code> and{" "}
            <code>holo-sticker-art.png</code>. Paste these instructions to
            your agent, or follow them yourself.
          </p>
          <div className="overflow-hidden rounded-lg border bg-muted/40">
            <div className="flex items-center justify-between border-b bg-muted/60 py-1 pl-3 pr-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Instructions
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(instructions)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <ScrollArea className="overflow-hidden [&>[data-slot=scroll-area-viewport]]:max-h-[45dvh]">
              <pre className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {instructions}
              </pre>
            </ScrollArea>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
