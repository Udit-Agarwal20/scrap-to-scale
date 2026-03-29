/**
 * Seed script for initial event setup
 * Run with: npx tsx src/db/seed.ts
 */
import { db } from "./index";
import {
  users,
  judges,
  teams,
  eventSettings,
  teamScoreAggregates,
} from "./schema";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Event settings
  await db
    .insert(eventSettings)
    .values({
      eventName: "Scrap to Scale",
      organizerName: "Nex-Cell",
      collegeName: "Mirai School of Technology",
      totalJudgeBudget: 100000,
      audienceVotingDurationSec: 60,
      isEventLive: false,
    })
    .onConflictDoNothing();

  // Admin user
  const adminPassword = await bcrypt.hash("admin@nexcell2024", 12);
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Event Admin",
      email: "admin@nexcell.com",
      passwordHash: adminPassword,
      role: "admin",
    })
    .returning();

  console.log(`✅ Admin created: admin@nexcell.com / admin@nexcell2024`);

  // Sample judges
  const judgeData = [
    { name: "Dr. Arjun Mehra", title: "CTO", org: "TechVentures India" },
    { name: "Priya Sharma", title: "Managing Partner", org: "NexGen Capital" },
    { name: "Rohan Gupta", title: "Founder", org: "ScaleUp Labs" },
  ];

  for (const j of judgeData) {
    const judgePassword = await bcrypt.hash(`judge${nanoid(6)}`, 10);
    const [judgeUser] = await db
      .insert(users)
      .values({
        name: j.name,
        email: `${j.name.toLowerCase().replace(/\s/g, ".")}@judges.nexcell.com`,
        passwordHash: judgePassword,
        role: "judge",
      })
      .returning();

    const token = nanoid(32);
    await db.insert(judges).values({
      userId: judgeUser.id,
      name: j.name,
      title: j.title,
      organization: j.org,
      accessToken: token,
      remainingBudget: 100000,
    });

    console.log(`✅ Judge: ${j.name} | Token: ${token}`);
  }

  // Sample teams
  const teamData = [
    {
      num: 1,
      name: "NeoNest",
      scrap: "Broken bicycle wheels",
      idea: "Smart Urban Garden Pod",
      desc: "A rotating hydroponic garden using bike wheel rims as the structural frame",
      members: ["Aditi Rao", "Nikhil Sharma", "Zara Ahmed"],
    },
    {
      num: 2,
      name: "CircuiTech",
      scrap: "Old circuit boards",
      idea: "E-Waste Art + Charging Hub",
      desc: "Artistic mosaic charging stations made from salvaged PCBs",
      members: ["Ravi Kumar", "Meena Joshi"],
    },
    {
      num: 3,
      name: "Refabrics",
      scrap: "Torn denim jeans",
      idea: "Acoustic Panel Kits",
      desc: "DIY soundproofing panels from layered denim for home studios",
      members: ["Kiran Das", "Yash Patel", "Sahil Nair", "Pooja Singh"],
    },
    {
      num: 4,
      name: "GlassAct",
      scrap: "Broken glass bottles",
      idea: "Solar Light Lanterns",
      desc: "Hand-crafted solar lanterns using bottle-glass refraction for mood lighting",
      members: ["Aryan Kapoor", "Fatima Ali"],
    },
    {
      num: 5,
      name: "WoodWave",
      scrap: "Pallet wood scraps",
      idea: "Modular Desk Organizer System",
      desc: "Customizable desk organization units built from reclaimed pallet wood",
      members: ["Dev Rana", "Sneha Iyer", "Aarav Mehta"],
    },
  ];

  for (let i = 0; i < teamData.length; i++) {
    const t = teamData[i];
    const [team] = await db
      .insert(teams)
      .values({
        teamNumber: t.num,
        name: t.name,
        members: t.members,
        scrapItemReceived: t.scrap,
        productIdea: t.idea,
        productDescription: t.desc,
        presentationOrder: i + 1,
      })
      .returning();

    await db.insert(teamScoreAggregates).values({ teamId: team.id });
    console.log(`✅ Team: ${t.name}`);
  }

  console.log("\n🎉 Seed complete!");
}

seed().catch(console.error);
