import { create } from "zustand";
import type { BottomNavTab } from "@/lib/types";

interface UIState {
  activeTab: BottomNavTab;
  sheetOpen: boolean;
  selectedConversationId: string | null;
  selectedReservationId: string | null;

  setActiveTab: (tab: BottomNavTab) => void;
  setSheetOpen: (open: boolean) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSelectedReservationId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "dashboard",
  sheetOpen: false,
  selectedConversationId: null,
  selectedReservationId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSheetOpen: (open) => set({ sheetOpen: open }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSelectedReservationId: (id) => set({ selectedReservationId: id }),
}));
