export function LoadingState({ message = "Loading…", emoji = "🍳" }: { message?: string; emoji?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="text-3xl animate-float-slow">{emoji}</div>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce-dot" style={{ animationDelay: "150ms" }} />
        <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-bounce-dot" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-sm text-neutral-400 font-medium">{message}</p>
    </div>
  );
}
