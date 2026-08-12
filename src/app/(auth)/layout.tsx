export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">鸿信ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            员工客户管理系统
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
