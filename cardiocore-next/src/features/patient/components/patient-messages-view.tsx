"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

export function PatientMessagesView() {
  const { showToast, patient } = usePatientDashboard();
  const firstName = patient.name.trim().split(/\s+/)[0] || "there";
  const [messages, setMessages] = useState([
    {
      id: "msg-1",
      sender: "Dr Neha Raghavan",
      role: "Cardiologist",
      time: "Fri 2 Oct · 16:40",
      text: `Hello ${firstName}, I reviewed your 90-day baseline summary and recent 30-second Lead-I strips. Your rhythm remains regular; let us discuss the recent HRV excursion during our Tuesday clinic appointment.`,
      isMe: false,
    },
    {
      id: "msg-2",
      sender: patient.name,
      role: "Patient",
      time: "Fri 2 Oct · 17:15",
      text: "Thank you Dr Raghavan. I have noted down my sleep duration as well — looking forward to our review on Tuesday.",
      isMe: true,
    },
  ]);
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: patient.name,
        role: "Patient",
        time: "Just now",
        text: inputVal.trim(),
        isMe: true,
      },
    ]);
    setInputVal("");
    showToast("Message dispatched to care team.", "ok");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Care team messages
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Encrypted asynchronous communication with your cardiology care team. Part of your audit record.
          </p>
        </div>
        <span className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-medium text-[var(--teal-700)]">
          typical replies within 4 hours
        </span>
      </div>

      {/* Emergency Warning Banner */}
      <div className="rounded-xl border border-[var(--red)] bg-[var(--red-soft)] p-3.5 text-xs text-[var(--hi)] flex items-center justify-between">
        <span>
          <strong className="text-[var(--red)]">Emergency notice: </strong>
          This messaging thread is not monitored in real time. If you experience severe chest pain, shortness of breath, or palpitations, call local emergency services immediately.
        </span>
      </div>

      {/* Message Thread Container */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sh-1)] flex flex-col h-[520px]">
        {/* Active Contact Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] bg-[var(--surface-2)] rounded-t-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft)] text-sm font-bold text-[var(--teal-700)]">
            NR
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[var(--hi)]">Dr Neha Raghavan</h3>
            <span className="text-xs text-[var(--muted)]">Interventional Cardiology · Meridian Heart Institute</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--hi)]">{m.sender}</span>
                <span>·</span>
                <span>{m.time}</span>
              </div>
              <div
                className={`max-w-md rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.isMe
                    ? "bg-[var(--teal)] text-white rounded-br-none"
                    : "bg-[var(--surface-2)] text-[var(--hi)] border border-[var(--border)] rounded-bl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] rounded-b-2xl flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type a message to Dr Raghavan..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs text-[var(--hi)] focus:border-[var(--teal)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--teal)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
