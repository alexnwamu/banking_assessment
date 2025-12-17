interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    </header>
  );
}
