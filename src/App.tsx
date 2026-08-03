import { useCallback, useRef, useState } from "react"
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

  const handleRendererReady = useCallback((r: HoloRenderer) => {
    rendererRef.current = r
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        settings={settings}
        imageName={imageName}
        exporting={exporting}
        onChange={patch}
        onUpload={handleUpload}
        onExport={handleExport}
        onReset={() => setSettings(defaultSettings)}
      />
      <main
        className="flex min-w-0 flex-1 items-center justify-center p-8"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) void handleUpload(f)
        }}
      >
        <StickerCanvas
          image={image}
          imgAspect={imgAspect}
          settings={settings}
          onRendererReady={handleRendererReady}
        />
      </main>
    </div>
  )
}
