"use client";

import { LiveNotificationFeed } from "@/components/ui/live-notification-feed";
import type { LiveNotification } from "@/components/ui/live-notification-feed";

// Synthetic demo events for the home page hero. All names are invented.
const FOREST = "#22392B";
const SAGE = "#7A9A6A";
const GOLD = "#C9973B";
const AMBER = "#B7791F";

const ITEMS: LiveNotification[] = [
  {
    id: "posted-block-c",
    kind: "delivery",
    app: "Hostel Block C Mess",
    title: "40 meals posted",
    body: "Veg rice, dal and sabzi · pickup by 9:30 PM",
    time: "6m",
    accent: FOREST,
    read: true,
    steps: ["Posted", "Claimed", "Collected", "Delivered"],
    step: 3,
  },
  {
    id: "impact-week",
    kind: "fitness",
    app: "Annapurna impact",
    title: "Weekly goal reached",
    body: "Meals served from 15 hostel messes this week.",
    time: "4m",
    accent: GOLD,
    read: true,
    value: 620,
    goal: 600,
    unit: "meals",
    streak: 6,
  },
  {
    id: "match-blue-banyan",
    kind: "delivery",
    app: "Canteen 2, North Campus",
    title: "60 rotis matched to Blue Banyan Collective",
    body: "2.1 km · fits your need of 60 · arrives 70 min early",
    accent: SAGE,
    steps: ["Posted", "Claimed", "Collected", "Delivered"],
    step: 1,
    actions: [
      { label: "Claim", done: "Claimed" },
      { label: "Skip", done: "Skipped" },
    ],
  },
  {
    id: "volunteer-eta",
    kind: "ride",
    app: "Volunteer pickup",
    title: "Demo Volunteer 7 is on the way",
    body: "Collecting from Hostel Block A Mess.",
    accent: FOREST,
    minutes: 6,
    vehicle: "Bicycle",
    plate: "PICKUP 07",
  },
  {
    id: "ngo-message",
    kind: "message",
    app: "Seva Community Kitchen",
    title: "Message from the kitchen",
    accent: SAGE,
    from: "Seva Community Kitchen",
    text: "Received 25 portions, all still warm. Thank you!",
  },
  {
    id: "pickup-code",
    kind: "code",
    app: "Handover check",
    title: "Pickup code for Block D Mess",
    body: "Share it with the volunteer at the counter.",
    accent: AMBER,
    code: "4829",
    expiresIn: 900,
  },
];

export default function HomeLiveFeed() {
  return (
    <LiveNotificationFeed
      title="Live near you"
      items={ITEMS}
      autoplay
      initial={2}
      interval={2200}
      loop
      height="420px"
      className="relative max-w-md"
    />
  );
}
