export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
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
