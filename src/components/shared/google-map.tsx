export interface GoogleMapProps {
  title?: string;
  className?: string;
}

export function GoogleMap({
  title = "Lake in the Hills & 30-Mile Service Area",
  className = "",
}: GoogleMapProps) {
  const embedUrl =
    "https://maps.google.com/maps?q=Lake+in+the+Hills,+IL&hl=en&z=11&output=embed";

  return (
    <div
      className={`relative w-full h-full min-h-[480px] rounded-3xl overflow-hidden border border-primary-pale bg-slate-100 shadow-[0_0_35px_var(--primary-ghost)] flex flex-col justify-between ${className}`}
    >
      {/* Interactive Google Map Iframe */}
      <iframe
        title={title}
        src={embedUrl}
        width="100%"
        height="100%"
        className="w-full h-full min-h-[480px] border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Visual Shaded 30-Mile Service-Radius Representation */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
      >
        <div className="w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full border-2 border-dashed border-primary/70 bg-primary/10 shadow-[0_0_30px_var(--primary-ghost)] animate-pulse flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-primary-pale shadow-md text-[11px] font-black text-primary-dark flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>30-Mile Service Coverage Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const GoggleMap = GoogleMap;
export default GoogleMap;
