import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function AppHeader({ onMenuClick, showMenuButton }: AppHeaderProps) {
  const [user, setUser] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // First try to get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // If localStorage data is invalid, fetch from API
        authService.getCurrentUser().then((u) => setUser(u)).catch(() => setUser(null));
      }
    } else {
      // If no user in localStorage, fetch from API
      authService.getCurrentUser().then((u) => setUser(u)).catch(() => setUser(null));
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 md:px-6 bg-card border-b border-border">
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Search */}
      <GlobalSearch />

      {/* Right Section */}
      <div className="flex items-center gap-2 ml-auto">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
