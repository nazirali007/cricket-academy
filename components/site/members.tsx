import { UserRound } from "lucide-react";
import Image from "next/image";
import { members } from "@/lib/content";
import { Reveal } from "./reveal";
import { Eyebrow, Heading } from "./ui";

export function Members() {
  return (
    <section id="members" className="bg-mist py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Eyebrow>Members</Eyebrow>
          <Heading>The people behind the players.</Heading>
        </Reveal>

        <ul className="mt-14 grid grid-cols-2 gap-4 md:mt-20 lg:grid-cols-4 lg:gap-6">
          {members.map((member, i) => (
            <li key={member.role}>
              <Reveal delay={i * 0.08}>
                <article className="group">
                  <div className="relative aspect-[3/4] overflow-hidden bg-navy">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_30%,#1c4564,#071a2c_70%)] transition-transform duration-700 group-hover:scale-105">
                        <UserRound
                          aria-hidden
                          strokeWidth={1}
                          className="size-1/2 text-mist/40"
                        />
                      </div>
                    )}
                    <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-ball transition-transform duration-500 group-hover:scale-x-100" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl leading-tight font-bold uppercase md:text-3xl">
                    {member.role}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.name}
                  </p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
