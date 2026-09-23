import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ce-shell">
      <Sidebar />
      <div className="ce-workspace">
        <Header />
        <main className="ce-main">{children}</main>
      </div>
    </div>
  );
}
