import PosTerminal from "@/pages/pos-terminal";

export default function GroceryPos() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <PosTerminal variant="grocery" />
    </div>
  );
}
