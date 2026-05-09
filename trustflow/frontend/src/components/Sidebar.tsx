"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  PlusCircle, 
  ShieldCheck, 
  HelpCircle, 
  LogOut,
  Shield
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function Sidebar() {
  const pathname = usePathname();
  const { address, disconnect } = useWallet();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Create Escrow", href: "/escrow/create", icon: PlusCircle },
    { name: "How It Works", href: "/how-it-works", icon: HelpCircle },
  ];

  return (
    <div className="w-64 bg-gray-900 h-screen flex flex-col fixed left-0 top-0 border-r border-gray-800 text-gray-400">
      <div className="p-6 flex items-center gap-3 text-white">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">TrustFlow</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-brand-500/10 text-brand-400 font-medium" 
                  : "hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-brand-400" : "text-gray-500"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-2xl p-4 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Connected Wallet</div>
          <div className="text-xs font-mono text-gray-300 truncate">
            {address || "Not connected"}
          </div>
        </div>
        <button 
          onClick={disconnect}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    </div>
  );
}
