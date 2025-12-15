import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Shield,
  Bell,
  Database,
  Cloud,
  Lock,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="tactical-grid min-h-screen p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                System Settings
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure application preferences and security settings
              </p>
            </div>
            <Badge variant="tactical" className="px-3 py-1">
              <Lock className="mr-1 h-3 w-3" />
              Admin Access
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Unit Information */}
            <Card className="card-tactical border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Unit Information</CardTitle>
                    <CardDescription>
                      Basic unit identification and configuration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Designation</Label>
                    <Input
                      defaultValue="2nd Platoon, Alpha Company"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Unit</Label>
                    <Input
                      defaultValue="1st Battalion, 501st Infantry Regiment"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Installation</Label>
                    <Input
                      defaultValue="Fort Bragg, NC"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Zone</Label>
                    <Select defaultValue="est">
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="cst">Central Time (CST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="card-tactical border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                    <Bell className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Configure alert and notification preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">License Expiration Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Notify when driver's licenses are expiring
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Equipment Status Changes</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when equipment becomes unserviceable
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Daily Report Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Remind to submit daily accountability report
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Access Control */}
            <Card className="card-tactical border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                    <Users className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle>Access Control</CardTitle>
                    <CardDescription>Manage user roles and permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="rank">ADMIN</Badge>
                      <span className="text-sm text-foreground">Platoon Leader / PSG</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Full Access</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="tactical">LEADER</Badge>
                      <span className="text-sm text-foreground">Squad Leaders</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Squad-level Access</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">USER</Badge>
                      <span className="text-sm text-foreground">Soldiers</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Read-only</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sync Status */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                    <Cloud className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sync Status</CardTitle>
                    <CardDescription>Cloud synchronization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="success">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Sync</span>
                    <span className="text-sm text-foreground">2 min ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Changes</span>
                    <span className="text-sm text-foreground">0</span>
                  </div>
                  <Button variant="outline" className="w-full mt-2">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Data Management</CardTitle>
                    <CardDescription>Backup and export</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Export All Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Create Backup
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                  Clear Local Cache
                </Button>
              </CardContent>
            </Card>

            {/* Version Info */}
            <Card className="card-tactical border-border/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="font-mono text-xs text-muted-foreground">PMTB v1.0.0</p>
                  <p className="text-xs text-muted-foreground">
                    Platoon Management Tool Box
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Build 2024.01.15
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
