import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { contact } from "@/lib/site";
import { Reveal } from "./reveal";
import { CtaLink, Eyebrow, Heading } from "./ui";

const missing = "To be added";

export function Contact() {
  const details = [
    {
      icon: MapPin,
      label: "Address",
      value: contact.address || contact.city,
    },
    {
      icon: Phone,
      label: "Phone",
      value: contact.phone || missing,
      href: contact.phone && `tel:${contact.phone.replace(/\s/g, "")}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: contact.email || missing,
      href: contact.email && `mailto:${contact.email}`,
    },
    { icon: Clock, label: "Hours", value: contact.hours || missing },
  ];

  return (
    <section id="contact" className="bg-mist py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <Eyebrow>Contact us</Eyebrow>
          <Heading>Come and see us on the field.</Heading>
          <div className="mt-9 inline-flex">
            <CtaLink href="#join">Join Now</CtaLink>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="divide-y divide-navy/15 border-y border-navy/15">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-center gap-5 py-6">
                <Icon
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-6 shrink-0 text-ball"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold wrap-anywhere whitespace-pre-line">
                    {href ? (
                      <a href={href} className="hover:text-ball">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
