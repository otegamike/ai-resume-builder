import RouteError from "@/components/errors/RouteError";

export default function NotFound() {
  return (
    <RouteError
      kind="not-found"
      capture={false}
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved."
    />
  );
}
