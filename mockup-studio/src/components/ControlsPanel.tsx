import { useSession } from '../state/Session';
import BackgroundPicker from './BackgroundPicker';
import Segmented from './Segmented';
import UploadDropzone from './UploadDropzone';

export default function ControlsPanel({ photoMockup = false }: { photoMockup?: boolean }) {
  const { settings, update, resetPlacement, image } = useSession();
  const placed = settings.zoom !== 1 || settings.offsetX !== 0 || settings.offsetY !== 0;
  return (
    <div className="space-y-7">
      <UploadDropzone />

      <div className={image ? '' : 'pointer-events-none opacity-50'} aria-disabled={!image}>
        <div className="space-y-7">
          <Segmented
            legend="Image fit"
            value={settings.fit}
            onChange={(fit) => update({ fit, zoom: 1, offsetX: 0, offsetY: 0 })}
            options={[
              { value: 'fill', label: 'Fill screen' },
              { value: 'fit', label: 'Fit inside' },
            ]}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="zoom" className="label !mb-0">Zoom</label>
              <span className="text-xs tabular-nums text-muted">{Math.round(settings.zoom * 100)}%</span>
            </div>
            <input
              id="zoom"
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={settings.zoom}
              disabled={!image}
              onChange={(e) => update({ zoom: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted">Drag the design on the preview to reposition it.</p>
            {placed && (
              <button type="button" className="mt-2 text-xs font-semibold text-primary-ink hover:underline" onClick={resetPlacement}>
                Reset position and zoom
              </button>
            )}
          </div>
        </div>
      </div>

      {photoMockup ? (
        <p className="rounded-card bg-surface p-3 text-sm text-muted">
          This mockup is a photo, so its background and shadow are part of the picture.
        </p>
      ) : (
        <>
          <BackgroundPicker value={settings.background} onChange={(background) => update({ background })} />

          <Segmented
            legend="Picture shape"
            value={settings.stage.ratio}
            onChange={(ratio) => update({ stage: { ...settings.stage, ratio } })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: '1:1', label: '1:1' },
              { value: '4:3', label: '4:3' },
              { value: '16:9', label: '16:9' },
              { value: '4:5', label: '4:5' },
            ]}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="space" className="label !mb-0">Space around</label>
              <span className="text-xs tabular-nums text-muted">{Math.round(settings.stage.padding * 100)}%</span>
            </div>
            <input
              id="space"
              type="range"
              min={0}
              max={40}
              step={1}
              value={Math.round(settings.stage.padding * 100)}
              onChange={(e) => update({ stage: { ...settings.stage, padding: Number(e.target.value) / 100 } })}
              className="w-full accent-primary"
            />
          </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="label !mb-0">Soft shadow</span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.shadow}
          onChange={(e) => update({ shadow: e.target.checked })}
          className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
        />
      </label>
        </>
      )}
    </div>
  );
}
