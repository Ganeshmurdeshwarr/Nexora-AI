import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUp,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Coins,
  ImagePlus,
  LogOut,
  Mail,
  Plus,
  Settings,
  UserRound,
  Workflow,
  X,
  Trash2,
  Settings2,
} from "lucide-react";


import { logout } from "@/features/auth.js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDispatch, useSelector } from "react-redux";
import { clearUserData } from "@/redux/userSlice";

const hideScrollbar =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const darkPanel =
  "border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl";
const menuContent =
  "rounded-2xl border border-white/10 bg-[#1d2026]/95 p-1.5 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl";
const menuItem = "rounded-xl text-zinc-300 focus:bg-white/10 focus:text-white";
const menuSeparator = "bg-white/10";
const iconBtn =
  "size-9 rounded-xl border border-white/10 bg-white/[0.05] p-0 text-zinc-300 hover:bg-white/10 hover:text-white";
const whiteBtn =
  "rounded-xl border-0 bg-white text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900";

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.auth);
console.log(userData)

  const [logoutLoading, setLogoutLoading] = useState(false);



  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      dispatch(clearUserData());
      navigate("/login", { replace: true });
    } catch (error) {
      setChatError(
        error?.response?.data?.message || "Logout failed. Please try again.",
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#2b2f3a_0%,#191b21_55%,#121317_100%)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]"
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-white text-zinc-900">
              <Workflow size={17} />
            </span>
            <span className="text-sm font-medium tracking-tight">
              Nexora AI
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Open menu"
                  className={iconBtn}
                >
                  <Workflow size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-56 ${menuContent}`}
              >
                <DropdownMenuItem >
                  <Link
                    to="/agents"
                    className="flex items-center gap-2.5 py-2.5 hover:text-white"
                  >
                    <Bot size={16} />
                    My agents
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className={menuSeparator} />
                <DropdownMenuItem asChild >
                  <Link
                    to="/agents/new"
                    className="flex items-center gap-2.5 py-2.5"
                  >
                    <Plus size={16} />
                    Create new agent
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={menuSeparator} />
                <DropdownMenuItem asChild>
                  <Link
                    to="/integrations"
                    className="flex items-center gap-2.5 py-2.5"
                  >
                    <Settings2 size={16} />
                    Integrations{" "}
                  </Link>
                </DropdownMenuItem>
               
              </DropdownMenuContent>
            </DropdownMenu>


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="flex size-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/0.5"
                >
                  {userData?.profilePicture ? (
                    <img
                      src={userData?.profilePicture}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : (
                    <UserRound size={17} className="text-zinc-300" />
                  )}
                </button>
              </DropdownMenuTrigger>


              <DropdownMenuContent
                align="end"
                className={`w-64 ${menuContent}`}
              >
               
            

                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {userData?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {userData?.email || "email"}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className={menuSeparator} />
                <DropdownMenuItem
                onClick={(e)=>{ handleLogout() }}
                asChild
                  className="cursor-pointer gap-2.5 rounded-xl py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                >
                  <LogOut size={16} />
                  {logoutLoading ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

       
      </div>
    </div>
  );
}
