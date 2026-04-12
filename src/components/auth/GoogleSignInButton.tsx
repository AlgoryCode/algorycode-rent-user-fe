"use client";

import { useEffect, useRef } from "react";

type GoogleIdConfig = {
  client_id: string;
  callback: (res: { credential?: string }) => void;
};

type GoogleIdButtonOptions = {
  theme: "outline" | "filled_blue" | "filled_black";
  size: "large" | "medium" | "small";
  text: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape: "rectangular" | "pill" | "circle" | "square";
  width: number;
};

type GoogleAccountsId = {
  initialize: (cfg: GoogleIdConfig) => void;
  renderButton: (el: HTMLElement, opts: GoogleIdButtonOptions) => void;
  cancel?: () => void;
};

type GoogleWindow = Window & {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
};

type Props = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "990624623867-o83douun4e0vke2nur5qteo9pr4mmlf8.apps.googleusercontent.com";

export function GoogleSignInButton({ onCredential, disabled = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const render = () => {
      const g = (window as GoogleWindow).google;
      if (!g?.accounts?.id || !hostRef.current) return;

      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res: { credential?: string }) => {
          if (res?.credential) onCredential(res.credential);
        },
      });

      hostRef.current.innerHTML = "";
      g.accounts.id.renderButton(hostRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: Math.min(360, window.innerWidth - 56),
      });
    };

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => render();
    document.head.appendChild(script);

    return () => {
      const g = (window as GoogleWindow).google;
      g?.accounts?.id?.cancel?.();
    };
  }, [disabled, onCredential]);

  return <div ref={hostRef} className={disabled ? "pointer-events-none opacity-60" : ""} />;
}
