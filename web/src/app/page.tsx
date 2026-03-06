import { ThemeToggle } from "@/components/ThemeToggle";

const TEAM_MEMBERS = [
  "Noah Turner",
  // Add more team member names here
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        maxWidth: "56rem",
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
        }}
      >
        <ThemeToggle />
      </div>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.5rem",
        }}
      >
        CU SportsBetting
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "1rem",
          color: "var(--muted-foreground)",
          margin: 0,
        }}
      >
        {TEAM_MEMBERS.join(" · ")}
      </p>
    </main>
  );
}
