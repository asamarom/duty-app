import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, FlaskConical } from 'lucide-react';
import { TEST_USERS, type TestUserKey } from '@/lib/testAuth';

interface TestLoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export function TestLoginForm({ onLogin }: TestLoginFormProps) {
  const [selectedUser, setSelectedUser] = useState<TestUserKey | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setError(null);

    const user = TEST_USERS[selectedUser];
    const { error: loginError } = await onLogin(user.email, user.password);

    if (loginError) {
      setError(loginError.message);
      setIsSubmitting(false);
    }
  };

  const userOptions = Object.entries(TEST_USERS).map(([key, user]) => ({
    key: key as TestUserKey,
    label: user.displayName,
    description: `${user.role === 'none' ? 'No role' : user.role} | ${user.approvalStatus === 'none' ? 'No request' : user.approvalStatus}`,
  }));

  return (
    <Card className="card-tactical mt-4 border-yellow-500/50" data-testid="test-login-form">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-base text-yellow-500">TEST MODE</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Development testing only - not available in production
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs text-yellow-200">
            Test users are seeded in the database. Make sure to run the seed script first.
          </AlertDescription>
        </Alert>

        <Select
          value={selectedUser}
          onValueChange={(value) => setSelectedUser(value as TestUserKey)}
        >
          <SelectTrigger data-testid="test-user-select">
            <SelectValue placeholder="Select a test user..." />
          </SelectTrigger>
          <SelectContent>
            {userOptions.map((option) => (
              <SelectItem key={option.key} value={option.key} data-testid={`test-user-${option.key}`}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          className="w-full border-yellow-500/50 hover:bg-yellow-500/10"
          onClick={() => void handleSubmit()}
          disabled={!selectedUser || isSubmitting}
          data-testid="test-login-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in as test user...
            </>
          ) : (
            <>
              <FlaskConical className="mr-2 h-4 w-4" />
              Sign in as Test User
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
