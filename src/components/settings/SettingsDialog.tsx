import { useLocalStorage } from '@/hooks/use-local-storage'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [autoHideControls, setAutoHideControls] = useLocalStorage('auto-hide-controls', 'true')
  const [startMiniMode, setStartMiniMode] = useLocalStorage('start-mini-mode', 'false')
  const [enableNotifications, setEnableNotifications] = useLocalStorage('enable-notifications', 'true')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glassmorphic border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
          <DialogDescription>
            Customize your YouTube Music desktop experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Playback
            </h3>
            
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-hide" className="text-sm font-medium">
                  Auto-hide Controls
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically hide controls after 3 seconds of inactivity
                </p>
              </div>
              <Switch
                id="auto-hide"
                checked={autoHideControls === 'true'}
                onCheckedChange={(checked) => setAutoHideControls(checked ? 'true' : 'false')}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Window
            </h3>
            
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="mini-mode" className="text-sm font-medium">
                  Start in Mini Player Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Launch app in compact mini player view
                </p>
              </div>
              <Switch
                id="mini-mode"
                checked={startMiniMode === 'true'}
                onCheckedChange={(checked) => setStartMiniMode(checked ? 'true' : 'false')}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notifications
            </h3>
            
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Enable Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show notifications for track changes and app events
                </p>
              </div>
              <Switch
                id="notifications"
                checked={enableNotifications === 'true'}
                onCheckedChange={(checked) => setEnableNotifications(checked ? 'true' : 'false')}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            YouTube Music Desktop • v1.0.0
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
