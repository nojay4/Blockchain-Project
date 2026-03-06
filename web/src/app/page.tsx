const TEAM_MEMBERS = [
  "Noah Turner",
  // Add more team member names here
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl font-bold text-foreground md:text-4xl">
        CU SportsBetting
      </h1>
      <p className="text-muted-foreground">
        {TEAM_MEMBERS.join(" · ")}
      </p>
    </main>
  );
}
