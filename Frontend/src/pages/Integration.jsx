import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Mail,
  Unplug,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import infinityLogo from "@/assets/Infinity Logo.png";
import {
  connectGoogle,
  connectInstagram,
  disconnectGoogle,
  disconnectInstagram,
  getAllIntegrations,
} from "../features/integration";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@base-ui/react/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const integrationList = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and manage emails through your AI agent.",
    icon: Mail,
    provider: "google",
  },
  {
    id: "googleCalendar",
    name: "Google Calendar",
    description: "Manage calendar events using your AI agent.",
    icon: CalendarDays,
    provider: "google",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Publish images with AI-generated captions and hashtags.",
    icon: FaInstagram,
    provider: "instagram",
  },
];

const Integration = () => {
  const [integrations, setIntegrations] = useState({});
  const [connecting, setConnecting] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleConnect = async (id) => {
    try {
      setConnecting(id);
      setError("");
      setSuccess("");

      if (id === "gmail" || id === "googleCalendar") {
        const data = await connectGoogle();
        if (!data.success || !data.url) {
          throw new Error("Google authorization URL not received.");
        }

        if (!data.success) {
          setError(
            data.response.data.message || "Unable to connect Integration",
          );
          connecting(null);
        }
        window.location.assign(data.url);
        return;
      }

      if (id === "instagram") {
        const data = await connectInstagram();

        if (!data.success || !data.url) {
          throw new Error("Instagram authorization URL not received.");
        }
        if (!data.success) {
          setError(
            data.response.data.message || "Unable to connect Integration",
          );
          connecting(null);
        }
        window.location.assign(data.url);
        return;
      }
    } catch (err) {
      console.error("Integration connection failed:", err);
    }
  };

  const handleDisconnect = async (id) => {
    const integration = integrationList.find((item) => item.id === id);

    if (!integration) return;

    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${integration.name}?`,
    );

    if (!confirmed) return;

    try {
      setDisconnecting(id);
      setError("");
      setSuccess("");

      if (id === "gmail" || id === "googleCalendar") {
        const data = await disconnectGoogle();

        setSuccess(`${integration.name} disconnected successfully.`);
        setDisconnecting(null);
      }

      if (id === "instagram") {
        const data = await disconnectInstagram();

        setSuccess(`${integration.name} disconnected successfully.`);
        setDisconnecting(null);
      }
    } catch (err) {
      console.error("Integration disconnection failed:", err);
    }
  };

  const fetchAllIntegrations = async () => {
    try {
      setError("");

      const data = await getAllIntegrations();

      setIntegrations(data.integrations || {});
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    }
  };

  useEffect(() => {
    fetchAllIntegrations();
  }, [connecting , disconnecting]);

  return (
    <div className="relative min-h-dvh bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,#2b2f3a_0%,#191b21_55%,#121317_100%)] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]"
      />

      <div className="relative z-10">
        <header>
          <div className="mx-auto flex h-16 max-w-8xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src={infinityLogo}
                alt="Nexora AI"
                className="size-8 rounded-lg object-cover"
              />
              <span className="text-sm font-medium tracking-tight text-zinc-100">
                AutoMate AI
              </span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to chat
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Integrations
            </h1>

            <p className="text-sm text-zinc-500">
              Connect your accounts and let AutoMate AI handle tasks for you.
            </p>
          </div>

          <Separator className="bg-white/10" />
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4">
              <p className="text-sm text-emerald-300">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {integrationList.map((item) => {
              const integration = integrations[item?.id];
              const connected = Boolean(integration?.connected);
              const Icon = item.icon;

              const isConnecting = connecting === item?.id;
              const isDisconnecting = disconnecting === item?.id;
             
              return (
                <Card
                  key={item?.id}
                  className="rounded-2xl border border-white/10 bg-white/4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:border-white/25 hover:bg-white/6"
                >
                  <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-[0_8px_24px_rgba(255,255,255,0.1)]">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-medium text-white">
                            {item.name}
                          </h2>

                          {
                            connected && (
                              <Badge
                                variant="secondary"
                                className="   gap-1 border border-emerald-400/20 bg-emerald-400/10 font-normal text-emerald-300"
                              >
                                <Check className="" />
                                Connected
                              </Badge>
                            )}
                        </div>

                        <CardTitle className="sr-only">{item.name}</CardTitle>

                        <CardDescription className="max-w-md leading-relaxed text-zinc-500">
                          {item.description}
                        </CardDescription>

                        {connected && (
                          <p className="pt-1 text-xs text-zinc-500">
                            {integration.email ||
                              integration.username ||
                              integration.displayName ||
                              ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {connected ? (
                        <Button
                          variant="outline"
                          disabled={isDisconnecting}
                          onClick={() => handleDisconnect(item?.id)}
                          className="flex rounded-xl border-red-400/20 bg-red-400/6 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                        >
                          <Unplug className="mr-2 h-4 w-4" />
                          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                        </Button>
                      ) : (
                        <Button
                          disabled={isConnecting}
                          onClick={() => handleConnect(item.id)}
                          className="rounded-xl border-0 bg-white text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900"
                        >
                          {isConnecting ? "Connecting..." : "Connect"}

                          { !isConnecting && (
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integration;
