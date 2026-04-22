"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToFirstScrollableAncestor,
  restrictToHorizontalAxis,
} from "@dnd-kit/modifiers";
import {
  ChatBubbleBottomCenterIcon,
  MapIcon,
  MusicalNoteIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type PanelId = "map" | "music" | "chat";

const PANEL_META: Record<
  PanelId,
  { label: string; title: string; Icon: typeof MapIcon }
> = {
  map: { label: "Map", title: "Map", Icon: MapIcon },
  music: { label: "Music", title: "Music", Icon: MusicalNoteIcon },
  chat: {
    label: "Chat",
    title: "Chat",
    Icon: ChatBubbleBottomCenterIcon,
  },
};

const DEFAULT_ORDER: PanelId[] = ["map", "music", "chat"];

function mergeOrderAfterVisibleReorder(
  fullOrder: PanelId[],
  open: Record<PanelId, boolean>,
  newVisibleOrder: PanelId[]
): PanelId[] {
  const queue = [...newVisibleOrder];
  return fullOrder.map((id) => (open[id] ? (queue.shift() as PanelId) : id));
}

type SortablePanelProps = {
  id: PanelId;
  onClose: (id: PanelId) => void;
};

function SortablePanel({ id, onClose }: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const { title } = PANEL_META[id];

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex h-full min-w-[min(100%,18rem)] flex-1 basis-0 flex-col border-r border-zinc-200 bg-white last:border-r-0 ${
        isDragging ? "shadow-lg ring-1 ring-zinc-200" : ""
      }`}
    >
      <header
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab items-center border-b border-zinc-200 bg-zinc-100 px-2 py-2 select-none active:cursor-grabbing"
      >
        <span className="w-8 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <span className="truncate text-sm font-medium text-zinc-900">
            {title}
          </span>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose(id);
          }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900"
          aria-label={`Close ${title}`}
        >
          <XMarkIcon className="size-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 bg-white" />
    </div>
  );
}

export function MultiPanelDashboard() {
  const [order, setOrder] = useState<PanelId[]>(DEFAULT_ORDER);
  const [open, setOpen] = useState<Record<PanelId, boolean>>({
    map: true,
    music: true,
    chat: true,
  });

  const visibleIds = useMemo(
    () => order.filter((id) => open[id]),
    [order, open]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const visible = order.filter((id) => open[id]);
    const oldIndex = visible.indexOf(active.id as PanelId);
    const newIndex = visible.indexOf(over.id as PanelId);
    if (oldIndex < 0 || newIndex < 0) return;

    const newVisible = arrayMove(visible, oldIndex, newIndex);
    setOrder(mergeOrderAfterVisibleReorder(order, open, newVisible));
  }

  function togglePanel(id: PanelId) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function closePanel(id: PanelId) {
    setOpen((prev) => ({ ...prev, [id]: false }));
  }

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-zinc-50 text-zinc-900">
      <aside className="flex w-20 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100">
        <nav className="flex flex-1 flex-col gap-1 py-3">
          {order.map((id) => {
            const { label, Icon } = PANEL_META[id];
            const isOpen = open[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePanel(id)}
                className={`mx-2 flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-medium transition ${
                  isOpen
                    ? "text-zinc-900"
                    : "text-zinc-400/70 opacity-60 hover:opacity-90"
                }`}
              >
                <Icon className="size-7" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[
            restrictToHorizontalAxis,
            restrictToFirstScrollableAncestor,
          ]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full min-w-min">
              {visibleIds.length === 0 ? (
                <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-500">
                  Use the sidebar to open a panel.
                </div>
              ) : (
                visibleIds.map((id) => (
                  <SortablePanel key={id} id={id} onClose={closePanel} />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
