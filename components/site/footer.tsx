import Link from "next/link";
import { navLinks, programs } from "@/lib/content";
import { contact, stadiumPagePath } from "@/lib/site";
import { Logo } from "./ui";

const headingClass =
  "text-xs font-bold tracking-[0.2em] text-white/60 uppercase";

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-5 pt-20 pb-8 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/#home" className="flex items-center gap-3">
              <Logo width={80} />
              <span className="font-display text-2xl leading-none font-bold tracking-wide">
                CCS CRICKET ACADEMY
              </span>
            </Link>
            <p className="mt-5 max-w-xs leading-relaxed text-white/70">
              Professional cricket training in Lucknow. Established in 2026.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className={headingClass}>Explore</h2>
            <ul className="mt-5 space-y-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={`/#${link.id}`}
                    className="text-white/85 transition-colors hover:text-ball-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={headingClass}>Programs</h2>
            <ul className="mt-5 space-y-3">
              {programs.map((program) => (
                <li key={program.title} className="text-white/85">
                  {program.title}
                </li>
              ))}
              <li>
                <Link
                  href={stadiumPagePath}
                  className="text-white/85 transition-colors hover:text-ball-light"
                >
                  Cricket Stadium Booking
                </Link>
              </li>
              <li>
                <Link
                  href="/#join"
                  className="font-semibold text-ball-light transition-colors hover:text-white"
                >
                  Join Now
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>Visit</h2>
            <address className="mt-5 space-y-3 leading-relaxed text-white/85 not-italic">
              <p className="whitespace-pre-line">
                {contact.address || contact.city}
              </p>
              {contact.phone && (
                <p>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                    {contact.phone}
                  </a>
                </p>
              )}
              {contact.email && (
                <p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all transition-colors hover:text-ball-light"
                  >
                    {contact.email}
                  </a>
                </p>
              )}
            </address>
          </div>
        </div>

        <div
          aria-hidden
          className="mt-16 overflow-hidden font-display text-[11vw] leading-[0.9] font-bold tracking-tight whitespace-nowrap text-white/[0.06] xl:text-[9.75rem]"
        >
          CCS CRICKET ACADEMY
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/12 pt-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© CCS Cricket Academy, Lucknow. All rights reserved.</p>
          <nav aria-label="Policies">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                ["/terms", "Terms"],
                ["/privacy", "Privacy Policy"],
                ["/refund-policy", "Refund & Cancellation"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
