import { ArrowRight } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type LovynAction = {
  label: string;
  href?: string;
  ariaLabel?: string;
  onClick?: () => void;
  rel?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export type CommunityAvatar = {
  alt: string;
  src?: string;
  fallback?: string;
  background?: string;
};

export type SocialProofContent = {
  ariaLabel?: string;
  avatars?: CommunityAvatar[];
  countText?: string;
  description?: string;
};

export type WaitlistActionsProps = {
  className?: string;
  primaryAction?: LovynAction;
  secondaryAction?: LovynAction & {
    icon?: ReactNode;
  };
  showSocialProof?: boolean;
  socialProof?: SocialProofContent;
};

const defaultPrimaryAction: LovynAction = {
  label: "Join the Waitlist",
  href: "#waitlist",
};

const defaultSecondaryAction: LovynAction = {
  label: "Learn More",
  href: "#features",
};

const defaultAvatars: CommunityAvatar[] = [
  {
    alt: "Community member",
    src: "https://i.pravatar.cc/96?img=12",
    fallback: "A",
  },
  {
    alt: "Community member",
    src: "https://i.pravatar.cc/96?img=32",
    fallback: "S",
  },
  {
    alt: "Community member",
    src: "https://i.pravatar.cc/96?img=47",
    fallback: "M",
  },
  {
    alt: "Community member",
    src: "https://i.pravatar.cc/96?img=68",
    fallback: "R",
  },
];

const defaultSocialProof: Required<Pick<SocialProofContent, "avatars" | "countText" | "description">> & {
  ariaLabel: string;
} = {
  ariaLabel: "Lovyn waitlist community proof",
  avatars: defaultAvatars,
  countText: "300+ people have already joined",
  description: "Be part of the early community.",
};

export function WaitlistActions({
  className,
  primaryAction = defaultPrimaryAction,
  secondaryAction = defaultSecondaryAction,
  showSocialProof = true,
  socialProof,
}: WaitlistActionsProps) {
  const proof = {
    ...defaultSocialProof,
    ...socialProof,
    avatars: socialProof?.avatars ?? defaultSocialProof.avatars,
  };

  return (
    <div className={cn("lovyn-actions", className)}>
      <div className="lovyn-actions__row">
        <ActionElement action={primaryAction} className="lovyn-actions__primary" />
        <ActionElement action={secondaryAction} className="lovyn-actions__secondary">
          <span>{secondaryAction.label}</span>
          {secondaryAction.icon ?? <ArrowRight aria-hidden="true" strokeWidth={2} />}
        </ActionElement>
      </div>

      {showSocialProof ? (
        <div className="lovyn-social-proof" aria-label={proof.ariaLabel}>
          <div className="lovyn-social-proof__avatars" aria-hidden="true">
            {proof.avatars.map((avatar, index) => (
              <span
                className="lovyn-social-proof__avatar"
                key={`${avatar.alt}-${avatar.src ?? avatar.fallback ?? index}`}
                style={avatar.background ? { background: avatar.background } : undefined}
              >
                {avatar.src ? <img alt="" src={avatar.src} /> : <span>{avatar.fallback ?? "L"}</span>}
              </span>
            ))}
          </div>
          <div className="lovyn-social-proof__copy">
            <p className="lovyn-social-proof__count">{proof.countText}</p>
            <p className="lovyn-social-proof__description">{proof.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionElement({
  action,
  children,
  className,
}: {
  action: LovynAction;
  children?: ReactNode;
  className: string;
}) {
  const content = children ?? action.label;

  if (action.href) {
    return (
      <a
        aria-label={action.ariaLabel}
        className={className}
        href={action.href}
        onClick={action.onClick}
        rel={action.rel}
        target={action.target}
      >
        {content}
      </a>
    );
  }

  return (
    <button aria-label={action.ariaLabel} className={className} onClick={action.onClick} type={action.type ?? "button"}>
      {content}
    </button>
  );
}
