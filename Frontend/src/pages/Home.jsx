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
import { setSelectedAgent } from "@/redux/agentSlice";
import { Textarea } from "@/components/ui/textarea";
import { agentChat, chat } from "@/features/chat";

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
  const { agents, selectedAgent } = useSelector((state) => state.agent);
  const [message, setMessage] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message || "Something went wrong",
      },
    ]);

    if (selectedAgent === "") {
      const res = await chat(message);
      console.log(res);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            res ||
            res?.aiResponse ||
            res?.response?.data?.message ||
            "Something went wrong",
        },
      ]);
      return;
    } else {
      const res = await agentChat(message, selectedAgent);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            res ||
            res?.aiResponse ||
            res?.response?.data?.message ||
            "Something went wrong",
        },
      ]);
      return;
    }
  };

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
                <DropdownMenuItem>
                  <Link
                    to="/agents"
                    className="flex items-center gap-2.5 py-2.5 hover:text-white"
                  >
                    <Bot size={16} />
                    My agents
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className={menuSeparator} />
                <DropdownMenuItem asChild>
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
                  onClick={(e) => {
                    handleLogout();
                  }}
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

        <main className="flex min-h-0 flex-1 flex-col">
          <section className="flex min-h-0 flex-1 flex-col">
            <div className={`min-h-0 flex-1 overflow-y-auto ${hideScrollbar}`}>
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
                {messages.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
                    <div className="mb-7 grid size-14 place-items-center rounded-2xl bg-white text-zinc-900">
                      <Workflow size={26} />
                    </div>
                    <p className="text-base text-violet-300/80">
                      Hi, {userData.name || "User"}
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                      Can I help you with anything?
                    </h1>
                    <p className="mt-4 max-w-sm text-xs leading-5 text-zinc-500">
                      Ask questions, automate tasks, or upload an image to
                      prepare an Instagram post.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="mr-3 mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-zinc-900">
                        <Workflow size={15} />
                      </div>
                    )}

                    <div
                      className={`max-w-[90%] break-words px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${message.role === "user" ? `rounded-2xl rounded-br-md text-white ${darkPanel}` : "text-zinc-200"}`}
                    >
                      {/* {message.imageUrl && <img src={message.imageUrl} alt="Attached image" className="mb-3 max-h-64 rounded-lg object-contain" />} */}

                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* {pendingApproval && (
                  <div className={`rounded-2xl p-4 ${darkPanel}`}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-xl ${pendingApproval.type === "calendar" ? "bg-violet-400/10" : pendingApproval.type === "instagram" ? "bg-pink-400/10" : "bg-amber-400/10"}`}>
                        {pendingApproval.type === "calendar" ? <CalendarDays className="size-5 text-violet-400" /> : pendingApproval.type === "instagram" ? <ImagePlus className="size-5 text-pink-400" /> : <Mail className="size-5 text-amber-400" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{pendingApproval.type === "calendar" ? "Calendar Approval Required" : pendingApproval.type === "instagram" ? "Instagram Publish Approval" : "Email Approval Required"}</h3>
                        <p className="text-xs text-zinc-400">{pendingApproval.type === "instagram" ? "Review the image and caption before publishing." : pendingApproval.type === "calendar" ? "Review the event before creating it." : "Review the email before sending."}</p>
                      </div>
                    </div>
                    {renderApprovalDetails()}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button type="button" variant="outline" disabled={approvalLoading} onClick={() => handleApproval(false)} className="rounded-xl border-red-500/25 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"><X className="mr-2 size-4" />{approvalLoading ? "Processing..." : "Reject"}</Button>
                      <Button type="button" disabled={approvalLoading} onClick={() => handleApproval(true)} className={whiteBtn}><Check className="mr-2 size-4" />{approvalLoading ? "Processing..." : pendingApproval.type === "calendar" ? "Approve & Create" : pendingApproval.type === "instagram" ? "Approve & Publish" : "Approve & Send"}</Button>
                    </div>
                  </div>
                )} */}

                {/* {chatLoading && <div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-white text-zinc-900"><Workflow size={15} className="animate-pulse" /></div><div className="text-sm text-zinc-400">{imageUploading ? "Uploading image to Cloudinary..." : "AutoMate AI is thinking..."}</div></div>}
                {(chatError || agentsError) && <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">{chatError || agentsError}</div>} */}
              </div>
            </div>

            <div className="z-20 w-full shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
              <form
                onSubmit={handleSubmit}
                className={`mx-auto w-full max-w-2xl rounded-2xl p-3 transition-colors focus-within:border-white/25 ${darkPanel}`}
              >
                {/* {imagePreview && (
                  <div className="mb-3 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <img src={imagePreview} alt="Selected upload preview" className="size-20 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-zinc-300">{selectedImage?.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{uploadedImage ? "Uploaded to Cloudinary" : "Will upload to Cloudinary when sent"}</p>
                      <input value={imageDescription} onChange={(e) => setImageDescription(e.target.value)} placeholder="Image description (optional)" className="mt-2 w-full border-b border-white/10 bg-transparent py-1 text-xs text-white outline-none placeholder:text-zinc-500" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove image" onClick={clearSelectedImage} className="size-8 text-zinc-400 hover:text-red-400"><Trash2 size={15} /></Button>
                  </div>
                )} */}
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  // onKeyDown={(event) => {
                  //   if (
                  //     event.key === "Enter" &&
                  //     !event.shiftKey &&
                  //     !event.nativeEvent.isComposing
                  //   ) {
                  //     event.preventDefault();
                  //     event.currentTarget.form?.requestSubmit();
                  //   }
                  // }}
                  placeholder={
                    selectedAgent
                      ? `Message ${selectedAgent.name}...`
                      : "Ask me anything..."
                  }
                  // disabled={isBusy || Boolean(pendingApproval)}
                  className={`min-h-20 resize-none border-0 !bg-transparent px-2 py-1.5 text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0 ${hideScrollbar}`}
                />
                {/* <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} /> */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Attach image"
                      title="Attach image"
                      // disabled={isBusy || Boolean(pendingApproval)}
                      onClick={() => fileInputRef.current?.click()}
                      className="size-8 rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white"
                    >
                      <ImagePlus size={17} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          // disabled={isBusy || Boolean(pendingApproval)}
                          className="h-8 max-w-48 gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                        >
                          <Bot size={14} className="shrink-0" />
                          <span className="truncate">
                            {selectedAgent || "No Agent Selected"}
                          </span>
                          <ChevronDown size={12} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="top"
                        className={`mb-2 w-60 ${menuContent}`}
                      >
                        {!agents?.length && (
                          <DropdownMenuItem disabled className={menuItem}>
                            No agents found
                          </DropdownMenuItem>
                        )}

                        {agents?.map((agent, index) => {
                          return (
                            <DropdownMenuItem
                              key={index}
                              onClick={(e) => {
                                e.preventDefault();
                                dispatch(setSelectedAgent(agent?.name));
                              }}
                              className={`cursor-pointer gap-2 ${menuItem}`}
                            >
                              <Bot
                                size={15}
                                className="shrink-0 text-violet-300"
                              />
                              <span className="truncate">{agent?.name}</span>
                              {selectedAgent === agent?.name && (
                                <span className="ml-auto text-xs text-violet-300">
                                  ✓
                                </span>
                              )}
                            </DropdownMenuItem>
                          );
                        })}

                        <DropdownMenuSeparator className={menuSeparator} />

                        <DropdownMenuItem asChild className={menuItem}>
                          <Link
                            to="/agents/new"
                            className="flex items-center gap-2"
                          >
                            <Plus size={15} />
                            Create new agent
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild className={menuItem}>
                          <Link
                            to="/agents"
                            className="flex items-center gap-2"
                          >
                            <Settings size={15} />
                            Manage agents
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <Button
                      type="button"
                      variant="ghost"
                      onClick={handleNewChat}
                      className="h-8 rounded-lg px-3 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                    >
                      New chat
                    </Button> */}

                    <Button
                      type="submit"
                      size="icon"
                      onClick={(e) => handleSubmit(e)}
                      aria-label="Send message"
                      className={`size-8 shrink-0 ${whiteBtn} disabled:bg-white/10 disabled:text-zinc-500`}
                    >
                      <ArrowUp size={16} />
                    </Button>
                  </div>
                </div>
              </form>
              <p className="mx-auto mt-3 max-w-2xl text-center text-[10px] text-zinc-600">
                AutoMate AI can make mistakes. Verify important information.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
