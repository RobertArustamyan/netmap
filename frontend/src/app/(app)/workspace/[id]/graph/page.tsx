import GraphClient from "./GraphClient";

export default async function GraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="h-[calc(100vh-57px)]">
      <GraphClient workspaceId={id} />
    </div>
  );
}
