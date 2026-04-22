"use client";

import { useState } from "react";
import { Check, Mail, Sparkles } from "lucide-react";
import { QuestButton, QuestInput } from "@/components/quest/primitives";
import { cn } from "@/lib/utils";

export function QuestNewsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 3500);
  };

  return (
    <section className="container mx-auto px-4 py-12 lg:py-20">
      <div
        className="relative overflow-hidden rounded-3xl p-8 text-primary-foreground md:p-12 lg:p-16"
        style={{
          background: "linear-gradient(135deg, hsl(var(--sh-primary)) 0%, hsl(var(--sh-primary-glow)) 100%)",
        }}
      >
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "hsl(0 0% 100%)" }}
        />
        <div
          className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "hsl(0 0% 100%)" }}
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Özel Fırsatlar
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight md:text-4xl lg:text-5xl">
              Kampanyalardan ilk
              <br /> sen haberdar ol
            </h2>
            <p className="mt-4 max-w-lg text-base text-primary-foreground/85 md:text-lg">
              Bültenimize abone ol; sezona özel indirim kodlarını, yeni rota kampanyalarını ve sürpriz hediyeleri kaçırma.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-2 backdrop-blur sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 px-4">
              <Mail className="h-5 w-5 shrink-0 text-primary-foreground/70" />
              <QuestInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresin"
                className="h-12 border-0 bg-transparent px-0 text-base text-primary-foreground shadow-none placeholder:text-primary-foreground/60 focus-visible:ring-0"
              />
            </div>
            <QuestButton
              type="submit"
              size="lg"
              className={cn(
                "h-12 rounded-xl bg-background font-bold text-foreground hover:bg-background/90",
                subscribed && "bg-card text-primary hover:bg-card",
              )}
            >
              {subscribed ? (
                <>
                  <Check className="mr-1.5 h-5 w-5" />
                  Abone olundu
                </>
              ) : (
                "Abone Ol"
              )}
            </QuestButton>
          </form>
        </div>
      </div>
    </section>
  );
}
