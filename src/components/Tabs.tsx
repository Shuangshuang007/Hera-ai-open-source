interface TabsProps {
  children: React.ReactNode;
}

export function Tabs({ children }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex">
        {children}
      </nav>
    </div>
  );
} 