import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import type {
  HoloPattern,
  PeelDirection,
  StickerSettings,
} from "@/lib/settings"

interface Props {
  settings: StickerSettings
  imageName: string | null
  exporting: boolean
  onChange: (patch: Partial<StickerSettings>) => void
  onUpload: (file: File) => void
  onExport: () => void
  onReset: () => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

const peelDirections: { value: PeelDirection; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top", label: "Top" },
  { value: "top-right", label: "Top right" },
  { value: "right", label: "Right" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "left", label: "Left" },
]

export function Sidebar({
  settings,
  imageName,
  exporting,
  onChange,
  onUpload,
  onExport,
  onReset,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-4 py-4">
        <h1 className="text-sm font-semibold tracking-tight">
          Holostick Studio
        </h1>
        <p className="text-xs text-muted-foreground">
          Holographic sticker maker
        </p>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4">
          {/* Artwork */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Artwork
            </h2>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
                e.target.value = ""
              }}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              {imageName ? "Replace artwork" : "Upload SVG / PNG"}
            </Button>
            {imageName && (
              <p className="truncate text-xs text-muted-foreground">
                {imageName}
              </p>
            )}
            <SliderRow
              label="Sticker size"
              value={settings.size}
              min={0.3}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ size: v })}
            />
            <SliderRow
              label="Die-cut border"
              value={settings.border}
              min={0}
              max={0.08}
              step={0.001}
              format={(v) => v.toFixed(3)}
              onChange={(v) => onChange({ border: v })}
            />
          </section>

          <Separator />

          {/* Holographic foil */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Holographic foil
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Pattern</Label>
              <Select
                value={settings.pattern}
                onValueChange={(v) => onChange({ pattern: v as HoloPattern })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear bands</SelectItem>
                  <SelectItem value="radial">Radial burst</SelectItem>
                  <SelectItem value="patches">Foil patches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Intensity"
              value={settings.holoIntensity}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ holoIntensity: v })}
            />
            <SliderRow
              label="Band frequency"
              value={settings.bands}
              min={1}
              max={20}
              step={0.5}
              format={(v) => v.toFixed(1)}
              onChange={(v) => onChange({ bands: v })}
            />
            <SliderRow
              label="Hue shift"
              value={settings.hueShift}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 360)}°`}
              onChange={(v) => onChange({ hueShift: v })}
            />
            <SliderRow
              label="Grain / sparkle"
              value={settings.grain}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ grain: v })}
            />
            <SliderRow
              label="Light X"
              value={settings.light.x}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) =>
                onChange({ light: { ...settings.light, x: v } })
              }
            />
            <SliderRow
              label="Light Y"
              value={settings.light.y}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) =>
                onChange({ light: { ...settings.light, y: v } })
              }
            />
          </section>

          <Separator />

          {/* Peel */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Peel
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Direction</Label>
              <Select
                value={settings.peelDirection}
                onValueChange={(v) =>
                  onChange({ peelDirection: v as PeelDirection })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {peelDirections.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Peel amount"
              value={settings.peelAmount}
              min={0}
              max={0.9}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ peelAmount: v })}
            />
            <SliderRow
              label="Curl radius"
              value={settings.curl}
              min={0.02}
              max={0.25}
              step={0.005}
              onChange={(v) => onChange({ curl: v })}
            />
            <SliderRow
              label="Shadow"
              value={settings.shadow}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ shadow: v })}
            />
          </section>

          <Separator />

          {/* Scene & export */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scene &amp; export
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Background</Label>
              <Select
                value={settings.background}
                onValueChange={(v) =>
                  onChange({
                    background: v as StickerSettings["background"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Export size</Label>
              <Select
                value={String(settings.exportSize)}
                onValueChange={(v) => onChange({ exportSize: Number(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024">1024 × 1024</SelectItem>
                  <SelectItem value="2048">2048 × 2048</SelectItem>
                  <SelectItem value="4096">4096 × 4096</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!imageName || exporting}
              onClick={onExport}
            >
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={onReset}>
              Reset settings
            </Button>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
