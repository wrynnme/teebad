'use client';
import { useAdminUsers } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { IconAlertCircle } from '@tabler/icons-react';

export function AdminUsers() {
  const { users, isLoading, error } = useAdminUsers();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <IconAlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">ยังไม่มีผู้เล่น</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground mb-1">{users.length} ผู้เล่น</p>
      {users.map((user) => (
        <Card key={user.line_user_id}>
          <CardContent className="pt-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.picture_url ?? undefined} />
                <AvatarFallback>{user.display_name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.display_name}</p>
                  {user.is_admin && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user.line_user_id}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium">{user.total_games} เกม</p>
                <p className="text-xs text-muted-foreground">
                  {user.total_wins} ชนะ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
