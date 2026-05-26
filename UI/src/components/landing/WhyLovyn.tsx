import { Brain, LockKeyhole, MessageCircle, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WhyLovynFeature = {
  description: string;
  icon?: ReactNode;
  title: string;
};

export type WhyLovynStory = {
  imageAlt?: string;
  imageSrc?: string;
  paragraphs?: string[];
  signature?: string;
  title?: string;
};

export type WhyLovynProps = {
  className?: string;
  features?: WhyLovynFeature[];
  id?: string;
  story?: WhyLovynStory;
  storyId?: string;
  title?: string;
};

export const defaultWhyLovynFeatures: WhyLovynFeature[] = [
  {
    icon: <LockKeyhole aria-hidden="true" strokeWidth={1.8} />,
    title: "Privacy First",
    description: "Your profile is private by default. You choose who sees you and what you share.",
  },
  {
    icon: <Brain aria-hidden="true" strokeWidth={1.8} />,
    title: "Compatibility Matching",
    description: "We match you on values, lifestyle, and relationship goals, not just photos.",
  },
  {
    icon: <MessageCircle aria-hidden="true" strokeWidth={1.8} />,
    title: "Intentional Conversations",
    description: "Thoughtfully designed to encourage real conversations that go beyond surface level.",
  },
  {
    icon: <UsersRound aria-hidden="true" strokeWidth={1.8} />,
    title: "Inclusive by Design",
    description: "We celebrate all identities and relationship models with respect and nuance.",
  },
];

const defaultStory: Required<WhyLovynStory> = {
  title: "Why We Built Lovyn",
  paragraphs: [
    "Modern dating apps are optimized for engagement, not connection. More swipes. More scrolling. More noise.",
    "We believe meaningful relationships deserve a more intentional experience.",
    "Lovyn is being built for people who value depth over volume and connection over endless matching.",
  ],
  signature: "The Lovyn Founder",
  imageSrc: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
  imageAlt: "Minimal lounge with a neutral chair, side table, and vase.",
};

export function WhyLovyn({
  className,
  features = defaultWhyLovynFeatures,
  id = "features",
  story,
  storyId = "philosophy",
  title = "Why Lovyn?",
}: WhyLovynProps) {
  const storyContent = {
    ...defaultStory,
    ...story,
    paragraphs: story?.paragraphs ?? defaultStory.paragraphs,
  };

  return (
    <section className={cn("why-lovyn", className)} id={id}>
      <div className="why-lovyn__inner">
        <h2 className="why-lovyn__title">{title}</h2>
        <div className="why-lovyn__grid">
          {features.map(feature => (
            <article className="why-lovyn-card" key={feature.title}>
              {feature.icon ? <div className="why-lovyn-card__icon">{feature.icon}</div> : null}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="lovyn-story" id={storyId}>
        <div className="lovyn-story__inner">
          <div className="lovyn-story__copy">
            <h2>{storyContent.title}</h2>
            {storyContent.paragraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {storyContent.signature ? <p className="lovyn-story__signature"> — {storyContent.signature}</p> : null}
          </div>
          <div className="lovyn-story__media">
            <img alt={storyContent.imageAlt} loading="lazy" src={storyContent.imageSrc} />
          </div>
        </div>
      </div>
    </section>
  );
}
