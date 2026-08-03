import { useCallback, useRef, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sidebar } from "@/components/Sidebar"
import { StickerCanvas } from "@/components/StickerCanvas"
import { loadImageFile } from "@/lib/load-image"
import type { HoloRenderer } from "@/lib/three-renderer"
import { defaultSettings, type StickerSettings } from "@/lib/settings"

export default function App() {
  const [settings, setSettings] = useState<StickerSettings>(defaultSettings)
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [imgAspect, setImgAspect] = useState(1)
  const [imageName, setImageName] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const rendererRef = useRef<HoloRenderer | null>(null)

  const patch = useCallback(
    (p: Partial<StickerSettings>) => setSettings((s) => ({ ...s, ...p })),
    [],
  )

  const handleUpload = useCallback(async (file: File) => {
    try {
      const loaded = await loadImageFile(file)
      setImage(loaded.bitmap)
      setImgAspect(loaded.aspect)
      setImageName(loaded.name)
    } catch {
      alert("Could not load that file. Try an SVG, PNG, JPG, or WebP.")
    }
  }, [])

  const handleExport = useCallback(async () => {
    const renderer = rendererRef.current
    if (!renderer) return
    setExporting(true)
    try {
      const blob = await renderer.exportPNG({ settings, imgAspect })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(imageName ?? "sticker").replace(/\.[^.]+$/, "")}-holo.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [settings, imgAspect, imageName])

  const handleRemoveImage = useCallback(() => {
    setImage(null)
    setImgAspect(1)
    setImageName(null)
  }, [])

  const handleExportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "holosticker-settings.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [settings])

  const handleImportSettings = useCallback(async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<StickerSettings>
      // only accept known keys so a foreign JSON can't inject junk
      const patchObj: Partial<StickerSettings> = {}
      for (const key of Object.keys(defaultSettings) as (keyof StickerSettings)[]) {
        if (key in parsed) {
          ;(patchObj as Record<string, unknown>)[key] = parsed[key]
        }
      }
      setSettings({ ...defaultSettings, ...patchObj })
    } catch {
      alert("Could not read that settings file.")
    }
  }, [])

  const handleRendererReady = useCallback((r: HoloRenderer) => {
    rendererRef.current = r
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        settings={settings}
        imageName={imageName}
        onChange={patch}
        onUpload={handleUpload}
        onRemove={handleRemoveImage}
        onExportSettings={handleExportSettings}
        onImportSettings={handleImportSettings}
        onReset={() => setSettings(defaultSettings)}
      />
      <main
        className="relative flex min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void handleUpload(f)
        }}
      >
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b bg-background px-4">
          <Select
            value={String(settings.exportSize)}
            onValueChange={(v) => patch({ exportSize: Number(v) })}
          >
            <SelectTrigger aria-label="Export size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1024">1024 × 1024</SelectItem>
              <SelectItem value="2048">2048 × 2048</SelectItem>
              <SelectItem value="4096">4096 × 4096</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={!image || exporting} onClick={handleExport}>
            <Download aria-hidden />
            {exporting ? "Exporting…" : "Export PNG"}
          </Button>
        </header>
        <div
          aria-hidden
          className={
            "pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-ring/60 bg-background/60 transition-opacity duration-150 ease-out " +
            (dragging ? "opacity-100" : "opacity-0")
          }
        >
          <p className="text-sm font-medium text-muted-foreground">
            Drop artwork to upload
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <StickerCanvas
            image={image}
            imgAspect={imgAspect}
            settings={settings}
            onRendererReady={handleRendererReady}
          />
        </div>
        {/* handwritten "follow me on x" note + arrow pointing at the pill */}
        {/* handwritten note; the arrow tip lands on the X icon in the pill */}
        <a
          href="https://x.com/jalcowastaken"
          target="_blank"
          rel="noreferrer"
          aria-label="Follow jalcowastaken on X"
          className="group absolute bottom-16 right-[5.5rem] flex flex-col items-end select-none text-violet-500 transition-colors hover:text-fuchsia-500"
        >
          <span
            className="block -rotate-6 pr-8 text-lg transition-transform group-hover:-rotate-3 group-hover:scale-105"
            style={{
              fontFamily: '"Bradley Hand", "Segoe Script", "Comic Sans MS", cursive',
            }}
          >
            follow me on x
          </span>
          <svg
            viewBox="0 0 48 40"
            width="48"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="-mr-4 transition-transform group-hover:translate-y-0.5"
          >
            <path d="M6 4c18 4 32 14 36 30" />
            <path d="M35 28l7 7 3-10" />
          </svg>
        </a>
        <div className="absolute right-4 bottom-4 flex items-center gap-0.5 rounded-full border bg-background/80 p-1 shadow-sm backdrop-blur">
          <a
            href="https://x.com/jalcowastaken"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow jalcowastaken on X"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
            </svg>
          </a>
          <a
            href="https://github.com/jal-co/holosticker"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  )
}
