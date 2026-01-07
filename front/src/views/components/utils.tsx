export function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`h-4 w-full rounded-md bg-gray-300 animate-pulse ${className}`}
    />
  );
}