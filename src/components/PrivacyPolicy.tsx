import React, { useState, useEffect } from "react";

const sections = [
  { id: "account",   num: "01", title: "Account Requirement" },
  { id: "chat",      num: "02", title: "Chat Data & History" },
  { id: "use",       num: "03", title: "How We Use Your Information" },
  { id: "security",  num: "04", title: "Security" },
  { id: "ai",        num: "05", title: "AI Usage & Disclaimer" },
  { id: "sharing",   num: "06", title: "Data Sharing" },
  { id: "rights",    num: "07", title: "User Rights" },
  { id: "children",  num: "08", title: "Children" },
  { id: "changes",   num: "09", title: "Changes to This Policy" },
  { id: "contact",   num: "10", title: "Contact" },
];

const PrivacyPolicy: React.FC = () => {
  const [active, setActive] = useState("account");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/onir-logo.png" alt="Onir" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-foreground">Legal AI Assistant</span>
            <span className="text-border">·</span>
            <span className="text-sm text-muted-foreground">Privacy Policy</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14 lg:flex lg:gap-14">

        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-4">Contents</p>
            <nav className="space-y-1">
              {sections.map(({ id, num, title }) => (
                <button
                  key={id}
                  onClick={() => {
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActive(id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
                    active === id
                      ? "text-primary font-medium bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="text-[10px] font-mono opacity-50 w-5 shrink-0">{num}</span>
                  {title}
                </button>
              ))}
            </nav>

            {/* <div className="mt-8 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-[11px]">Effective Date</p>
              <p>[Insert Date]</p>
            </div> */}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Page heading */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                Legal Document
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Welcome to the <strong className="text-foreground font-medium">Legal AI Assistant by Onir</strong>. This policy explains how we collect, use, and protect your information when you use our AI legal chatbot service. By creating an account, you agree to this policy.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-10">

            <Section id="account" num="01" title="Account Requirement">
              <p className="mb-3">To use the Legal AI Assistant, you must create an account. Without signing up, the chatbot is not accessible. We only collect:</p>
              <ul className="space-y-2">
                <Li>Email address</Li>
                <Li>Password (stored securely and never shared)</Li>
              </ul>
            </Section>

            <Section id="chat" num="02" title="Chat Data & History">
              <p className="mb-3">All interactions with the chatbot — messages, prompts, and AI responses — are stored in your account chat history. This helps:</p>
              <ul className="space-y-2">
                <Li>Provide continuity in conversations</Li>
                <Li>Improve AI responses and service quality</Li>
              </ul>
            </Section>

            <Section id="use" num="03" title="How We Use Your Information">
              <p className="mb-3">We use the data to:</p>
              <ul className="space-y-2">
                <Li>Register your account and provide access to the chatbot</Li>
                <Li>Store chat history for a better user experience</Li>
                <Li>Improve AI performance and maintain service security</Li>
                <Li>Communicate important service updates</Li>
              </ul>
            </Section>

            <Section id="security" num="04" title="Security">
              <p>
                Passwords are encrypted using industry-standard security practices. Chat history and account data are protected, but no system is completely secure. You are responsible for keeping your account credentials confidential.
              </p>
            </Section>

            <Section id="ai" num="05" title="AI Usage & Disclaimer">
              <p>
                The chatbot uses <strong className="text-foreground">LLaMA via Groq</strong> to provide legal information. It only provides general guidance and is{" "}
                <strong className="text-foreground">not a substitute for professional legal advice</strong>. Always consult a licensed attorney for personal legal matters.
              </p>
            </Section>

            <Section id="sharing" num="06" title="Data Sharing">
              <p>
                We do not sell or share your email or password. Chat history is only used internally to improve the Service.
              </p>
            </Section>

            <Section id="rights" num="07" title="User Rights">
              <p className="mb-3">You may:</p>
              <ul className="space-y-2">
                <Li>Request deletion of your account and chat history</Li>
                <Li>Contact us to manage your data at [Insert Contact Email]</Li>
              </ul>
            </Section>

            <Section id="children" num="08" title="Children">
              <p>The Service is not for users under 13 years old.</p>
            </Section>

            <Section id="changes" num="09" title="Changes to This Policy">
              <p>
                We may update this Privacy Policy periodically. Continued use of the Service constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section id="contact" num="10" title="Contact">
              <p className="mb-3">For questions, concerns, or data requests:</p>
              <ul className="space-y-2">
                <Li>Email: [Insert Contact Email]</Li>
              </ul>
            </Section>

          </div>

          {/* Footer */}
          <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/onir-logo.png" alt="Onir" className="h-6 w-6 object-contain opacity-60" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Onir World. All rights reserved.</span>
            </div>
            {/* <button
              onClick={() => window.history.back()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
            >
              ← Back
            </button> */}
          </div>
        </main>
      </div>
    </div>
  );
};

/* Reusable section wrapper */
const Section: React.FC<{ id: string; num: string; title: string; children: React.ReactNode }> = ({ id, num, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <div className="flex items-start gap-4 mb-4">
      <span className="text-[11px] font-mono text-primary/60 mt-1.5 shrink-0 w-6">{num}</span>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
    <div className="pl-10 text-muted-foreground text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

/* Reusable list item */
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2.5">
    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
    <span>{children}</span>
  </li>
);

export default PrivacyPolicy;


