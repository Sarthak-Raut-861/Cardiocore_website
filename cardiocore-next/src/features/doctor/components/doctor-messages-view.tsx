"use client";

import React, { useState } from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";

interface MessageItem {
  id: string;
  sender: "doctor" | "patient";
  text: string;
  time: string;
}

interface ThreadItem {
  id: string;
  patientName: string;
  mrn: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: MessageItem[];
}

const SAMPLE_THREADS: ThreadItem[] = [
  {
    id: "aarav",
    patientName: "Aarav Menon",
    mrn: "44821",
    initials: "AM",
    avatarColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    lastMessage: "Doctor, I received an alert on my watch about elevated rate at rest...",
    time: "11:28 today",
    unread: false,
    messages: [
      {
        id: "m1",
        sender: "patient",
        text: "Doctor, I received an alert on my watch about elevated rate at rest around 11:20. Felt slightly fluttery. Should I take an extra dose of Metoprolol?",
        time: "Today · 11:28",
      },
      {
        id: "m2",
        sender: "doctor",
        text: "Hello Aarav, I reviewed your 30-second strip from 11:24. The rate was 138 bpm with good signal quality. Do NOT change your Metoprolol dose without an in-person evaluation. Please rest quietly. If you develop chest pain, shortness of breath, or dizziness, seek emergency care immediately. We have your in-person review scheduled for 10:30.",
        time: "Today · 11:35",
      },
    ],
  },
  {
    id: "meera",
    patientName: "Meera Iyer",
    mrn: "77310",
    initials: "MI",
    avatarColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    lastMessage: "Blood pressure log uploaded for past 5 days as requested.",
    time: "Yesterday · 16:40",
    unread: false,
    messages: [
      {
        id: "mi1",
        sender: "patient",
        text: "Doctor Raghavan, I have logged the blood pressure readings morning and evening for the last 5 days. Average is 134/86 mmHg.",
        time: "Yesterday · 16:40",
      },
      {
        id: "mi2",
        sender: "doctor",
        text: "Thank you Meera. We will discuss these alongside your HRV trend in our video call tomorrow at 11:45.",
        time: "Yesterday · 17:15",
      },
    ],
  },
  {
    id: "rohit",
    patientName: "Rohit Sharma",
    mrn: "11204",
    initials: "RS",
    avatarColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    lastMessage: "Confirmed for follow-up today at 09:15.",
    time: "Yesterday · 19:10",
    unread: false,
    messages: [
      {
        id: "rs1",
        sender: "patient",
        text: "Confirmed for my in-person follow-up this morning regarding the resting HR drift.",
        time: "Yesterday · 19:10",
      },
    ],
  },
];

export function DoctorMessagesView() {
  const { showToast, setSelectedPatientId } = useDoctorDashboard();
  const [threads, setThreads] = useState<ThreadItem[]>(SAMPLE_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>("aarav");
  const [replyText, setReplyText] = useState("");

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMsg: MessageItem = {
      id: "m_" + Date.now(),
      sender: "doctor",
      text: replyText.trim(),
      time: "Just now",
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              messages: [...t.messages, newMsg],
              lastMessage: newMsg.text,
              time: "Just now",
            }
          : t
      )
    );

    setReplyText("");
    showToast(
      "Message logged to demo chart. No actual SMS or push notification was dispatched.",
      "ok"
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Clinical Messages
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Portal
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Secure, in-record clinical communication. Not for emergency dispatch — urgent cases route to local services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white/5 text-muted-foreground border border-border/50">
            0 unread messages
          </span>
        </div>
      </div>

      {/* Main Messaging Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Inbox Thread List (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm flex flex-col">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Active Threads
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {threads.map((thread) => {
              const isSelected = thread.id === activeThread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-500/50 shadow-sm shadow-cyan-500/10"
                      : "bg-surface-2/40 border-border/50 hover:bg-white/5 hover:border-border/80"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 mt-0.5 ${thread.avatarColor}`}
                  >
                    {thread.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {thread.patientName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {thread.time}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {thread.lastMessage}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
            Messages are bound to patient MRN and archived in audit logs.
          </div>
        </div>

        {/* Conversation Thread (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-border/60 bg-surface/50 backdrop-blur-sm flex flex-col overflow-hidden">
          {/* Thread Header */}
          <div className="p-4 border-b border-border/40 bg-surface-2/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border ${activeThread.avatarColor}`}
              >
                {activeThread.initials}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground font-sora">
                  {activeThread.patientName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  MRN {activeThread.mrn} · Consented direct messaging
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPatientId(activeThread.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground cursor-pointer"
            >
              Open chart
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {activeThread.messages.map((m) => {
              const isDoc = m.sender === "doctor";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isDoc ? "items-end" : "items-start"}`}
                >
                  <div className="text-[10px] text-muted-foreground mb-1 px-1">
                    {isDoc ? "Dr Neha Raghavan (You)" : activeThread.patientName} · {m.time}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed border ${
                      isDoc
                        ? "bg-cyan-500/15 border-cyan-500/30 text-foreground"
                        : "bg-surface-2/80 border-border/50 text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          <form
            onSubmit={handleSendReply}
            className="p-4 border-t border-border/40 bg-surface-2/30 space-y-3"
          >
            <div className="relative">
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a clinical note or instructions to the patient..."
                className="w-full px-3 py-2 text-xs bg-surface-2/90 border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50 resize-y"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Simulated messaging: Updates local demo state only.
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 transition-colors cursor-pointer shadow-sm shadow-cyan-500/20"
              >
                Send message
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
