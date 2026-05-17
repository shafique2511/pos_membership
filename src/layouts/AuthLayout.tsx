import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold">Luxantara Members</h1>
          <p className="mt-2 text-sm text-muted-foreground">Private membership, booking, and POS operations.</p>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
