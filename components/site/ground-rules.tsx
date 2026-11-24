import { groundRules } from "@/lib/ground-rules";

// The 20 ground rules, numbered as on the board at the ground, with the
// original Hindi below.
export function GroundRules() {
  return (
    <>
      <div className="not-prose space-y-3">
        {groundRules.map((rule, i) => (
          <section
            key={rule.title}
            className={`rounded-xl border p-4 md:p-5 ${
              rule.strict ? "border-red-300 bg-red-50" : "border-navy/10 bg-white"
            }`}
          >
            <h3 className="flex items-baseline gap-3 font-bold">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">
                {i + 1}
              </span>
              <span>{rule.title}</span>
            </h3>
            <div className="mt-2 pl-10">
              <p>{rule.en}</p>
              {rule.points && (
                <div className="mt-2 space-y-2">
                  {rule.points.map((point) => (
                    <p key={point.en} className="border-l-2 border-navy/20 pl-3">
                      {point.en}
                    </p>
                  ))}
                </div>
              )}
              {rule.strict && (
                <p className="mt-3 rounded-lg bg-red-700 px-3 py-2 font-semibold text-white">
                  {rule.strict}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <details className="rounded-xl border border-navy/10 bg-white p-4 md:p-5" lang="hi">
        <summary className="cursor-pointer font-bold">
          नियम व शर्तें — हिंदी में पढ़ें (Read the rules in Hindi)
        </summary>
        <div className="mt-4 space-y-3">
          {groundRules.map((rule, i) => (
            <div key={rule.title} className="flex gap-3">
              <span className="w-6 shrink-0 text-right font-bold">{i + 1}.</span>
              <div className="space-y-1">
                <p>{rule.hi}</p>
                {rule.points?.map((point) => (
                  <p key={point.hi} className="border-l-2 border-navy/20 pl-3">
                    {point.hi}
                  </p>
                ))}
                {rule.strictHi && <p className="font-semibold text-red-700">{rule.strictHi}</p>}
              </div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
