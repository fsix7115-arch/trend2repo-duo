import Link from 'next/link';
import { Compass, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </span>
          Trend2Repo <span className="text-muted-foreground">Duo</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <Compass className="mr-2 h-4 w-4" />
              Scout
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
