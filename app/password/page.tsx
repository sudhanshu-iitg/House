"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createMatch, DEFAULT_SETTINGS, type Match, type Player } from "@/lib/engine";
import { isValidPhone, normalizePhone } from "@/lib/notify/templates";
import { loadCrew, loadMatch, logEvent, rememberCrew, saveMatch, type CrewMember } from "@/lib/store";
import { Setup, type Draft } from "@/components/password/Setup";
import { Optin } from "@/components/password/Optin";
import { Play } from "@/components/password/Play";

type Stage = { name: "loading" } | { name: "setup" } | { name: "optin" } | { name: "play"; match: Match };

const EMPTY_SLOT: CrewMember = { name: "", phone: "" };

function newDraft(crew: CrewMember[]): Draft {
  return {
    teamNames: ["Team Chai", "Team Coffee"],
    slots: [0, 1, 2, 3].map((i) => crew[i] ?? EMPTY_SLOT),
    settings: DEFAULT_SETTINGS,
  };
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function matchFromDraft(d: Draft): Match {
  const players: Player[] = d.slots.map((s, i) => {
    const phone = normalizePhone(s.phone);
    return { id: `p${i}`, name: s.name.trim(), phone: isValidPhone(phone) ? phone : "" };
  });
  return createMatch({
    id: newId(),
    now: Date.now(),
    players,
    teams: [
      { name: d.teamNames[0].trim(), playerIds: ["p0", "p1"] },
      { name: d.teamNames[1].trim(), playerIds: ["p2", "p3"] },
    ],
    settings: d.settings,
  });
}

export default function PasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [draft, setDraft] = useState<Draft>(() => newDraft([]));

  useEffect(() => {
    const saved = loadMatch();
    const c = loadCrew();
    setCrew(c);
    setDraft(newDraft(c));
    setStage(saved && saved.phase !== "over" ? { name: "play", match: saved } : { name: "setup" });
  }, []);

  const start = (m: Match) => {
    saveMatch(m);
    logEvent("match_started", { pack: m.settings.packId, target: m.settings.targetScore, seconds: m.settings.turnSeconds });
    setStage({ name: "play", match: m });
  };

  switch (stage.name) {
    case "loading":
      return <main className="screen" />;
    case "setup":
      return <Setup draft={draft} crew={crew} onChange={setDraft} onNext={() => setStage({ name: "optin" })} />;
    case "optin":
      return (
        <Optin
          draft={draft}
          onBack={() => setStage({ name: "setup" })}
          onStart={() => {
            rememberCrew(draft.slots.map((s) => ({ name: s.name.trim(), phone: s.phone.trim() })));
            start(matchFromDraft(draft));
          }}
        />
      );
    case "play":
      return (
        <Play
          key={stage.match.id}
          initial={stage.match}
          onPlayAgain={(prev) => {
            // Same crew; the other team goes first this time.
            const again = createMatch({
              id: newId(),
              now: Date.now(),
              players: prev.players,
              teams: prev.teams,
              settings: prev.settings,
              startingTeam: prev.startingTeam === 0 ? 1 : 0,
            });
            start(again);
          }}
          onExit={() => {
            saveMatch(null);
            router.push("/");
          }}
        />
      );
  }
}
