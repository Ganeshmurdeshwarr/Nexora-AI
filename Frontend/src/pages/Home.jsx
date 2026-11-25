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
  X,
  Trash2,
  Settings2,
} from "lucide-react";

import { logout, me } from "@/features/auth.js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDispatch, useSelector } from "react-redux";
import { clearUserData, setUserData } from "@/redux/userSlice";
import { setSelectedAgent } from "@/redux/agentSlice";
import { Textarea } from "@/components/ui/textarea";
import { agentChat, agentResume, chat } from "@/features/chat";
import { FaInstagram } from "react-icons/fa";
import infinityLogo from "@/assets/Infinity Logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const getMessageText = (content) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    return content.text || content.message || JSON.stringify(content, null, 2);
  }
  return content == null ? "" : String(content);
};

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.auth);
  const { agents, selectedAgent } = useSelector((state) => state.agent);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState(() =>
    globalThis.crypto.randomUUID(),
  );
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDescription, setImageDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);

  const refreshUserData = async () => {
    const freshUserData = await me();
    if (freshUserData) dispatch(setUserData(freshUserData));
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please select a valid image file",
        },
      ]);
      return;
    }

   
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadToCloudinary = async () => {
    if (uploadedImage?.secure_url) return uploadedImage;
    if (!selectedImage) return null;

    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env
      .VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary config missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend .env.",
      );
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedImage);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "nexora-ai/instagram");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await response.json();

      if (!response.ok || !data?.secure_url) {
        throw new Error(
          data?.error?.message || "Cloudinary image upload failed.",
        );
      }

      const image = {
        secure_url: data?.secure_url,
        public_id: data?.public_id,
        width: data?.width,
        height: data?.height,
        format: data?.format,
      };
      setUploadedImage(image);
      return image;
    } finally {
      setImageUploading(false);
    }
  };

  const clearSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview("");
    setUploadedImage(null);
    setImageDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPendingApproval = (response) => {
    const approvalData = response.interrupts?.[0]?.value;
    if (!approvalData) return false;


    if (approvalData.type === "email_approval") {
      setPendingApproval({
        type: "email",
        email: {
          to: approvalData.email?.to ?? "",
          subject: approvalData.email?.subject ?? "",
          body: approvalData.email?.body ?? "",
        },
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: approvalData?.message || "Something went wrong",
        },
      ]);
      return true;
    }

    if (approvalData.type === "calendar_event_approval") {
      setPendingApproval({
        type: "calendar",
        event: {
          summary: approvalData.event?.summary ?? "",
          description: approvalData.event?.description ?? "",
          startDateTime: approvalData.event?.startDateTime ?? "",
          endDateTime: approvalData.event?.endDateTime ?? "",
          timeZone: approvalData.event?.timeZone ?? "Asia/Kolkata",
        },
      });
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: approvalData?.message || "Something went wrong",
        },
      ]);
      return true;
    }

    if (approvalData?.type === "instagram_post_approval") {
      setPendingApproval({
        type: "instagram",
        imageUrl: approvalData?.imageUrl ?? approvalData.image_url ?? "",
        caption: approvalData.caption ?? "",
      });
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: approvalData?.message || "Something went wrong",
        },
      ]);
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      aiLoading ||
      (!message.trim() && !selectedImage) ||
      approvalLoading ||
      logoutLoading ||
      pendingApproval
    ) {
      return;
    }

    setAiLoading(true);

    try {
      let image = uploadedImage;

      if (selectedImage && !image?.secure_url) {
        setImageUploading(true);
        image = await uploadToCloudinary();
      }

      let finalMessage = message;
      if (image?.secure_url) {
        finalMessage += `\n\nImage URL: ${image?.secure_url}`;
        finalMessage += `\nImage public ID: ${image?.public_id}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: finalMessage,
          image_url: image?.secure_url,
        },
      ]);

      if (selectedAgent === "") {
        const res = await chat(finalMessage, conversationId);
        await refreshUserData();
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
      } else {
        const res = await agentChat(
          finalMessage,
          selectedAgent,
          conversationId,
        );
        await refreshUserData();

        if (res?.interrupted && createPendingApproval(res)) {
          clearSelectedImage();
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              res?.aiMessage ||
              res?.aiMessage?.data?.message ||
              "Something went wrong",
          },
        ]);
      }

      setMessage("");
      clearSelectedImage()
      
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to send your message. Please try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
      setImageUploading(false);
    }
  };

  const handleNewChat = () => {
    if (aiLoading || approvalLoading || pendingApproval) return;
    setMessages([]);
    setMessage("");
    setConversationId(globalThis.crypto.randomUUID());
    clearSelectedImage();
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      setLogoutError("");
      await logout();
      dispatch(clearUserData());
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error?.response?.data?.message ||
          error?.message ||
          "Logout failed. Please try again.",
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const renderApprovalDetails = () => {
    if (!pendingApproval) return null;
    if (pendingApproval?.type === "email") {
      return (
        <div className="space-y-3 rounded-xl border border-white/6 bg-black/20 p-3.5">
          <div>
            <p className="mb-1 text-xs text-zinc-500">To</p>
            <p className="break-all text-sm">
              {pendingApproval?.email?.to || "Not provided"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Subject</p>
            <p className="text-sm">
              {pendingApproval?.email?.subject || "No subject"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Message</p>
            <p className="whitespace-pre-wrap wrap-break-word text-sm text-zinc-300">
              {pendingApproval?.email?.body || "No message provided"}
            </p>
          </div>
        </div>
      );
    }
    if (pendingApproval.type === "calendar") {
      const event = pendingApproval.event;
      return (
        <div className="space-y-3 rounded-xl border border-white/6 bg-black/20 p-3.5">
          <div>
            <p className="mb-1 text-xs text-zinc-500">Event title</p>
            <p className="text-sm font-medium">
              {event?.summary || "Untitled event"}
            </p>
          </div>
          {event?.description && (
            <div>
              <p className="mb-1 text-xs text-zinc-500">Description</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">
                {event.description}
              </p>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs text-zinc-500">Start</p>
            <p className="flex items-center gap-2 text-sm">
              <CalendarDays size={15} />
              {event?.startDateTime
                ? new Date(event?.startDateTime).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timeZone,
                  })
                : "Not provided"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">End</p>
            <p className="flex items-center gap-2 text-sm">
              <Clock size={15} />
              {event.endDateTime
                ? new Date(event.endDateTime).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timeZone,
                  })
                : "Not provided"}
            </p>
          </div>
          <p className="text-xs text-zinc-500">Timezone: {event?.timeZone}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 rounded-xl border border-white/6 bg-black/20 p-3.5">
        {pendingApproval?.imageUrl && (
          <img
            src={pendingApproval?.imageUrl}
            alt="Instagram post preview"
            className="max-h-72 w-full rounded-lg object-contain"
          />
        )}
        <div>
          <p className="mb-1 text-xs text-zinc-500">Caption</p>
          <p className="whitespace-pre-wrap wrap-break-word text-sm text-zinc-200">
            {pendingApproval?.caption || "No caption provided"}
          </p>
        </div>
      </div>
    );
  };

  const handleApproval = async (approved) => {
    if (!pendingApproval || approvalLoading) return;

    setApprovalLoading(true);

    try {
      const response = await agentResume({
        approved,
        agent: selectedAgent,
        conversationId,
      });
      await refreshUserData();

      if (response?.interrupted && createPendingApproval(response)) {
        clearSelectedImage();
        return;
      }
      setMessage("");
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            response?.aiMessage ||
            (approved
              ? pendingApproval?.type === "instagram"
                ? "Instagram publish workflow resumed. Verify the publish result above."
                : "Approval process complete. Verify the action status."
              : "Action rejected."),
        },
      ]);
      setPendingApproval(null);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            error?.response?.data?.message ||
            error?.message ||
            "Approval failed. Please try again.",
        },
      ]);
    } finally {
      setApprovalLoading(false);
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
            <img
              src={infinityLogo}
              alt="Nexora AI"
              className="size-8 rounded-lg object-cover"
            />
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
                  <img
                    src={infinityLogo}
                    alt=""
                    className="size-6 rounded-md object-cover"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-56 ${menuContent}`}
              >
                <DropdownMenuItem>
                  <div
                    to="/agents"
                    className="flex items-center gap-2.5 py-2.5 hover:text-white"
                  >
                    <Coins size={16} color="yellow" />
                    
                      <span className="ml-2 text-sm font-medium">
                        {userData?.credits} credits
                      </span>
                    
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={menuSeparator} />

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
                <DropdownMenuSeparator className={menuSeparator} />

                <DropdownMenuItem asChild>
                  <Link
                    to="/pricing"
                    className="flex items-center gap-2.5 py-2.5"
                  >
                    <Coins size={16} />
                    Pricing{" "}
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
          {logoutError && (
            <p
              role="alert"
              className="mx-auto mt-3 w-full max-w-4xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {logoutError}
            </p>
          )}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className={`min-h-0 flex-1 overflow-y-auto ${hideScrollbar}`}>
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
                {messages.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
                    <img
                      src={infinityLogo}
                      alt="Nexora AI"
                      className="mb-7 size-14 rounded-2xl object-cover"
                    />
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
                      <img
                        src={infinityLogo}
                        alt=""
                        className="mr-3 mt-1 size-8 shrink-0 rounded-lg object-cover"
                      />
                    )}

                    <div
                      className={`max-w-[90%] wrap-break-word px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${message.role === "user" ? `rounded-2xl rounded-br-md text-white ${darkPanel}` : "text-zinc-200"}`}
                    >
                      {message?.image_url && (
                        <img
                          src={message?.image_url}
                          alt="Attached image"
                          className="mb-3 max-h-64 rounded-lg object-contain"
                        />
                      )}

                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 whitespace-pre-wrap leading-7 last:mb-0">
                                {children}
                              </p>
                            ),
                            h1: ({ children }) => (
                              <h1 className="mb-3 mt-5 text-xl font-semibold text-white first:mt-0">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="mb-2 mt-5 text-lg font-semibold text-white first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-3 ml-5 list-disc space-y-1 marker:text-violet-300">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="my-3 ml-5 list-decimal space-y-1 marker:text-violet-300">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="pl-1">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">
                                {children}
                              </strong>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
                              >
                                {children}
                              </a>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-3 border-l-2 border-violet-400/60 pl-4 text-zinc-300">
                                {children}
                              </blockquote>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-violet-200">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-zinc-100">
                                {children}
                              </pre>
                            ),
                            hr: () => <hr className="my-4 border-white/10" />,
                            table: ({ children }) => (
                              <div className="my-3 overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-white/10 px-3 py-2">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {getMessageText(message?.content)}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {getMessageText(message?.content)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {pendingApproval && (
                  <div className={`rounded-2xl p-4 ${darkPanel}`}>
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl ${pendingApproval.type === "calendar" ? "bg-violet-400/10" : pendingApproval.type === "instagram" ? "bg-pink-400/10" : "bg-amber-400/10"}`}
                      >
                        {pendingApproval?.type === "calendar" ? (
                          <CalendarDays className="size-5 text-violet-400" />
                        ) : pendingApproval.type === "instagram" ? (
                          <FaInstagram className="size-5 text-pink-400" />
                        ) : (
                          <Mail className="size-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {pendingApproval.type === "calendar"
                            ? "Calendar Approval Required"
                            : pendingApproval.type === "instagram"
                              ? "Instagram Publish Approval"
                              : "Email Approval Required"}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {pendingApproval.type === "instagram"
                            ? "Review the image and caption before publishing."
                            : pendingApproval.type === "calendar"
                              ? "Review the event before creating it."
                              : "Review the email before sending."}
                        </p>
                      </div>
                    </div>
                    {renderApprovalDetails()}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={approvalLoading}
                        onClick={() => handleApproval(false)}
                        className="rounded-xl border-red-500/25 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <X className="mr-2 size-4" />
                        {approvalLoading ? "Processing..." : "Reject"}
                      </Button>
                      <Button
                        type="button"
                        disabled={approvalLoading}
                        onClick={() => handleApproval(true)}
                        className={whiteBtn}
                      >
                        <Check className="mr-2 size-4" />
                        {approvalLoading
                          ? "Processing..."
                          : pendingApproval.type === "calendar"
                            ? "Approve & Create"
                            : pendingApproval.type === "instagram"
                              ? "Approve & Publish"
                              : "Approve & Send"}
                      </Button>
                    </div>
                  </div>
                )}

                {aiLoading && (
                  <div className="flex items-center gap-3">
                    <img
                      src={infinityLogo}
                      alt=""
                      className="size-8 rounded-lg object-cover animate-pulse"
                    />
                    <div className="text-sm text-zinc-400">
                      {imageUploading
                        ? "Uploading image to Cloudinary..."
                        : "Nexora AI is thinking..."}
                    </div>
                  </div>
                )}

              
              </div>
            </div>

            <div className="z-20 w-full shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
              <form
                onSubmit={handleSubmit}
                className={`mx-auto w-full max-w-3xl rounded-2xl p-3 transition-colors focus-within:border-white/25 ${darkPanel}`}
              >
                {imagePreview && (
                  <div className="mb-3 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <img
                      src={imagePreview}
                      alt="Selected upload preview"
                      className="size-20 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-zinc-300">
                        {selectedImage?.name}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {uploadedImage
                          ? "Uploaded to Cloudinary"
                          : "Will upload to Cloudinary when sent"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove image"
                      onClick={clearSelectedImage}
                      className="size-8 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
                <Textarea
                  value={message}
                  disabled={aiLoading || approvalLoading || imageUploading}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={
                    selectedAgent
                      ? `Message ${selectedAgent}...`
                      : "Ask me anything..."
                  }
                  className={`min-h-20 resize-none border-0 bg-transparent! px-2 py-1.5 text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0 ${hideScrollbar}`}
                />

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Button
                      onChange={(e) => uploadToCloudinary(e)}
                      type="button"
                      variant="ghost"
                      aria-label="Attach image"
                      title="Attach image"
                      onClick={() => fileInputRef.current?.click()}
                      className="size-8 rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e)}
                      />
                      <ImagePlus size={17} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
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
                    <Button
                      type="button"
                      disabled={aiLoading || approvalLoading || imageUploading}
                      variant="ghost"
                      onClick={handleNewChat}
                      className="h-8 rounded-lg px-3 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                    >
                      New chat
                    </Button>

                    <Button
                      type="submit"
                      size="icon"
                      disabled={aiLoading || approvalLoading || imageUploading}
                      aria-label="Send message"
                      className={`size-8 shrink-0 ${whiteBtn} disabled:bg-white/10 disabled:text-zinc-500`}
                    >
                      <ArrowUp size={16} />
                    </Button>
                  </div>
                </div>
              </form>
              <p className="mx-auto mt-3 max-w-3xl text-center text-[10px] text-zinc-600">
                AutoMate AI can make mistakes. Verify important information.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
